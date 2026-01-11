/**
 * @file admin_sensors.js
 * @brief Panel de Administración: Gestión de sensores, heatmap congelado, paginación y gestión de incidencias.
 * @details
 * Este módulo implementa las siguientes funcionalidades:
 * - Carga dinámica de 207 sensores (7 reales + 200 simulados) desde admin_sensors_data.js
 * - Renderizado con sistema de paginación (20 sensores por página = 11 páginas)
 * - Mapa de calor congelado sincronizado con datos de contaminación
 * - Selección de gases (O₃, NO₂, CO, SO₂, CO₂) con gradientes de color personalizados
 * - Filtros de sensores (Todos, Con Incidencias, Inactivos)
 * - Gestión de incidencias con modal de detalles
 * - Marcadores en mapa con códigos de color (rojo=incidencia, azul=normal, gris=inactivo)
 * - Navegación por secciones (Primero, Anterior, Siguiente, Último)
 *
 * @requires admin_sensors_data.js - Datos de sensores
 * @requires Leaflet.js - Librería de mapas
 * @requires Firebase (Firestore) - Base de datos en tiempo real
 * @requires Chart.js - Visualización de gráficos (en admin_sensor_detail.js)
 *
 * @version 2.0
 * @author Breathe Tracking Team
 */

// ======================================================================
// FIX CANVAS: Permitir lectura frecuente para "Congelar" el mapa
// ======================================================================
/**
 * @brief Patch para mejorar performance de canvas en heatmap.
 * @details
 * Establece willReadFrequently=true para evitar advertencias de performance
 * cuando se accede frecuentemente a píxeles del canvas (necesario para heatmap congelado).
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
 * @details
 * Contiene las credenciales y endpoints de la aplicación "biometria-g3".
 * @type {Object}
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
 * @type {Array<L.CircleMarker>}
 */
let markers = []; // Array de marcadores de sensores (chips)

/**
 * @brief Layer de heatmap congelado del mapa (Heatmap.js).
 * @type {Object|null}
 */
let capaCalor = null;

/**
 * @brief Imagen congelada del heatmap (canvas).
 * @type {Object|null}
 */
let heatmapCongelado = null;

/**
 * @brief Nivel de zoom para visualización del heatmap congelado.
 * @type {number}
 */
const ZOOM_CONGELADO = 14; 

/**
 * @brief Configuración actual del gas seleccionado (unidad, gradiente, nombre).
 * @type {Object}
 * @property {string} unidad - Unidad de medida (ppm, µg/m³)
 * @property {Object} gradiente - Escala de colores para visualización
 * @property {string} nombre - Nombre amigable del gas
 */
let configGasActual = { unidad: 'ppm', gradiente: null, nombre: '' };

// DOM Elements
/**
 * @brief Contenedor donde se renderiza la lista de sensores.
 * @type {HTMLElement}
 */
const sensorsContainer = document.getElementById('sensors-container');

/**
 * @brief Selector de filtro de actividad (Todos, Con Incidencias, Inactivos).
 * @type {HTMLSelectElement}
 */
const activityFilter = document.getElementById('activityFilter');

/**
 * @brief Botón para actualizar manualmente el mapa de calor.
 * @type {HTMLButtonElement}
 */
const btnUpdateMap = document.getElementById('btn-update-map');

/**
 * @brief Input para seleccionar la fecha del mapa de calor.
 * @type {HTMLInputElement}
 */
const dateSelector = document.getElementById('dateSelector');

/**
 * @brief Selector de contaminante/gas a visualizar.
 * @type {HTMLSelectElement}
 */
const selectorContaminante = document.getElementById('selectorContaminante');

/**
 * @brief Indicador visual de carga (spinner o mensaje).
 * @type {HTMLElement}
 */
const loadingIndicator = document.getElementById('loading-indicator');

// Incidencias DOM
/**
 * @brief Modal para visualizar detalles de incidencias.
 * @type {HTMLElement}
 */
const modalIncidents = document.getElementById('modal-incidents');

/**
 * @brief Badge/notificación con cantidad de incidencias pendientes.
 * @type {HTMLElement}
 */
const badge = document.getElementById('incident-badge');

/**
 * @brief Lista HTML de incidencias pendientes.
 * @type {HTMLElement}
 */
const listPending = document.getElementById('list-pending');

/**
 * @brief Lista HTML de incidencias resueltas.
 * @type {HTMLElement}
 */
const listResolved = document.getElementById('list-resolved');

/**
 * @brief Elemento que muestra el conteo de incidencias pendientes.
 * @type {HTMLElement}
 */
const countPendingSpan = document.getElementById('count-pending');

/**
 * @brief Array de objetos con incidencias (estado pendiente o resuelto).
 * @type {Array<Object>}
 */
let incidentsData = [];

// ========================= INICIALIZACIÓN =========================
/**
 * @brief Listener de inicialización del DOM - Configura mapa, sensores, filtros e incidencias.
 * @details
 * Se ejecuta cuando el DOM está completamente cargado.
 * Realiza:
 * 1. Inicialización del mapa Leaflet
 * 2. Renderizado de lista de sensores con paginación
 * 3. Configuración de filtros
 * 4. Sistema de incidencias
 * 5. Listeners para actualizar mapa
 */
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
// LÓGICA DE MAPA DE CALOR (SINCRONIZADA)
// ==========================================

/**
 * @brief Carga y renderiza el mapa de calor en el panel de administración.
 * @details
 * Obtiene datos de sensores para la fecha y gas seleccionados.
 * Crea un heatmap congelado (imagen estática) para mejor performance.
 * Soporta sincronización con users_map_data.js via window.obtenerDatosDelSensor().
 *
 * Proceso:
 * 1. Obtiene fecha (dateSelector) y gas (selectorContaminante)
 * 2. Muestra indicador de carga
 * 3. Elimina heatmap anterior si existe
 * 4. Llama a obtenerDatosDelSensor() para obtener puntos
 * 5. Configura gradiente de colores según gas
 * 6. Pinta el mapa de calor
 * 7. Oculta indicador de carga
 *
 * @async
 * @return {Promise<void>}
 * @throws {Error} Si hay problema obteniendo datos de sensores
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

/**
 * @brief Construye un gradiente de 3 colores (Verde-Amarillo-Rojo) para visualización.
 * @details
 * Crea una escala de colores que representa la calidad del aire:
 * - Verde (0.0-0.2): Buena calidad
 * - Amarillo (0.2-0.6): Calidad moderada
 * - Rojo (0.6-1.0): Mala calidad
 *
 * @param {Array<number>} umbrales - Array de umbrales (actualmente no se usa, para compatibilidad futura)
 * @return {Object} Objeto de gradiente Leaflet para heatmap
 *
 * @example
 * const gradiente = construirGradiente([]);
 * // Retorna: { 0.0: 'rgba(0,0,0,0)', 0.2: 'green', 0.6: 'yellow', 1.0: 'red' }
 */
function construirGradiente(umbrales) {
    // Gradiente Estricto 3 Colores (Verde, Amarillo, Rojo)
    return { 
        0.0: 'rgba(0,0,0,0)', 
        0.2: 'green', 
        0.6: 'yellow', 
        1.0: 'red' 
    };
}

/**
 * @brief Pinta el mapa de calor con los datos de sensores proporcionados.
 * @details
 * Crea una capa de heatmap (L.heatLayer) con los puntos [lat, lng, intensidad].
 * Configura radio, blur y gradiente según gas seleccionado.
 * Luego congela el heatmap como imagen para mejor performance.
 *
 * @param {Array<Array>} puntos - Array de [latitud, longitud, intensidad] (0-1)
 * @return void
 */
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

/**
 * @brief Congela el heatmap dinámico como imagen estática para mejor performance.
 * @details
 * Convierte el canvas del heatmap a imagen PNG usando toDataURL().
 * Reemplaza la capa dinámica (L.heatLayer) con una capa estática (L.imageOverlay).
 * Obtiene los bounds del mapa para posicionar correctamente la imagen.
 * Asegura que los marcadores de sensores queden siempre encima.
 *
 * @return void
 */
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

/**
 * @brief Coloca todos los marcadores de sensores al frente del mapa (z-index máximo).
 * @details
 * Asegura que los "chips" (marcadores circulares) de sensores siempre se visualicen
 * encima del heatmap congelado, evitando que la imagen del calor los cubra.
 * Establece zIndexOffset y CSS z-index en 10000.
 *
 * @return void
 */
function bringMarkersToFront() {
    markers.forEach(marker => {
        marker.setZIndexOffset(10000); // Forzar al frente
        if(marker._icon) marker._icon.style.zIndex = "10000";
    });
}

// ==========================================
// LÓGICA DE INCIDENCIAS
// ==========================================

/**
 * @brief Inicializa el sistema de gestión de incidencias desde Firestore.
 * @details
 * Conecta con la colección "incidencias" en Firebase Firestore.
 * Usa onSnapshot() para actualizar la UI en tiempo real cuando hay cambios.
 * Configura listeners para:
 * - Botón de abrir modal de incidencias
 * - Botón de cerrar modal
 * - Tabs para filtrar por PENDIENTE y RESUELTA
 *
 * @return void
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

/**
 * @brief Actualiza la UI de notificaciones de incidencias.
 * @details
 * Separa incidencias por estado (PENDIENTE vs RESUELTA).
 * Muestra/oculta badge según hay incidencias pendientes.
 * Actualiza el contador en la interfaz.
 * Renderiza listas de incidencias en sus respectivos contenedores.
 *
 * @return void
 */
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

/**
 * @brief Inicializa el mapa Leaflet y agrega los marcadores de sensores.
 * @details
 * Crea una instancia de mapa L.map centrado en Gandía (38.9660, -0.1850).
 * Añade capa de tiles de OpenStreetMap.
 * Carga todos los sensores como marcadores personalizados con iconos CSS.
 *
 * @return void
 * @requires Leaflet.js - Librería de mapas
 */
function initMap() {
    map = L.map('admin-map').setView([38.9660, -0.1850], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    addSensorMarkers(adminSensorsData);
}

/**
 * @brief Añade marcadores de sensores al mapa con iconos y popups personalizados.
 * @details
 * Limpia marcadores anteriores y crea nuevos L.marker para cada sensor.
 * Usa iconos CSS personalizados (divIcon) con colores según estado:
 * - Rojo: Sensor con incidencia (hasIncident=true)
 * - Azul: Sensor normal (active=true)
 * - Gris: Sensor inactivo (active=false)
 * Cada marcador tiene un popup con nombre y estado del sensor.
 * Asegura que los marcadores queden siempre encima del heatmap (z-index=10000).
 *
 * @param {Array<Object>} sensors - Array de objetos sensor con propiedades: coords, name, hasIncident, active
 * @return void
 */
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

// Variables para paginación
/**
 * @brief Estado de la paginación de sensores.
 * @type {Object}
 * @property {number} currentPage - Página actualmente visualizada (1-11)
 * @property {number} itemsPerPage - Cantidad de sensores por página (20)
 * @property {number} totalSensors - Total de sensores (207)
 * @property {number} totalPages - Total de páginas (11)
 * @property {Array<Object>} filteredSensors - Array de sensores después de filtros
 */
let paginationState = {
    currentPage: 1,
    itemsPerPage: 20,
    totalSensors: 0,
    totalPages: 0,
    filteredSensors: []
};

/**
 * @brief Renderiza la lista de sensores con sistema de paginación.
 * @details
 * Valida que existan sensores.
 * Actualiza el estado de paginación (total sensores, páginas, etc).
 * Resetea a página 1.
 * Llama a renderPage() para mostrar la primera página.
 *
 * @param {Array<Object>} sensors - Array de sensores a mostrar
 * @return void
 */
function renderSensorsList(sensors) {
    sensorsContainer.innerHTML = '';
    if (!sensors.length) {
        sensorsContainer.innerHTML = '<p style="text-align:center;padding:20px;">Sin resultados.</p>';
        return;
    }
    
    // Actualizar estado de paginación
    paginationState.filteredSensors = sensors;
    paginationState.totalSensors = sensors.length;
    paginationState.totalPages = Math.ceil(sensors.length / paginationState.itemsPerPage);
    paginationState.currentPage = 1; // Reiniciar a página 1
    
    // Renderizar primera página
    renderPage(paginationState.currentPage, sensors);
}

/**
 * @brief Renderiza una página específica (20 sensores) de la lista.
 * @details
 * Calcula rango de índices según número de página.
 * Crea elementos HTML para cada sensor con:
 * - Icono (chip icon)
 * - Nombre, ubicación, última conexión
 * - Botón "Ver" para detalles
 * - Estilos condicionales (rojo si incidencia, gris si inactivo)
 * Añade controles de paginación (Primero, Anterior, Siguiente, Último).
 * Rango mostrado: "sensores X a Y de Z"
 *
 * @param {number} pageNumber - Número de página a renderizar (1-11)
 * @param {Array<Object>} sensors - Array de sensores a paginar
 * @return void
 */
function renderPage(pageNumber, sensors) {
    /**
     * Renderiza una página específica de sensores
     */
    const container = sensorsContainer;
    container.innerHTML = '';
    
    if (!sensors.length) {
        container.innerHTML = '<p style="text-align:center;padding:20px;">Sin resultados.</p>';
        return;
    }
    
    // Calcular índices
    const startIdx = (pageNumber - 1) * paginationState.itemsPerPage;
    const endIdx = Math.min(startIdx + paginationState.itemsPerPage, sensors.length);
    
    // Crear fragmento con los sensores de esta página
    const fragment = document.createDocumentFragment();
    
    for (let i = startIdx; i < endIdx; i++) {
        const sensor = sensors[i];
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
        fragment.appendChild(item);
    }
    
    container.appendChild(fragment);
    
    // Agregar controles de paginación
    addPaginationControls(pageNumber, sensors.length);
}

/**
 * @brief Añade controles de paginación (botones y campo de navegación).
 * @details
 * Crea una sección de paginación con:
 * - Botón "Primero" (⏮️) - va a página 1
 * - Botón "Anterior" (◀️) - va a página anterior
 * - Campo input para ir a página específica
 * - Botón "Siguiente" (▶️) - va a página siguiente
 * - Botón "Último" (⏭️) - va a última página
 * - Texto informativo: "Página X de Y | Mostrando sensores A a B de 207"
 * Los botones se deshabilitan automáticamente si están en inicio/final.
 * Añade event listeners a botones e input.
 *
 * @param {number} currentPage - Página actualmente mostrada
 * @param {number} totalSensors - Total de sensores (207)
 * @return void
 */
function addPaginationControls(currentPage, totalSensors) {
    /**
     * Agrega controles de navegación de páginas
     */
    const container = sensorsContainer;
    const totalPages = Math.ceil(totalSensors / paginationState.itemsPerPage);
    
    // Calcular índices para mostrar rango de sensores
    const startIdx = (currentPage - 1) * paginationState.itemsPerPage + 1;
    const endIdx = Math.min(currentPage * paginationState.itemsPerPage, totalSensors);
    
    // Crear div para controles
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = `
        text-align: center;
        padding: 15px;
        border-top: 1px solid #ddd;
        margin-top: 10px;
        font-size: 12px;
        color: #666;
    `;
    
    // Información de página con rango de sensores
    const infoText = `Página ${currentPage} de ${totalPages} | Mostrando sensores ${startIdx} a ${endIdx} de ${totalSensors}`;
    controlsDiv.innerHTML = `
        <p style="margin: 0 0 10px 0;">${infoText}</p>
        <div style="display: flex; gap: 8px; justify-content: center;">
            <button class="pagination-btn btn-first" ${currentPage === 1 ? 'disabled' : ''} style="flex: 1;">⏮️ Primero</button>
            <button class="pagination-btn btn-prev" ${currentPage === 1 ? 'disabled' : ''} style="flex: 1;">◀️ Anterior</button>
            <input type="number" class="pageInput" min="1" max="${totalPages}" value="${currentPage}" style="width: 50px; padding: 6px; border: 1px solid #ddd; border-radius: 4px; text-align: center;">
            <button class="pagination-btn btn-next" ${currentPage === totalPages ? 'disabled' : ''} style="flex: 1;">Siguiente ▶️</button>
            <button class="pagination-btn btn-last" ${currentPage === totalPages ? 'disabled' : ''} style="flex: 1;">Último ⏭️</button>
        </div>
    `;
    
    container.appendChild(controlsDiv);
    
    // Event listeners para botones
    const btnFirst = controlsDiv.querySelector('.btn-first');
    const btnPrev = controlsDiv.querySelector('.btn-prev');
    const btnNext = controlsDiv.querySelector('.btn-next');
    const btnLast = controlsDiv.querySelector('.btn-last');
    const pageInput = controlsDiv.querySelector('.pageInput');
    
    if (btnFirst && !btnFirst.disabled) {
        btnFirst.addEventListener('click', () => goToPage(1));
    }
    
    if (btnPrev && !btnPrev.disabled) {
        btnPrev.addEventListener('click', () => goToPage(currentPage - 1));
    }
    
    if (btnNext && !btnNext.disabled) {
        btnNext.addEventListener('click', () => goToPage(currentPage + 1));
    }
    
    if (btnLast && !btnLast.disabled) {
        btnLast.addEventListener('click', () => goToPage(totalPages));
    }
    
    if (pageInput) {
        pageInput.addEventListener('change', (e) => {
            const pageNum = parseInt(e.target.value);
            if (pageNum >= 1 && pageNum <= totalPages) {
                goToPage(pageNum);
            } else {
                e.target.value = currentPage;
            }
        });
    }
}

/**
 * @brief Navega a una página específica de la paginación.
 * @details
 * Valida que el número de página esté en rango (1 a totalPages).
 * Actualiza paginationState.currentPage.
 * Renderiza la página con los sensores filtrados actuales.
 *
 * @param {number} pageNumber - Número de página destino (1-11)
 * @return void
 */
function goToPage(pageNumber) {
    /**
     * Navega a una página específica
     */
    const maxPage = Math.ceil(paginationState.totalSensors / paginationState.itemsPerPage);
    
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > maxPage) pageNumber = maxPage;
    
    paginationState.currentPage = pageNumber;
    renderPage(pageNumber, paginationState.filteredSensors);
    
    // Scroll al inicio del contenedor
    sensorsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Hacer la función accesible globalmente para onclick
window.goToPage = goToPage;

/**
 * @brief Filtra la lista de sensores según actividad y re-renderiza.
 * @details
 * Obtiene el valor del selector activityFilter (Todos, Con Incidencias, Inactivos).
 * Filtra adminSensorsData según el criterio:
 * - 'all': Muestra todos los 207 sensores
 * - 'incident': Solo sensores con hasIncident=true (~31 sensores)
 * - 'inactive': Solo sensores con active=false (2 sensores)
 * Re-renderiza lista con paginación desde página 1.
 * Actualiza marcadores del mapa.
 * Resetea a página 1 automáticamente.
 *
 * @return void
 */
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