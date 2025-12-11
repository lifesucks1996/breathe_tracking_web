// src/js/admin_sensors.js

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

// Inicializar
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// Variables Globales
let map;
let markers = [];
const sensorsContainer = document.getElementById('sensors-container');
const activityFilter = document.getElementById('activityFilter');

// Variables para Incidencias
let incidentsData = []; 
const modalIncidents = document.getElementById('modal-incidents');
const badge = document.getElementById('incident-badge');
const listPending = document.getElementById('list-pending');
const listResolved = document.getElementById('list-resolved');
const countPendingSpan = document.getElementById('count-pending');

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    renderSensorsList(adminSensorsData);
    activityFilter.addEventListener('change', filterSensors);
    initIncidentsSystem();
});

// ==========================================
// LÓGICA DE INCIDENCIAS (FIREBASE)
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
    // CORRECCIÓN: Filtrar usando el campo 'estado' == 'PENDIENTE'
    const pending = incidentsData.filter(i => i.estado === 'PENDIENTE');
    const resolved = incidentsData.filter(i => i.estado === 'RESUELTA');
    
    // 1. Actualizar Badge
    if (pending.length > 0) {
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // 2. Actualizar contador
    countPendingSpan.textContent = `(${pending.length})`;

    // 3. Renderizar listas
    renderIncidents(listPending, pending, true);
    renderIncidents(listResolved, resolved, false);
}

function renderIncidents(container, items, isPending) {
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-msg">No hay incidencias en esta lista.</p>';
        return;
    }

    items.forEach(incident => {
        const priority = incident.prioridad || 'HIGH';

        // Lógica de Hora (--:--)
        let dateStr = 'Fecha desconocida';
        let timeStr = '--:--'; 

        if (incident.fecha && incident.fecha.seconds) {
            const dateObj = new Date(incident.fecha.seconds * 1000);
            dateStr = dateObj.toLocaleString();
            timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        let mensajeFinal = incident.mensaje ? incident.mensaje.replace('--:--', timeStr) : "Sin detalles.";

        const card = document.createElement('div');
        card.className = `incident-card priority-${priority} ${!isPending ? 'resolved' : ''}`;
        
        card.innerHTML = `
            <div class="incident-summary" onclick="toggleIncident(this)">
                <div class="incident-info">
                    <h4>${incident.titulo || 'Incidencia'}</h4>
                    <span><i class="fas fa-clock"></i> ${dateStr} &nbsp;|&nbsp; <strong>${incident.sensor_id || 'N/A'}</strong></span>
                </div>
                <i class="fas fa-chevron-down expand-icon"></i>
            </div>
            <div class="incident-details">
                <div class="detail-row">
                    <strong>Ubicación:</strong> ${incident.ubicacion || 'Desconocida'}<br>
                    <strong>Mensaje:</strong><br>
                    <span style="display:block; margin-top:5px;">${mensajeFinal}</span>
                </div>
                ${isPending 
                    ? `<button class="btn-resolve" onclick="resolveIncident('${incident.id}')">Marcar como Resuelta</button>` 
                    : `<p style="color:green; margin-top:10px; font-weight:bold;">
                         <i class="fas fa-check"></i> Resuelta 
                         <span style="font-size:0.8em; color:#666;">(${incident.fecha_resolucion ? new Date(incident.fecha_resolucion.seconds * 1000).toLocaleDateString() : ''})</span>
                       </p>`
                }
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================
// FUNCIONES GLOBALES
// ==========================================

window.toggleIncident = function(element) {
    element.parentElement.classList.toggle('expanded');
};

// CORRECCIÓN PRINCIPAL AQUÍ
window.resolveIncident = async function(docId) {
    if(!confirm('¿Confirmar que la incidencia ha sido solucionada?')) return;
    
    try {
        const incidentRef = doc(db, "incidencias", docId);
        
        // Aquí actualizamos el campo 'estado' a 'RESUELTA'
        await updateDoc(incidentRef, {
            estado: 'RESUELTA',
            fecha_resolucion: new Date()
        });
        
    } catch (error) {
        console.error("Error al resolver:", error);
        alert("Error al actualizar la base de datos.");
    }
};

function openModal() { modalIncidents.classList.remove('hidden'); }
function closeModal() { modalIncidents.classList.add('hidden'); }

// ==========================================
// MAPA Y LISTA (CÓDIGO ORIGINAL)
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
        let popupStatus = 'Estado: OK';
        let popupColor = 'black';

        if (sensor.active === false) {
            cssClass = 'sensor-marker sensor-marker-inactive';
            popupStatus = 'Inactivo / Desconectado';
            popupColor = '#999';
        } else if (sensor.hasIncident) {
            cssClass = 'sensor-marker sensor-marker-incident';
            popupStatus = '⚠ Incidencia detectada';
            popupColor = 'red';
        }
        
        const styleInactive = (sensor.active === false) ? 'background-color: #999; border-color: #ccc;' : '';

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="leaflet-marker-icon ${cssClass}" style="${styleInactive}"><i class="fas fa-microchip"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker(sensor.coords, { icon: customIcon }).addTo(map);
        marker.bindPopup(`<div style="text-align:center;"><b>${sensor.name}</b><br><span style="color:${popupColor}; font-weight:bold;">${popupStatus}</span></div>`);
        markers.push(marker);
    });
}

function renderSensorsList(sensors) {
    sensorsContainer.innerHTML = ''; 
    if (!sensors || sensors.length === 0) {
        sensorsContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">No se encontraron sensores con este filtro.</p>';
        return;
    }
    sensors.forEach(sensor => {
        const item = document.createElement('div');
        let itemClass = 'sensor-item';
        if (sensor.hasIncident) itemClass += ' incident';
        if (sensor.active === false) itemClass += ' inactive';
        item.className = itemClass;
        
        let iconClass = 'fa-broadcast-tower';
        if (sensor.hasIncident) iconClass = 'fa-exclamation-triangle';
        if (sensor.active === false) iconClass = 'fa-ban';

        let statusText = '';
        if (sensor.hasIncident) statusText = '<p style="color:#ff4d4f; font-weight:bold; font-size:0.8em;">⚠ Fallo de conexión</p>';
        else if (sensor.active === false) statusText = '<p style="color:#999; font-weight:bold; font-size:0.8em;">● Desconectado</p>';

        const inactiveTag = (sensor.active === false) ? '<span style="font-size:0.7em; background:#ddd; color:#666; padding:2px 5px; border-radius:4px; margin-left:5px;">Inactivo</span>' : '';

        item.innerHTML = `
            <div class="sensor-icon"><i class="fas ${iconClass}"></i></div>
            <div class="sensor-info">
                <h4>${sensor.name} ${inactiveTag}</h4>
                <p>${sensor.location}</p>
                <p class="last-conn">Última conex: ${sensor.lastConnection}</p>
                ${statusText}
            </div>
            <div class="actions">
                <button class="button-report" onclick="goToDetail('${sensor.id}')" ${sensor.active === false ? 'style="background-color:#999;"' : ''}>${sensor.active === false ? 'Histórico' : 'Ver Informe'}</button>
            </div>
        `;
        sensorsContainer.appendChild(item);
    });
}

function filterSensors() {
    const filterValue = activityFilter.value;
    let filteredData = [];
    if (filterValue === 'all') filteredData = adminSensorsData;
    else if (filterValue === 'incident') filteredData = adminSensorsData.filter(s => s.hasIncident === true);
    else if (filterValue === 'inactive') filteredData = adminSensorsData.filter(s => s.active === false);
    renderSensorsList(filteredData);
    addSensorMarkers(filteredData);
}

window.goToDetail = function(sensorId) { window.location.href = 'admin_sensor_detail.html'; };