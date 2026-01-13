/**
 * @file admin_sensor_detail.js
 * Versión simplificada: Dirección estática y una sola línea de ubicación.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
let sensorChart = null;

try {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(firebaseApp);
} catch (error) {
    console.error("Error al inicializar Firebase.", error);
}

const HOURLY_LABELS = Array.from({ length: 24 }, (_, i) => 
    `${i.toString().padStart(2, '0')}:00`
);

document.addEventListener('DOMContentLoaded', () => {
    loadSensorData();
    initDetailMap();
    renderChart('Ozono');

    const select = document.getElementById('activity-contaminant-select');
    if (select) {
        select.addEventListener('change', (e) => {
            renderChart(e.target.value);
        });
    }
});

function initDetailMap() {
    if (!sensorDetailData || !sensorDetailData.pathCoords) return;
    
    // Centramos el mapa en la última coordenada
    const center = sensorDetailData.pathCoords[sensorDetailData.pathCoords.length - 1];
    
    // Inicializamos Leaflet
    const map = L.map('detail-map').setView(center, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const sensorIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="leaflet-marker-icon sensor-marker" style="background-color: var(--primary-dark-blue, #003366); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); font-size: 1.2em;"><i class="fas fa-microchip"></i></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    const currentMarker = L.marker(center, { icon: sensorIcon, draggable: true }).addTo(map);
    currentMarker.bindPopup(`<b>${sensorDetailData.name}</b><br>${sensorDetailData.currentLocation}`).openPopup();
}

function loadSensorData() {
    if (!sensorDetailData) return;
    const data = sensorDetailData;
    
    // Título
    document.getElementById('sensor-detail-title').textContent = data.name;

    // Última conexión (Soluciona el undefined)
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

    // --- UBICACIÓN (MODIFICADO) ---
    // 1. Ponemos la dirección de Gandía inventada
    const curLoc = document.getElementById('current-location');
    if(curLoc) curLoc.textContent = data.currentLocation;
    
    // 2. OCULTAMOS la segunda línea para que no salga repetido ni salga otra ciudad
    const avgLoc = document.getElementById('avg-location');
    if(avgLoc) {
        avgLoc.style.display = 'none'; // Esto la borra visualmente
    }

    // Datos del punto inferior
    const pLoc = document.getElementById('point-location-text');
    if(pLoc && data.point4) pLoc.textContent = data.point4.location;
    
    const pTime = document.getElementById('point-time');
    if(pTime && data.point4) pTime.textContent = `Hora: ${data.point4.time}`;
}

// --- Gráfico (Sin cambios) ---

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

async function renderChart(contaminantType) {
    const ctx = document.getElementById('activityChart')?.getContext('2d');
    if (!ctx) return; 

    let dataValues = [];
    let unit = '';
    let labelText = `Nivel de ${contaminantType}`;
    let borderColor = '#95a5a6'; 
    
    const queryType = mapContaminantToId(contaminantType);
    
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
    
    if (dataValues.length !== HOURLY_LABELS.length) {
        dataValues = HOURLY_LABELS.map(() => null); 
    }

    if (sensorChart) sensorChart.destroy();

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