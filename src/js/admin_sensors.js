/**
 * @file admin_sensors.js
 * @brief Controlador del panel principal de administración de sensores (Dashboard).
 * @details
 * Este script gestiona la vista general de los sensores y el sistema de incidencias.
 * Funcionalidades principales:
 * 1. Inicialización del mapa Leaflet con marcadores de estado.
 * 2. Listado filtrable de sensores (Activos, Inactivos, con Incidencias).
 * 3. Conexión en tiempo real (Real-time listener) con Firebase Firestore para la gestión de incidencias.
 * 4. Lógica para resolver incidencias y actualizar la base de datos.
 */

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

/**
 * @brief Inicializa el sistema de escucha en tiempo real para las incidencias.
 * (void) -> initIncidentsSystem() -> void
 * * @details
 * Configura un listener 'onSnapshot' de Firestore sobre la colección 'incidencias'.
 * Cada vez que hay un cambio en la base de datos (nueva incidencia o cambio de estado),
 * esta función se ejecuta automáticamente, actualizando el array local 'incidentsData'
 * y refrescando la interfaz de usuario.
 * También configura los listeners para el modal y las pestañas.
 * * @return void
 */
function initIncidentsSystem() {
    // Creamos la query ordenada por fecha descendente para ver las más recientes primero
    const q = query(collection(db, "incidencias"), orderBy("fecha", "desc"));

    onSnapshot(q, (snapshot) => {
        incidentsData = [];
        snapshot.forEach((doc) => {
            // Fusionamos el ID del documento con sus datos para poder referenciarlo luego
            incidentsData.push({ id: doc.id, ...doc.data() });
        });
        updateNotificationsUI();
    });

    const btnIncidents = document.getElementById('btn-incidents');
    if(btnIncidents) btnIncidents.addEventListener('click', openModal);
    
    const btnClose = document.getElementById('close-modal');
    if(btnClose) btnClose.addEventListener('click', closeModal);
    
    // Lógica de pestañas (Tabs) dentro del modal (Pendientes vs Resueltas)
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
 * @brief Actualiza los contadores y las listas visuales de incidencias.
 * (global: incidentsData) -> updateNotificationsUI() -> void
 * * @details
 * Filtra el array global de incidencias en dos grupos: pendientes y resueltas.
 * Actualiza la visibilidad del 'badge' (punto rojo de notificación) y el número
 * de incidencias pendientes. Finalmente llama a 'renderIncidents' para pintar el HTML.
 * * @return void
 */
function updateNotificationsUI() {
    // Filtrar usando el campo 'estado' == 'PENDIENTE'
    // (Esto asegura que la UI sea coherente con lo que ves escrito)
    const pending = incidentsData.filter(i => i.estado === 'PENDIENTE');
    const resolved = incidentsData.filter(i => i.estado === 'RESUELTA');
    
    // 1. Actualizar Badge (Notificación visual en el botón)
    if (pending.length > 0) {
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // 2. Actualizar contador de texto
    countPendingSpan.textContent = `(${pending.length})`;

    // 3. Renderizar listas HTML
    renderIncidents(listPending, pending, true);
    renderIncidents(listResolved, resolved, false);
}

/**
 * @brief Genera el HTML de las tarjetas de incidencia dentro del contenedor especificado.
 * container:HTMLElement, items:Object[], isPending:boolean -> renderIncidents() -> void
 * * @details
 * Itera sobre la lista de incidencias y crea elementos DOM dinámicamente.
 * Maneja la conversión de Timestamps de Firestore a formato legible.
 * Si es una lista de pendientes, añade el botón de "Resolver".
 * * @param container Elemento DOM donde se inyectarán las tarjetas.
 * @param items Array de objetos de incidencias.
 * @param isPending Booleano que indica si se está renderizando la lista de pendientes.
 */
function renderIncidents(container, items, isPending) {
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-msg">No hay incidencias en esta lista.</p>';
        return;
    }

    items.forEach(incident => {
        const priority = incident.prioridad || 'HIGH';

        // Lógica de Hora: Firestore devuelve Timestamp {seconds, nanoseconds}
        // Necesitamos convertirlo a Date de JS (multiplicando por 1000 para milisegundos)
        let dateStr = 'Fecha desconocida';
        let timeStr = '--:--'; 

        if (incident.fecha && incident.fecha.seconds) {
            const dateObj = new Date(incident.fecha.seconds * 1000);
            dateStr = dateObj.toLocaleString();
            timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Si el mensaje tiene un placeholder de hora, lo reemplazamos
        let mensajeFinal = incident.mensaje ? incident.mensaje.replace('--:--', timeStr) : "Sin detalles.";

        const card = document.createElement('div');
        card.className = `incident-card priority-${priority} ${!isPending ? 'resolved' : ''}`;
        
        // Estructura HTML de la tarjeta (Card)
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

/**
 * @brief Expande o contrae los detalles de una tarjeta de incidencia.
 * element:HTMLElement -> toggleIncident() -> void
 * * @details
 * Función asignada al objeto window para ser llamada desde el HTML (onclick).
 * Alterna la clase CSS 'expanded' en el elemento padre.
 * * @param element El elemento DOM que disparó el evento clic.
 */
window.toggleIncident = function(element) {
    element.parentElement.classList.toggle('expanded');
};

/**
 * @brief Marca una incidencia como resuelta en Firebase Firestore.
 * docId:string -> resolveIncident() -> Promise<void>
 * * @details
 * 1. Pide confirmación al usuario.
 * 2. Obtiene la referencia al documento en Firestore usando el ID.
 * 3. Ejecuta `updateDoc` para cambiar el estado a 'RESUELTA', poner `resuelta: true`
 * y añadir la fecha actual de resolución.
 * * @note Esta función es asíncrona (async/await) para manejar la red.
 * @param docId ID del documento de la incidencia en Firestore.
 * @throws Error Si falla la conexión o la actualización en la base de datos.
 */
window.resolveIncident = async function(docId) {
    if(!confirm('¿Confirmar que la incidencia ha sido solucionada?')) return;
    
    try {
        const incidentRef = doc(db, "incidencias", docId);
        
        // Actualizamos AMBOS campos para mantener consistencia de datos
        await updateDoc(incidentRef, {
            estado: 'RESUELTA',
            resuelta: true,       // Booleano para lógica simple
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

/**
 * @brief Inicializa el mapa principal con Leaflet.
 * (void) -> initMap() -> void
 * * @details
 * Configura la vista inicial, añade la capa base de OpenStreetMap y llama
 * a la función para pintar los marcadores de los sensores.
 */
function initMap() {
    map = L.map('admin-map').setView([38.9660, -0.1850], 13); 
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    addSensorMarkers(adminSensorsData);
}

/**
 * @brief Añade marcadores al mapa según el estado de cada sensor.
 * sensors:Object[] -> addSensorMarkers() -> void
 * * @details
 * Limpia los marcadores existentes y genera nuevos.
 * Asigna clases CSS y colores específicos:
 * - Gris: Inactivo/Desconectado.
 * - Rojo: Incidencia detectada.
 * - Azul/Default: Estado normal.
 * * @param sensors Array de objetos de sensores (procedente de adminSensorsData).
 */
function addSensorMarkers(sensors) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    sensors.forEach(sensor => {
        let cssClass = 'sensor-marker';
        let popupStatus = 'Estado: OK';
        let popupColor = 'black';

        // Lógica de prioridades para el estilo: Inactivo > Incidencia > Normal
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

        // Creación del icono HTML personalizado
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

/**
 * @brief Renderiza la lista lateral de sensores en el HTML.
 * sensors:Object[] -> renderSensorsList() -> void
 * * @details
 * Genera el HTML para cada ítem de la lista lateral.
 * Incluye lógica condicional para mostrar etiquetas de "Inactivo" o iconos de alerta.
 * Añade botones de acción que redirigen al detalle del sensor.
 * * @param sensors Array de sensores a mostrar.
 */
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

/**
 * @brief Filtra los sensores mostrados según la selección del usuario.
 * (void) -> filterSensors() -> void
 * * @details
 * Lee el valor del selector 'activityFilter' y filtra el array global 'adminSensorsData'.
 * Llama a 'renderSensorsList' y 'addSensorMarkers' para actualizar tanto la lista como el mapa.
 * Casos: 'all', 'incident', 'inactive'.
 */
function filterSensors() {
    const filterValue = activityFilter.value;
    let filteredData = [];
    if (filterValue === 'all') filteredData = adminSensorsData;
    else if (filterValue === 'incident') filteredData = adminSensorsData.filter(s => s.hasIncident === true);
    else if (filterValue === 'inactive') filteredData = adminSensorsData.filter(s => s.active === false);
    renderSensorsList(filteredData);
    addSensorMarkers(filteredData);
}

/**
 * @brief Redirige al usuario a la página de detalle del sensor.
 * sensorId:string -> goToDetail() -> void
 * * @details
 * Navegación simple cambiando la propiedad window.location.href.
 * * @param sensorId El ID del sensor seleccionado (se usará en el futuro para cargar datos dinámicos).
 */
window.goToDetail = function(sensorId) { window.location.href = 'admin_sensor_detail.html'; };