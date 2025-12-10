// src/js/admin_sensors.js

let map;
let markers = [];
const sensorsContainer = document.getElementById('sensors-container');
const activityFilter = document.getElementById('activityFilter');

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    // Renderizamos la lista inicial (Filtrada por defecto o Todos)
    renderSensorsList(adminSensorsData);

    // Escuchar cambios en el selector
    activityFilter.addEventListener('change', filterSensors);
});

function initMap() {
    map = L.map('admin-map').setView([38.9660, -0.1850], 13); // Centrado en Gandia
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    addSensorMarkers(adminSensorsData);
}

function addSensorMarkers(sensors) {
    // 1. Limpiar marcadores existentes del mapa
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // 2. Añadir nuevos marcadores
    sensors.forEach(sensor => {
        // --- LÓGICA DE ESTILOS DEL MARCADOR ---
        let cssClass = 'sensor-marker'; // Azul (Default)
        let popupStatus = 'Estado: OK';
        let popupColor = 'black';

        // Si está INACTIVO (Prioridad visual: Gris)
        if (sensor.active === false) {
            cssClass = 'sensor-marker sensor-marker-inactive'; // Necesitarás este CSS, o usaremos estilo inline
            popupStatus = 'Inactivo / Desconectado';
            popupColor = '#999';
        } 
        // Si tiene INCIDENCIA (Prioridad visual: Rojo)
        else if (sensor.hasIncident) {
            cssClass = 'sensor-marker sensor-marker-incident';
            popupStatus = '⚠ Incidencia detectada';
            popupColor = 'red';
        }
        
        // Estilo inline para el GRIS de los inactivos si no tienes la clase CSS creada
        const styleInactive = (sensor.active === false) ? 'background-color: #999; border-color: #ccc;' : '';

        // Crear icono personalizado
        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="leaflet-marker-icon ${cssClass}" style="${styleInactive}"><i class="fas fa-microchip"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker(sensor.coords, { icon: customIcon }).addTo(map);
        
        // Popup
        marker.bindPopup(`
            <div style="text-align:center;">
                <b>${sensor.name}</b><br>
                <span style="color:${popupColor}; font-weight:bold;">${popupStatus}</span>
            </div>
        `);

        markers.push(marker);
    });
}

function renderSensorsList(sensors) {
    sensorsContainer.innerHTML = ''; // Limpiar lista

    if (!sensors || sensors.length === 0) {
        sensorsContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">No se encontraron sensores con este filtro.</p>';
        return;
    }

    sensors.forEach(sensor => {
        // --- LÓGICA DE VISUALIZACIÓN DE LA TARJETA ---
        const item = document.createElement('div');
        
        // Clases dinámicas
        let itemClass = 'sensor-item';
        if (sensor.hasIncident) itemClass += ' incident';
        if (sensor.active === false) itemClass += ' inactive'; // Clase CSS que añadimos antes

        item.className = itemClass;
        
        // Icono dinámico
        let iconClass = 'fa-broadcast-tower';
        if (sensor.hasIncident) iconClass = 'fa-exclamation-triangle';
        if (sensor.active === false) iconClass = 'fa-ban'; // Icono de prohibido/apagado

        // Texto de estado
        let statusText = '';
        if (sensor.hasIncident) {
            statusText = '<p style="color:#ff4d4f; font-weight:bold; font-size:0.8em;">⚠ Fallo de conexión</p>';
        } else if (sensor.active === false) {
            statusText = '<p style="color:#999; font-weight:bold; font-size:0.8em;">● Desconectado</p>';
        }

        // Etiqueta de Inactivo en el título
        const inactiveTag = (sensor.active === false) 
            ? '<span style="font-size:0.7em; background:#ddd; color:#666; padding:2px 5px; border-radius:4px; margin-left:5px;">Inactivo</span>' 
            : '';

        // HTML INTERNO
        item.innerHTML = `
            <div class="sensor-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="sensor-info">
                <h4>${sensor.name} ${inactiveTag}</h4>
                <p>${sensor.location}</p>
                <p class="last-conn">Última conex: ${sensor.lastConnection}</p>
                ${statusText}
            </div>
            <div class="actions">
                <button class="button-report" onclick="goToDetail('${sensor.id}')" ${sensor.active === false ? 'style="background-color:#999;"' : ''}>
                    ${sensor.active === false ? 'Histórico' : 'Ver Informe'}
                </button>
            </div>
        `;

        // Efecto hover simple para debug (opcional)
        item.addEventListener('mouseenter', () => {
            // Aquí podrías hacer que el marcador salte en el mapa
        });

        sensorsContainer.appendChild(item);
    });
}

// --- FUNCIÓN DE FILTRADO PRINCIPAL ---
function filterSensors() {
    const filterValue = activityFilter.value;
    
    let filteredData = [];

    if (filterValue === 'all') {
        // Mostrar TODOS (Activos, Inactivos e Incidencias)
        filteredData = adminSensorsData;
    } 
    else if (filterValue === 'incident') {
        // Solo los que tienen incidencia (y suelen estar activos, aunque tengan fallo)
        filteredData = adminSensorsData.filter(s => s.hasIncident === true);
    } 
    else if (filterValue === 'inactive') {
        // Solo los marcados como active: false
        filteredData = adminSensorsData.filter(s => s.active === false);
    }

    // Renderizar de nuevo con los datos filtrados
    renderSensorsList(filteredData);
    addSensorMarkers(filteredData);
}

// Navegación a detalle
window.goToDetail = function(sensorId) {
    window.location.href = 'admin_sensor_detail.html';
};