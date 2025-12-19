/**
 * @file admin_sensor_detail.js
 * @brief Controlador principal para la vista de detalle de sensores en el panel de administración.
 * @details
 * Este archivo gestiona la lógica de la página de detalles, incluyendo:
 * - Conexión con Firebase Firestore.
 * - Inicialización y renderizado del mapa Leaflet.
 * - Carga de datos estáticos del sensor en el DOM.
 * - Generación de gráficos dinámicos con Chart.js basándose en datos de Firestore.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración de conexión a Firebase
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCbAVEYYdtSLmrH_opCM72G_G01QXPRZ48",
    authDomain: "biometria-g3.firebaseapp.com",
    databaseURL: "https://biometria-g3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "biometria-g3",
    storageBucket: "biometria-g3.firebasestorage.app",
    messagingSenderId: "817957103566",
    appId: "1:817957103566:web:75c78a0a28f3380d092d9f"
};

let firebaseApp;
let db;
let sensorChart = null; // Variable global para mantener la instancia del gráfico y poder destruirla al actualizar

// Inicialización segura de Firebase
try {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(firebaseApp);
} catch (error) {
    console.error("Error al inicializar Firebase.", error);
}

/**
 * @brief Genera un array de etiquetas horarias para el eje X del gráfico.
 * void -> HOURLY_LABELS -> string[]
 * * @details
 * Crea un array de 24 elementos representando las horas del día en formato "HH:00".
 * Utiliza Array.from para iterar 24 veces.
 */
const HOURLY_LABELS = Array.from({ length: 24 }, (_, i) => 
    `${i.toString().padStart(2, '0')}:00`
);

// Listener principal: Se ejecuta cuando el HTML ha cargado completamente
document.addEventListener('DOMContentLoaded', () => {
    initDetailMap();
    loadSensorData();

    // Iniciar con Ozono por defecto al cargar la página
    renderChart('Ozono');

    // Configurar el listener para el selector (dropdown) de contaminantes
    const select = document.getElementById('activity-contaminant-select');
    if (select) {
        select.addEventListener('change', (e) => {
            // Renderiza el gráfico de nuevo cuando el usuario cambia la opción
            renderChart(e.target.value);
        });
    }
});

/**
 * @brief Inicializa el mapa Leaflet centrado en la última ubicación conocida del sensor.
 * (global: sensorDetailData) -> initDetailMap() -> void
 * * @details
 * Obtiene las coordenadas del objeto global `sensorDetailData` (inyectado probablemente por PHP/Backend).
 * Configura la vista del mapa y añade un marcador personalizado con estilos CSS.
 * * @note Requiere que la librería Leaflet (L) esté cargada previamente en el HTML.
 * @return void
 */
function initDetailMap() {
    // Verificación de seguridad: si no hay datos, no hacemos nada para evitar errores de consola
    if (!sensorDetailData || !sensorDetailData.pathCoords) return;
    
    // Tomamos la última coordenada del array para centrar el mapa
    const center = sensorDetailData.pathCoords[sensorDetailData.pathCoords.length - 1];
    const map = L.map('detail-map').setView(center, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Definición del icono personalizado usando HTML/CSS dentro de Leaflet
    const sensorIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="leaflet-marker-icon sensor-marker" style="background-color: var(--primary-dark-blue); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); font-size: 1.2em;"><i class="fas fa-microchip"></i></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    const currentMarker = L.marker(center, { icon: sensorIcon, draggable: true }).addTo(map);
    currentMarker.bindPopup(`<b>${sensorDetailData.name}</b><br>Ubicación Actual`).openPopup();
}

/**
 * @brief Rellena los elementos del DOM con la información estática del sensor.
 * (global: sensorDetailData) -> loadSensorData() -> void
 * * @details
 * Busca elementos HTML por ID (ej: título, batería, ubicación) e inyecta
 * los valores contenidos en la variable global `sensorDetailData`.
 * Incluye lógica visual para cambiar el icono de batería según el nivel.
 * * @return void
 */
function loadSensorData() {
    if (!sensorDetailData) return;
    const data = sensorDetailData;
    
    // Actualización del título
    document.getElementById('sensor-detail-title').textContent = data.name;

    const lastConnInfo = document.getElementById('last-connection-info');
    if(lastConnInfo) lastConnInfo.innerHTML = `Última conex: <span style="color:#e74c3c">${data.lastConnection}</span>`;
    
    // Lógica de visualización de batería (Rojo < 20%, Verde en caso contrario)
    const battElem = document.getElementById('battery-status-text');
    if(battElem) {
        battElem.textContent = `Batería ${data.battery}`;
        if(parseInt(data.battery) < 20) {
            battElem.innerHTML += ' <i class="fas fa-battery-quarter" style="color:red"></i>';
        } else {
            battElem.innerHTML += ' <i class="fas fa-battery-three-quarters" style="color:green"></i>';
        }
    }

    const curLoc = document.getElementById('current-location');
    if(curLoc) curLoc.textContent = data.currentLocation;
    
    const avgLoc = document.getElementById('avg-location');
    if(avgLoc) avgLoc.textContent = data.avgLocation;

    // Datos del punto específico (Point 4 en el diseño original)
    const pLoc = document.getElementById('point-location-text');
    if(pLoc) pLoc.textContent = data.point4.location;
    
    const pTime = document.getElementById('point-time');
    if(pTime) pTime.textContent = `Hora: ${data.point4.time}`;
}

// --- Lógica del Gráfico ---

/**
 * @brief Normaliza el nombre del contaminante de la UI a un ID de base de datos.
 * uiName: string -> mapContaminantToId() -> string
 * * @details
 * Recibe el valor del selector HTML (que puede tener mayúsculas o variaciones)
 * y devuelve la clave exacta que se usa en la colección 'datos_grafico' de Firestore.
 * * @param uiName El nombre del contaminante seleccionado (ej: "Ozono", "CO2").
 * @return El ID normalizado (ej: "ozono", "co2") o cadena vacía si no existe.
 */
function mapContaminantToId(uiName) {
    // Asegúrate de que los <option value="..."> de tu HTML coincidan con los 'case'
    // He puesto los casos tanto en minúscula como mayúscula por seguridad
    switch (uiName) {
        case 'Ozono': 
        case 'ozono': return 'ozono';
        
        case 'CO2':
        case 'co2': return 'co2';
        
        case 'CO':
        case 'co': return 'co';
        
        case 'NO2':
        case 'no2': return 'no2';
        
        case 'SO2':
        case 'so2': return 'so2';
        
        default: return ''; 
    }
}

/**
 * @brief Obtiene datos de Firebase y renderiza/actualiza el gráfico de actividad.
 * contaminantType: string -> renderChart() -> Promise<void>
 * * @details
 * 1. Determina colores y unidades según el tipo de gas.
 * 2. Consulta la colección `datos_grafico` en Firestore para obtener el array de valores.
 * 3. Si existe un gráfico previo, lo destruye para liberar memoria.
 * 4. Crea una nueva instancia de Chart.js con los datos obtenidos.
 * * @note Esta función es asíncrona porque debe esperar la respuesta de la base de datos.
 * @param contaminantType El nombre del contaminante a visualizar.
 * @return Promesa vacía al finalizar el renderizado.
 */
async function renderChart(contaminantType) {
    const ctx = document.getElementById('activityChart')?.getContext('2d');
    if (!ctx) return; 

    // Valores por defecto
    let dataValues = [];
    let unit = '';
    let labelText = `Nivel de ${contaminantType}`;
    let borderColor = '#95a5a6'; 
    
    // Convertir nombre de UI a ID de base de datos
    const queryType = mapContaminantToId(contaminantType);
    
    // Configuración de estilo según el gas (Color del borde y Unidad de medida)
    switch (queryType) {
        case 'ozono': borderColor = '#8A2BE2'; unit = 'ppm'; break;
        case 'co2':   borderColor = '#32CD32'; unit = 'ppm'; break;
        case 'co':    borderColor = '#FF8C00'; unit = 'mg/m³'; break;
        case 'no2':   borderColor = '#E6A100'; unit = 'µg/m³'; break;
        case 'so2':   borderColor = '#00BFFF'; unit = 'µg/m³'; break;
        default:      borderColor = '#95a5a6';
    }
    
    // Crear un color de fondo semitransparente basado en el color del borde
    let bgColor = borderColor.replace('rgb', 'rgba').replace(')', ', 0.2)');
    if (bgColor.startsWith('#')) bgColor = 'rgba(100, 100, 100, 0.2)';

    // Llamada a Firestore
    if (db && queryType) {
        try {
            // Referencia al documento: datos_grafico -> [tipo_gas]
            const docRef = doc(db, "datos_grafico", queryType); 
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Asignamos el array de valores recuperado de la BD
                dataValues = data.valor || []; 
            } else {
                console.log(`No hay datos para ${queryType}`);
            }
        } catch (e) {
            console.error("Error al consultar Firebase:", e);
        }
    }
    
    // Validación de integridad: Si los datos no coinciden con las 24h, llenamos con null para evitar errores visuales
    if (dataValues.length !== HOURLY_LABELS.length) {
        dataValues = HOURLY_LABELS.map(() => null); 
    }

    // Importante: Destruir el gráfico anterior si existe para evitar superposición de canvas
    if (sensorChart) sensorChart.destroy();

    // Creación del nuevo gráfico
    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: HOURLY_LABELS, // Eje X (00:00 - 23:00)
            datasets: [{
                label: labelText,
                data: dataValues,      // Eje Y (Datos de Firebase)
                borderColor: borderColor,
                backgroundColor: bgColor,
                borderWidth: 2,
                tension: 0.4,          // Suavizado de la curva (Curva de Bezier)
                fill: false,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }, // Ocultar leyenda estándar
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: unit } },
                x: { grid: { display: false } }
            }
        }
    });
}