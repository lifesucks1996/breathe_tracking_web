/**
 * @file admin_sensor_detail.js
 * @brief Controlador de la vista de detalle de un sensor específico.
 * @details
 * Este archivo gestiona la visualización detallada de un sensor seleccionado.
 * Realiza las siguientes tareas:
 * - Lee el ID del sensor de la URL (parametro ?id=...).
 * - Busca los datos del sensor (simulados o reales) para mostrarlos.
 * - Renderiza un mapa Leaflet centrado en la ubicación del sensor.
 * - Muestra métricas clave: Batería, Última conexión, Ubicación.
 * - Genera gráficos de actividad (Chart.js) para diferentes gases.
 * * @requires admin_sensors_data.js - Para buscar los datos del sensor si no hay backend activo.
 * @requires Chart.js - Para la visualización de gráficos.
 * @requires Leaflet.js - Para el mapa de detalle.
 * @requires Firebase - Para datos en tiempo real (opcional).
 * * @version 2.0
 * @author Breathe Tracking Team
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * @brief Configuración de conexión a Firebase.
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

/** @brief Instancia de la aplicación Firebase. */
let firebaseApp;
/** @brief Instancia de la base de datos Firestore. */
let db;
/** @brief Instancia del gráfico Chart.js para poder destruirlo y recrearlo. */
let sensorChart = null;

// Inicialización segura de Firebase
try {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(firebaseApp);
} catch (error) {
    console.error("Error al inicializar Firebase.", error);
}

/**
 * @brief Etiquetas horarias para el eje X del gráfico (00:00 a 23:00).
 * @const {Array<string>}
 */
const HOURLY_LABELS = Array.from({ length: 24 }, (_, i) => 
    `${i.toString().padStart(2, '0')}:00`
);

/**
 * @brief Listener principal: Se ejecuta cuando el DOM está listo.
 * @details
 * 1. Carga los datos del sensor (leyendo ID de URL).
 * 2. Inicializa el mapa de detalle.
 * 3. Renderiza el gráfico inicial (Ozono).
 * 4. Configura el selector de gases para actualizar el gráfico.
 */
document.addEventListener('DOMContentLoaded', () => {
    loadSensorData(); // Carga dinámica basada en URL
    initDetailMap();
    renderChart('Ozono');

    const select = document.getElementById('activity-contaminant-select');
    if (select) {
        select.addEventListener('change', (e) => {
            renderChart(e.target.value);
        });
    }
});

/**
 * @brief Inicializa el mapa Leaflet centrado en el sensor.
 * @details
 * Usa `window.sensorDetailData` para obtener las coordenadas.
 * Dibuja un marcador personalizado en la ubicación del sensor.
 */
function initDetailMap() {
    // Verificamos si hay datos cargados en la variable global
    if (!window.sensorDetailData || !window.sensorDetailData.pathCoords) return;
    
    // Centramos el mapa en la última coordenada disponible
    const center = window.sensorDetailData.pathCoords[window.sensorDetailData.pathCoords.length - 1];
    
    // Inicializamos Leaflet
    const map = L.map('detail-map').setView(center, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Icono personalizado (Estilo Chip Azul)
    const sensorIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="leaflet-marker-icon sensor-marker" style="background-color: var(--primary-dark-blue, #003366); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); font-size: 1.2em;"><i class="fas fa-microchip"></i></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    const currentMarker = L.marker(center, { icon: sensorIcon, draggable: true }).addTo(map);
    currentMarker.bindPopup(`<b>${window.sensorDetailData.name}</b><br>${window.sensorDetailData.currentLocation}`).openPopup();
}

/**
 * @brief Carga los datos del sensor basándose en la URL.
 * @details
 * 1. Lee el parámetro `?id=` de la URL.
 * 2. Busca ese ID en `adminSensorsData` (cargado desde admin_sensors_data.js).
 * 3. Actualiza el objeto `window.sensorDetailData` con la información real.
 * 4. Actualiza el DOM (Título, Batería, Ubicación, Última Conexión).
 */
function loadSensorData() {
    // 1. LEER EL ID DE LA URL
    const params = new URLSearchParams(window.location.search);
    const sensorId = params.get('id');

    // 2. BUSCAR EL SENSOR EN LA LISTA GLOBAL
    // Por defecto usamos el mock que ya existía
    let sensor = window.sensorDetailData; 
    
    // Si tenemos la lista de sensores cargada y hay un ID en la URL, buscamos el real
    if (sensorId && typeof adminSensorsData !== 'undefined') {
        const sensorEncontrado = adminSensorsData.find(s => s.id === sensorId);
        
        if (sensorEncontrado) {
            // Construimos el objeto de detalle con los datos del sensor encontrado
            sensor = {
                ...window.sensorDetailData, // Mantenemos datos dummy (batería, path) si faltan
                id: sensorEncontrado.id,
                name: sensorEncontrado.name || sensorEncontrado.nombre,
                currentLocation: sensorEncontrado.location || sensorEncontrado.ubicacion,
                lastConnection: sensorEncontrado.lastConnection,
                pathCoords: [sensorEncontrado.coords] // Centrar mapa en este sensor
            };
            // Actualizamos la variable global para que initDetailMap la use
            window.sensorDetailData = sensor; 
        }
    }

    const data = sensor;
    
    // --- RENDERIZADO EN EL DOM ---
    
    // Título
    document.getElementById('sensor-detail-title').textContent = data.name;

    // Última conexión
    const lastConnInfo = document.getElementById('last-connection-info');
    if(lastConnInfo) {
        lastConnInfo.innerHTML = `Última conex: <span style="color:#e74c3c">${data.lastConnection}</span>`;
    }
    
    // Batería
    const battElem = document.getElementById('battery-status-text');
    if(battElem) {
        battElem.textContent = `Batería ${data.battery}`;
        if(parseInt(data.battery) < 20) {
            battElem.innerHTML += ' <i class="fas fa-battery-quarter" style="color:red"></i>';
        } else {
            battElem.innerHTML += ' <i class="fas fa-battery-three-quarters" style="color:green"></i>';
        }
    }

    // Ubicación
    const curLoc = document.getElementById('current-location');
    if(curLoc) curLoc.textContent = data.currentLocation;
    
    // Ocultar segunda línea de ubicación para limpieza visual
    const avgLoc = document.getElementById('avg-location');
    if(avgLoc) {
        avgLoc.style.display = 'none'; 
    }

    // Datos del punto inferior (Métricas actuales)
    const pLoc = document.getElementById('point-location-text');
    if(pLoc && data.point4) pLoc.textContent = data.currentLocation;
    
    const pTime = document.getElementById('point-time');
    if(pTime) pTime.textContent = `Hora: ${data.lastConnection}`;
}

// ============================================================================
// LÓGICA DE GRÁFICOS (Chart.js)
// ============================================================================

/**
 * @brief Mapea el nombre del contaminante en la UI al ID de la base de datos.
 * @param {string} uiName - Nombre seleccionado en el dropdown (ej: "Ozono").
 * @return {string} ID del documento en Firestore (ej: "ozono").
 */
function mapContaminantToId(uiName) {
    switch (uiName) {
        case 'Ozono': case 'ozono': return 'ozono';
        case 'CO2': case 'co2': return 'co2';
        case 'CO': case 'co': return 'co';
        case 'NO2': case 'no2': return 'no2';
        case 'SO2': case 'so2': return 'so2';
        default: return ''; 
    }
}

/**
 * @brief Renderiza o actualiza el gráfico de actividad.
 * @details
 * Obtiene datos históricos de Firestore (colección "datos_grafico") 
 * y los pinta usando Chart.js.
 * * @param {string} contaminantType - Tipo de contaminante a visualizar.
 * @async
 */
async function renderChart(contaminantType) {
    const ctx = document.getElementById('activityChart')?.getContext('2d');
    if (!ctx) return; 

    let dataValues = [];
    let unit = '';
    let labelText = `Nivel de ${contaminantType}`;
    let borderColor = '#95a5a6'; 
    
    const queryType = mapContaminantToId(contaminantType);
    
    // Configuración de colores y unidades según el gas
    switch (queryType) {
        case 'ozono': borderColor = '#8A2BE2'; unit = 'ppm'; break;
        case 'co2':   borderColor = '#32CD32'; unit = 'ppm'; break;
        case 'co':    borderColor = '#FF8C00'; unit = 'mg/m³'; break;
        case 'no2':   borderColor = '#E6A100'; unit = 'µg/m³'; break;
        case 'so2':   borderColor = '#00BFFF'; unit = 'µg/m³'; break;
        default:      borderColor = '#95a5a6';
    }
    
    let bgColor = borderColor.replace('rgb', 'rgba').replace(')', ', 0.2)');
    if (bgColor.startsWith('#')) bgColor = 'rgba(100, 100, 100, 0.2)';

    // Obtención de datos desde Firestore
    if (db && queryType) {
        try {
            const docRef = doc(db, "datos_grafico", queryType); 
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                dataValues = data.valor || []; 
            }
        } catch (e) {
            console.error("Error FB:", e);
        }
    }
    
    // Relleno de seguridad si no hay datos
    if (dataValues.length !== HOURLY_LABELS.length) {
        dataValues = HOURLY_LABELS.map(() => null); 
    }

    // Destruir gráfico previo si existe para evitar superposiciones
    if (sensorChart) sensorChart.destroy();

    // Crear nuevo gráfico
    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: HOURLY_LABELS,
            datasets: [{
                label: labelText,
                data: dataValues,
                borderColor: borderColor,
                backgroundColor: bgColor,
                borderWidth: 2,
                tension: 0.4,
                fill: false,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: unit } },
                x: { grid: { display: false } }
            }
        }
    });
}