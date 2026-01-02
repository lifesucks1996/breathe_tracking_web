/**
 * @file admin_sensors.js
 * @brief Panel de Administración: Heatmap Congelado (Sincronizado con Usuario) + Gestión de Incidencias.
 */

// ======================================================================
// 🛠️ FIX CANVAS: Permitir lectura frecuente para "Congelar" el mapa
// ======================================================================
HTMLCanvasElement.prototype.getContext = (function(origFn) {
  return function(type, attributes) {
    if (type === '2d') {
      attributes = Object.assign({}, attributes, { willReadFrequently: true });
    }
    return origFn.call(this, type, attributes);
  };
})(HTMLCanvasElement.prototype.getContext);

// 1. IMPORTS DE FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración Firebase
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCbAVEYYdtSLmrH_opCM72G_G01QXPRZ48",
    authDomain: "biometria-g3.firebaseapp.com",
    databaseURL: "https://biometria-g3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "biometria-g3",
    storageBucket: "biometria-g3.firebasestorage.app",
    messagingSenderId: "817957103566",
    appId: "1:817957103566:web:75c78a0a28f3380d092d9f"
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// ========================= VARIABLES GLOBALES =========================
let map;
let markers = []; // Array de marcadores de sensores (chips)

// Variables Heatmap Congelado (Igual que en User)
let capaCalor = null;
let heatmapCongelado = null;
const ZOOM_CONGELADO = 14; 

let configGasActual = { unidad: 'ppm', gradiente: null, nombre: '' };

// DOM Elements
const sensorsContainer = document.getElementById('sensors-container');
const activityFilter = document.getElementById('activityFilter');
const btnUpdateMap = document.getElementById('btn-update-map');
const dateSelector = document.getElementById('dateSelector');
const selectorContaminante = document.getElementById('selectorContaminante');
const loadingIndicator = document.getElementById('loading-indicator');

// Incidencias DOM
const modalIncidents = document.getElementById('modal-incidents');
const badge = document.getElementById('incident-badge');
const listPending = document.getElementById('list-pending');
const listResolved = document.getElementById('list-resolved');
const countPendingSpan = document.getElementById('count-pending');
let incidentsData = [];

// ========================= INICIALIZACIÓN =========================
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    renderSensorsList(adminSensorsData);
    activityFilter.addEventListener('change', filterSensors);
    initIncidentsSystem();

    if (btnUpdateMap) {
        btnUpdateMap.addEventListener('click', cargarMapaCalorAdmin);
    }
    
    // Conectar con users_map_data.js (Legacy connection)
    if (window.inicializarFirebase) {
        window.inicializarFirebase(() => {
            console.log("Conexión de datos lista.");
            cargarMapaCalorAdmin();
        });
    }
});

// ==========================================
// 🎨 LÓGICA DE MAPA DE CALOR (SINCRONIZADA)
// ==========================================

async function cargarMapaCalorAdmin() {
    const fecha = dateSelector.value;
    const gas = selectorContaminante.value;

    if (loadingIndicator) loadingIndicator.style.display = 'inline-block';

    // Limpiar capa congelada previa
    if (heatmapCongelado) {
        map.removeLayer(heatmapCongelado);
        heatmapCongelado = null;
    }

    if (window.obtenerDatosDelSensor) {
        try {
            const respuesta = await window.obtenerDatosDelSensor(fecha, gas);
            const puntos = respuesta.puntos || [];
            
            // Configurar gradiente igual que en el usuario
            if (respuesta.gradiente) {
                configGasActual.gradiente = respuesta.gradiente;
            } else {
                // Si viene de sensores individuales, construimos el de 3 colores
                const umbralesFake = []; // Si users_map_data no devuelve umbrales, usamos default
                configGasActual.gradiente = construirGradiente(umbralesFake);
            }

            pintarMapaCalor(puntos);

        } catch (error) {
            console.error("Error cargando mapa calor admin:", error);
        }
    }
    
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

function construirGradiente(umbrales) {
    // Gradiente Estricto 3 Colores (Verde, Amarillo, Rojo)
    return { 
        0.0: 'rgba(0,0,0,0)', 
        0.2: 'green', 
        0.6: 'yellow', 
        1.0: 'red' 
    };
}

function pintarMapaCalor(puntos) {
    if (!puntos.length || !L.heatLayer) return;

    // Saturación Forzada: Max 0.8 para que el rojo (1.0) sea sólido e intenso.
    const maxVal = 0.8; 

    // Crear capa temporal
    capaCalor = L.heatLayer(puntos, {
        radius: 45,       // Calibrado para Zoom 14
        blur: 35,         
        minOpacity: 0.3,
        max: maxVal,
        gradient: configGasActual.gradiente
    }).addTo(map);

    // 1. Forzar zoom para la foto
    const centroOriginal = map.getCenter();
    map.setView(centroOriginal, ZOOM_CONGELADO, { animate: false });

    // 2. Congelar
    setTimeout(() => {
        congelarHeatmapComoImagen();
    }, 400);
}

function congelarHeatmapComoImagen() {
    if (!capaCalor || !capaCalor._canvas) return;

    const imgData = capaCalor._canvas.toDataURL('image/png');
    const bounds = map.getBounds();

    // Eliminar capa dinámica
    map.removeLayer(capaCalor);
    capaCalor = null;

    // Añadir imagen estática
    heatmapCongelado = L.imageOverlay(imgData, bounds, {
        opacity: 0.85,
        interactive: false
    }).addTo(map);

    // Asegurar que los marcadores de sensores (chips) estén SIEMPRE encima del calor
    bringMarkersToFront();
}

function bringMarkersToFront() {
    markers.forEach(marker => {
        marker.setZIndexOffset(10000); // Forzar al frente
        if(marker._icon) marker._icon.style.zIndex = "10000";
    });
}

// ==========================================
// LÓGICA DE INCIDENCIAS
// ==========================================

function initIncidentsSystem() {
    const q = query(collection(db, "incidencias"), orderBy("fecha", "desc"));

    onSnapshot(q, (snapshot) => {
        incidentsData = [];
        snapshot.forEach((doc) => {
            incidentsData.push({ id: doc.id, ...doc.data() });
        });
        updateNotificationsUI();
    });

    const btnIncidents = document.getElementById('btn-incidents');
    if(btnIncidents) btnIncidents.addEventListener('click', openModal);
    const btnClose = document.getElementById('close-modal');
    if(btnClose) btnClose.addEventListener('click', closeModal);
    
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.incident-list').forEach(l => l.classList.add('hidden'));
            e.target.classList.add('active');
            const targetId = e.target.getAttribute('data-tab');
            if(targetId === 'pending') listPending.classList.remove('hidden');
            else listResolved.classList.remove('hidden');
        });
    });
}

function updateNotificationsUI() {
    const pending = incidentsData.filter(i => i.estado === 'PENDIENTE');
    const resolved = incidentsData.filter(i => i.estado === 'RESUELTA');
    
    if (pending.length > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');

    countPendingSpan.textContent = `(${pending.length})`;
    renderIncidents(listPending, pending, true);
    renderIncidents(listResolved, resolved, false);
}

function renderIncidents(container, items, isPending) {
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<p class="empty-msg">No hay incidencias.</p>';
        return;
    }
    items.forEach(incident => {
        const priority = incident.prioridad || 'HIGH';
        let dateStr = 'Fecha desc.';
        if (incident.fecha && incident.fecha.seconds) {
            dateStr = new Date(incident.fecha.seconds * 1000).toLocaleString();
        }
        const card = document.createElement('div');
        card.className = `incident-card priority-${priority} ${!isPending ? 'resolved' : ''}`;
        card.innerHTML = `
            <div class="incident-summary" onclick="toggleIncident(this)">
                <div class="incident-info">
                    <h4>${incident.titulo || 'Incidencia'}</h4>
                    <span>${dateStr} | <strong>${incident.sensor_id}</strong></span>
                </div>
                <i class="fas fa-chevron-down expand-icon"></i>
            </div>
            <div class="incident-details">
                <p><strong>Ubicación:</strong> ${incident.ubicacion}</p>
                <p>${incident.mensaje}</p>
                ${isPending ? `<button class="btn-resolve" onclick="resolveIncident('${incident.id}')">Resolver</button>` : ''}
            </div>`;
        container.appendChild(card);
    });
}

// Globales para HTML onClick
window.toggleIncident = (element) => element.parentElement.classList.toggle('expanded');
window.resolveIncident = async (docId) => {
    if(!confirm('¿Marcar como resuelta?')) return;
    try {
        await updateDoc(doc(db, "incidencias", docId), {
            estado: 'RESUELTA', resuelta: true, fecha_resolucion: new Date()
        });
    } catch (e) { alert("Error: " + e.message); }
};

function openModal() { modalIncidents.classList.remove('hidden'); }
function closeModal() { modalIncidents.classList.add('hidden'); }

// ==========================================
// MAPA Y MARCADORES (CHIPS)
// ==========================================

function initMap() {
    map = L.map('admin-map').setView([38.9660, -0.1850], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    addSensorMarkers(adminSensorsData);
}

function addSensorMarkers(sensors) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    sensors.forEach(sensor => {
        let cssClass = 'sensor-marker';
        if (!sensor.active) cssClass += ' sensor-marker-inactive';
        else if (sensor.hasIncident) cssClass += ' sensor-marker-incident';

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="leaflet-marker-icon ${cssClass}"><i class="fas fa-microchip"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker(sensor.coords, { icon: customIcon }).addTo(map);
        // Asegurar que estén muy por encima del heatmap
        marker.setZIndexOffset(10000); 
        
        const status = sensor.hasIncident ? 'Fallo' : (sensor.active ? 'OK' : 'Inactivo');
        marker.bindPopup(`<b>${sensor.name}</b><br>${status}`);
        markers.push(marker);
    });
}

function renderSensorsList(sensors) {
    sensorsContainer.innerHTML = '';
    if (!sensors.length) {
        sensorsContainer.innerHTML = '<p style="text-align:center;padding:20px;">Sin resultados.</p>';
        return;
    }
    sensors.forEach(sensor => {
        const item = document.createElement('div');
        item.className = `sensor-item ${sensor.hasIncident ? 'incident' : ''} ${!sensor.active ? 'inactive' : ''}`;
        item.innerHTML = `
            <div class="sensor-icon"><i class="fas fa-microchip"></i></div>
            <div class="sensor-info">
                <h4>${sensor.name}</h4>
                <p>${sensor.location}</p>
            </div>
            <div class="actions"><button class="button-report" onclick="goToDetail('${sensor.id}')">Ver</button></div>
        `;
        sensorsContainer.appendChild(item);
    });
}

function filterSensors() {
    const val = activityFilter.value;
    let filtered = adminSensorsData;
    if (val === 'incident') filtered = adminSensorsData.filter(s => s.hasIncident);
    if (val === 'inactive') filtered = adminSensorsData.filter(s => !s.active);
    
    renderSensorsList(filtered);
    addSensorMarkers(filtered);
    if (heatmapCongelado) bringMarkersToFront(); // Re-asegurar orden z-index
}

window.goToDetail = (id) => window.location.href = 'admin_sensor_detail.html';