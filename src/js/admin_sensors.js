/**
 * @file admin_sensors.js
 * @brief Panel de Administración: Gestión de sensores, heatmap congelado, paginación y gestión de incidencias.
 * @details
 * Este módulo implementa las siguientes funcionalidades:
 * - Carga dinámica de sensores desde admin_sensors_data.js
 * - Renderizado con sistema de paginación (20 sensores por página)
 * - Mapa de calor congelado sincronizado con datos de contaminación
 * - Selección de gases (O₃, NO₂, CO, SO₂, CO₂)
 * - Filtros avanzados: Estado (Activo/Inactivo/Incidencia) y Ordenación por tiempo.
 * - Gestión visual de capas (Z-Index) para evitar saturación en el mapa.
 *
 * @requires admin_sensors_data.js - Datos de sensores
 * @requires Leaflet.js - Librería de mapas
 * @requires Firebase (Firestore) - Base de datos en tiempo real
 *
 * @version 2.2 (Soporte Doxygen + Filtros Inactividad)
 * @author Breathe Tracking Team
 */

// ======================================================================
// FIX CANVAS: Permitir lectura frecuente para "Congelar" el mapa
// ======================================================================
/**
 * @brief Patch para mejorar performance de canvas en heatmap.
 * @details
 * Establece willReadFrequently=true para evitar advertencias de performance
 * cuando se accede frecuentemente a píxeles del canvas.
 */
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

/**
 * @brief Configuración de conexión a Firebase Realtime Database.
 */
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
/**
 * @brief Instancia del mapa Leaflet.
 * @type {L.Map|null}
 */
let map;

/**
 * @brief Array de marcadores (L.CircleMarker) para sensores en el mapa.
 * @type {Array<L.Marker>}
 */
let markers = []; 

/**
 * @brief Layer de heatmap congelado del mapa (Heatmap.js).
 * @type {Object|null}
 */
let capaCalor = null;

/**
 * @brief Imagen congelada del heatmap (canvas convertido a imagen).
 * @type {Object|null}
 */
let heatmapCongelado = null;

/**
 * @brief Nivel de zoom para visualización del heatmap congelado.
 * @type {number}
 */
const ZOOM_CONGELADO = 14; 

/**
 * @brief Configuración actual del gas seleccionado.
 */
let configGasActual = { unidad: 'ppm', gradiente: null, nombre: '' };

// DOM Elements
const sensorsContainer = document.getElementById('sensors-container');
const activityFilter = document.getElementById('activityFilter');

// --- NUEVOS ELEMENTOS PARA FILTRO DE ORDENACIÓN ---
/**
 * @brief Selector para ordenar sensores inactivos por fecha.
 * @type {HTMLSelectElement}
 */
const inactiveSortSelect = document.getElementById('inactiveSort');

/**
 * @brief Contenedor visual del selector de ordenación (se oculta/muestra).
 * @type {HTMLElement}
 */
const sortContainer = document.getElementById('sort-inactive-container');
// --------------------------------------------------

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

/**
 * @brief Cache local de incidencias descargadas de Firestore.
 */
let incidentsData = [];


// ========================= INICIALIZACIÓN =========================
/**
 * @brief Listener de inicialización del DOM.
 * @details
 * Configura listeners, inicializa mapa y carga datos iniciales.
 */
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    renderSensorsList(adminSensorsData);
    
    // GESTIÓN DE FILTROS ACTUALIZADA
    // Usamos handleMainFilterChange en lugar del antiguo filterSensors
    activityFilter.addEventListener('change', handleMainFilterChange);
    
    // Si existe el selector de ordenación, escuchamos sus cambios
    if(inactiveSortSelect) {
        inactiveSortSelect.addEventListener('change', handleSortChange);
    }

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
// FUNCIONES DE ESTADO Y UTILIDADES (NUEVO)
// ==========================================

/**
 * @brief Determina el estado normalizado de un sensor.
 * @details
 * Unifica la lógica para determinar si un sensor es 'incident', 'inactive' o 'active'
 * basándose tanto en los datos simulados (propiedad .active) como en Firebase (.estado).
 * * @param {Object} sensor - Objeto sensor con propiedades.
 * @return {string} Estado normalizado: 'incident' | 'inactive' | 'active'.
 */
function getSensorStatus(sensor) {
    // 1. Incidencia (Prioridad máxima)
    if (sensor.hasIncident) return 'incident';
    // Comprobamos strings de estado comunes en Firebase
    if (sensor.estado && ['alerta', 'peligro', 'incidencia', 'fallo'].includes(sensor.estado.toLowerCase())) return 'incident';

    // 2. Inactivo (Aquí capturamos el "Desconectado" de Firebase)
    if (sensor.active === false) return 'inactive';
    if (sensor.estado && ['desconectado', 'inactivo', 'baja', 'off'].includes(sensor.estado.toLowerCase())) return 'inactive';

    // 3. Activo (Por defecto)
    return 'active';
}

/**
 * @brief Parsea fechas en formatos variados para permitir ordenación.
 * @details
 * Soporta formato ISO (YYYY-MM-DDTHH:mm:ss) y formato hora simple (HH:mm).
 * Si es hora simple, asume que es la fecha de hoy.
 * * @param {string} dateStr - Cadena de fecha.
 * @return {number} Timestamp en milisegundos.
 */
function parseDateLoose(dateStr) {
    if (!dateStr) return 0;
    // Si es solo hora "14:30", asumimos que es hoy (timestamp mayor)
    if (dateStr.length <= 5) return new Date().getTime(); 
    
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
}


// ==========================================
// LÓGICA DE FILTROS Y ORDENACIÓN (NUEVO)
// ==========================================

/**
 * @brief Maneja el cambio en el selector principal de "Actividad".
 * @details
 * Muestra u oculta el sub-filtro de fechas (cajita rosa) si se selecciona "Inactivos".
 * Luego aplica los filtros.
 */
function handleMainFilterChange() {
    const filterVal = activityFilter.value;
    
    // Lógica visual: Mostrar/Ocultar el filtro de fechas
    if (filterVal === 'inactive') {
        if(sortContainer) sortContainer.classList.remove('hidden');
    } else {
        if(sortContainer) sortContainer.classList.add('hidden');
    }
    
    applyFiltersAndSort();
}

/**
 * @brief Maneja el cambio en el selector de ordenación por fecha.
 */
function handleSortChange() {
    applyFiltersAndSort();
}

/**
 * @brief Aplica filtros y ordenación a la lista de sensores.
 * @details
 * 1. Filtra el array global `adminSensorsData` usando `getSensorStatus`.
 * 2. Si el filtro es "inactive", ordena el resultado según la fecha seleccionada.
 * 3. Actualiza la lista renderizada y los marcadores del mapa.
 */
function applyFiltersAndSort() {
    const filterVal = activityFilter.value;
    let filtered = [];

    // 1. FILTRADO
    if (filterVal === 'all') {
        filtered = adminSensorsData;
    } else {
        // Usamos la nueva función robusta para filtrar
        filtered = adminSensorsData.filter(s => getSensorStatus(s) === filterVal);
    }

    // 2. ORDENACIÓN (Solo aplica si estamos viendo inactivos y existe el selector)
    if (filterVal === 'inactive' && inactiveSortSelect) {
        const sortOrder = inactiveSortSelect.value; // 'recent' o 'old'
        
        filtered.sort((a, b) => {
            const dateA = parseDateLoose(a.lastConnection);
            const dateB = parseDateLoose(b.lastConnection);
            
            if (sortOrder === 'recent') {
                return dateB - dateA; // Más recientes primero (Mayor timestamp al principio)
            } else {
                return dateA - dateB; // Más antiguos primero (Menor timestamp al principio)
            }
        });
    }

    // 3. ACTUALIZACIÓN DE UI
    renderSensorsList(filtered);
    addSensorMarkers(filtered);
}


// ==========================================
// LÓGICA DE MAPA DE CALOR
// ==========================================
/**
 * @brief Carga y renderiza el mapa de calor.
 * @async
 */
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
            
            if (respuesta.gradiente) {
                configGasActual.gradiente = respuesta.gradiente;
            } else {
                const umbralesFake = []; 
                configGasActual.gradiente = construirGradiente(umbralesFake);
            }

            pintarMapaCalor(puntos);

        } catch (error) {
            console.error("Error cargando mapa calor admin:", error);
        }
    }
    
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

/**
 * @brief Construye gradiente de colores por defecto.
 */
function construirGradiente(umbrales) {
    return { 
        0.0: 'rgba(0,0,0,0)', 
        0.2: 'green', 
        0.6: 'yellow', 
        1.0: 'red' 
    };
}

/**
 * @brief Pinta el mapa de calor dinámico y luego lo congela.
 * @param {Array} puntos - Array de lat/lng/intensidad.
 */
function pintarMapaCalor(puntos) {
    if (!puntos.length || !L.heatLayer) return;

    const maxVal = 0.8; 

    capaCalor = L.heatLayer(puntos, {
        radius: 45, 
        blur: 35, 
        minOpacity: 0.3,
        max: maxVal,
        gradient: configGasActual.gradiente
    }).addTo(map);

    const centroOriginal = map.getCenter();
    map.setView(centroOriginal, ZOOM_CONGELADO, { animate: false });

    // Esperamos un poco a que renderice y luego congelamos
    setTimeout(() => {
        congelarHeatmapComoImagen();
    }, 400);
}

/**
 * @brief Convierte el heatmap canvas a imagen estática.
 * @details Mejora el rendimiento al navegar por el mapa.
 */
function congelarHeatmapComoImagen() {
    if (!capaCalor || !capaCalor._canvas) return;

    const imgData = capaCalor._canvas.toDataURL('image/png');
    const bounds = map.getBounds();

    map.removeLayer(capaCalor);
    capaCalor = null;

    heatmapCongelado = L.imageOverlay(imgData, bounds, {
        opacity: 0.85,
        interactive: false
    }).addTo(map);

    // Asegurar que los marcadores de sensores estén SIEMPRE encima del calor
    bringMarkersToFront();
}

/**
 * @brief Fuerza a los marcadores a estar en el frente (z-index).
 */
function bringMarkersToFront() {
    if(heatmapCongelado) heatmapCongelado.bringToBack();
}


// ==========================================
// LÓGICA DE INCIDENCIAS
// ==========================================

/**
 * @brief Inicializa el sistema de incidencias (listeners y snapshots).
 */
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
// MAPA Y MARCADORES (ACTUALIZADO)
// ==========================================
/**
 * @brief Inicializa el mapa Leaflet.
 */
function initMap() {
    map = L.map('admin-map').setView([38.9660, -0.1850], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    addSensorMarkers(adminSensorsData);
}

/**
 * @brief Añade marcadores al mapa con gestión de Z-Index para evitar desorden.
 * @details
 * Limpia marcadores anteriores y repinta según el estado:
 * - Incidentes: Rojo, Z-Index 1000 (Arriba)
 * - Activos: Azul, Z-Index 500 (Medio)
 * - Inactivos: Gris, Z-Index 100 (Fondo)
 * * @param {Array} sensors - Lista de sensores a pintar.
 */
function addSensorMarkers(sensors) {
    // Limpiar marcadores anteriores
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    sensors.forEach(sensor => {
        const status = getSensorStatus(sensor);
        let cssClass = 'sensor-marker';
        let zIndex = 500; 

        // CONFIGURACIÓN DE PROFUNDIDAD (Evita que los grises tapen a los importantes)
        if (status === 'inactive') {
            cssClass += ' sensor-marker-inactive';
            zIndex = 100; // Al fondo
        } else if (status === 'incident') {
            cssClass += ' sensor-marker-incident';
            zIndex = 1000; // Arriba
        } else {
            zIndex = 500; // Medio
        }

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="leaflet-marker-icon ${cssClass}"><i class="fas fa-microchip"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker(sensor.coords, { 
            icon: customIcon,
            zIndexOffset: zIndex // ESTO ES CLAVE PARA EL ORDEN VISUAL
        }).addTo(map);
        
        let estadoTexto = sensor.estado || (status === 'active' ? 'Conectado' : 'Inactivo');
        
        marker.bindPopup(`
            <b>${sensor.name}</b><br>
            Estado: ${estadoTexto}<br>
            <span style="font-size:0.8em; color:#666">${sensor.lastConnection}</span>
        `);
        
        markers.push(marker);
    });
}


// ==========================================
// PAGINACIÓN Y LISTADO (LÓGICA UNIFICADA)
// ==========================================

let paginationState = {
    currentPage: 1, itemsPerPage: 20, totalSensors: 0, totalPages: 0, filteredSensors: []
};

/**
 * @brief Prepara la lista de sensores para la paginación.
 */
function renderSensorsList(sensors) {
    sensorsContainer.innerHTML = '';
    if (!sensors.length) {
        sensorsContainer.innerHTML = '<p style="text-align:center;padding:20px;">Sin resultados.</p>';
        return;
    }
    
    paginationState.filteredSensors = sensors;
    paginationState.totalSensors = sensors.length;
    paginationState.totalPages = Math.ceil(sensors.length / paginationState.itemsPerPage);
    paginationState.currentPage = 1; 
    
    renderPage(paginationState.currentPage, sensors);
}

/**
 * @brief Renderiza una página específica de sensores.
 * @details
 * Usa `getSensorStatus` para asegurar que el color en la lista
 * coincida exactamente con el color en el mapa.
 */
function renderPage(pageNumber, sensors) {
    const container = sensorsContainer;
    container.innerHTML = '';
    
    if (!sensors.length) {
        container.innerHTML = '<p style="text-align:center;padding:20px;">Sin resultados.</p>';
        return;
    }
    
    const startIdx = (pageNumber - 1) * paginationState.itemsPerPage;
    const endIdx = Math.min(startIdx + paginationState.itemsPerPage, sensors.length);
    const fragment = document.createDocumentFragment();
    
    for (let i = startIdx; i < endIdx; i++) {
        const sensor = sensors[i];
        
        // --- USAMOS LA MISMA LÓGICA QUE EL MAPA ---
        const status = getSensorStatus(sensor);
        
        let classString = 'sensor-item';
        if (status === 'incident') classString += ' incident';
        if (status === 'inactive') classString += ' inactive'; // Esto pone el borde gris

        const item = document.createElement('div');
        item.className = classString;
        
        // Icono según estado
        let iconHtml = '<i class="fas fa-microchip"></i>';
        if (status === 'inactive') iconHtml = '<i class="fas fa-power-off"></i>';
        if (status === 'incident') iconHtml = '<i class="fas fa-exclamation-triangle"></i>';

        // Procesar fecha para mostrarla limpia
        let fechaMostrar = sensor.lastConnection;
        if(fechaMostrar && fechaMostrar.includes('T')) {
            fechaMostrar = fechaMostrar.split('T')[0];
        }

        item.innerHTML = `
            <div class="sensor-icon">${iconHtml}</div>
            <div class="sensor-info">
                <h4>${sensor.name || sensor.nombre || 'Sensor'}</h4>
                <p>${sensor.location || sensor.ubicacion || 'Sin ubicación'}</p>
                <p class="last-conn" style="font-size:0.75em; color:#888; margin-top:2px;">
                    ${status === 'inactive' ? 'Desconectado: ' : 'Conexión: '} ${fechaMostrar}
                </p>
            </div>
            <div class="actions"><button class="button-report" onclick="goToDetail('${sensor.id}')">Ver</button></div>
        `;
        fragment.appendChild(item);
    }
    
    container.appendChild(fragment);
    addPaginationControls(pageNumber, sensors.length);
}

/**
 * @brief Añade controles de paginación (Anterior, Siguiente, etc).
 */
function addPaginationControls(currentPage, totalSensors) {
    const container = sensorsContainer;
    const totalPages = Math.ceil(totalSensors / paginationState.itemsPerPage);
    const startIdx = (currentPage - 1) * paginationState.itemsPerPage + 1;
    const endIdx = Math.min(currentPage * paginationState.itemsPerPage, totalSensors);
    
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = `
        text-align: center;
        padding: 15px;
        border-top: 1px solid #ddd;
        margin-top: 10px;
        font-size: 12px;
        color: #666;
    `;
    
    controlsDiv.innerHTML = `
        <p style="margin: 0 0 10px 0;">Página ${currentPage} de ${totalPages} | Mostrando sensores ${startIdx} a ${endIdx} de ${totalSensors}</p>
        <div style="display: flex; gap: 8px; justify-content: center;">
            <button class="pagination-btn btn-first" ${currentPage === 1 ? 'disabled' : ''} style="flex: 1;">⏮️ Primero</button>
            <button class="pagination-btn btn-prev" ${currentPage === 1 ? 'disabled' : ''} style="flex: 1;">◀️ Anterior</button>
            <input type="number" class="pageInput" min="1" max="${totalPages}" value="${currentPage}" style="width: 50px; padding: 6px; border: 1px solid #ddd; border-radius: 4px; text-align: center;">
            <button class="pagination-btn btn-next" ${currentPage === totalPages ? 'disabled' : ''} style="flex: 1;">Siguiente ▶️</button>
            <button class="pagination-btn btn-last" ${currentPage === totalPages ? 'disabled' : ''} style="flex: 1;">Último ⏭️</button>
        </div>
    `;
    
    container.appendChild(controlsDiv);
    
    const btnFirst = controlsDiv.querySelector('.btn-first');
    const btnPrev = controlsDiv.querySelector('.btn-prev');
    const btnNext = controlsDiv.querySelector('.btn-next');
    const btnLast = controlsDiv.querySelector('.btn-last');
    const pageInput = controlsDiv.querySelector('.pageInput');
    
    if (btnFirst && !btnFirst.disabled) btnFirst.addEventListener('click', () => goToPage(1));
    if (btnPrev && !btnPrev.disabled) btnPrev.addEventListener('click', () => goToPage(currentPage - 1));
    if (btnNext && !btnNext.disabled) btnNext.addEventListener('click', () => goToPage(currentPage + 1));
    if (btnLast && !btnLast.disabled) btnLast.addEventListener('click', () => goToPage(totalPages));
    if (pageInput) {
        pageInput.addEventListener('change', (e) => {
            const pageNum = parseInt(e.target.value);
            if (pageNum >= 1 && pageNum <= totalPages) goToPage(pageNum);
            else e.target.value = currentPage;
        });
    }
}

/**
 * @brief Navega a una página específica.
 */
function goToPage(pageNumber) {
    const maxPage = Math.ceil(paginationState.totalSensors / paginationState.itemsPerPage);
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > maxPage) pageNumber = maxPage;
    
    paginationState.currentPage = pageNumber;
    renderPage(pageNumber, paginationState.filteredSensors);
    sensorsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.goToPage = goToPage;

// ==========================================
// FUNCIÓN DE NAVEGACIÓN (CRÍTICA)
// ==========================================

/**
 * @brief Navega a la página de detalle del sensor.
 * @details Pasa el ID del sensor en la URL para que admin_sensor_detail.js sepa qué cargar.
 * @param {string} id - ID del sensor.
 */
window.goToDetail = (id) => {
    window.location.href = `admin_sensor_detail.html?id=${id}`;
};