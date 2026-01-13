/**
 * @file official_stations.js
 * @brief Gestión de estaciones oficiales de calidad del aire.
 * @details
 * Este script se conecta a la API pública de WAQI (World Air Quality Index)
 * para obtener datos de estaciones oficiales cercanas y las dibuja en el mapa.
 * Incluye:
 * - Detección de movimiento del mapa para recargar estaciones.
 * - Renderizado de iconos personalizados con el color del AQI.
 * - Popups interactivos que piden datos detallados bajo demanda.
 *
 * @requires Leaflet.js - Para dibujar marcadores y popups.
 * @version 1.2
 * @author Breathe Tracking Team
 */

/**
 * @brief Token de acceso a la API de WAQI.
 * @const {string}
 */
const WAQI_TOKEN = '59f20eb8c12bcdf627a18f8c3daea9a9abb4fc2c'; 

/**
 * @brief Grupo de capas (LayerGroup) para agrupar los marcadores de estaciones.
 * @type {L.LayerGroup|null}
 */
let capaEstaciones = null; 

/**
 * @brief Inicializa el sistema de estaciones oficiales en el mapa proporcionado.
 * @details
 * 1. Crea la capa `capaEstaciones` y la añade al mapa.
 * 2. Carga las estaciones visibles inicialmente.
 * 3. Configura un listener `moveend` para recargar estaciones al mover el mapa (con debounce de 1s).
 *
 * @param {L.Map} mapa - Instancia del mapa Leaflet donde se pintarán las estaciones.
 */
function inicializarEstacionesOficiales(mapa) {
    if (!mapa) return; // Validación de seguridad
    
    console.log(" Iniciando sistema de estaciones oficiales...");

    // Crear grupo de capas para gestión eficiente
    capaEstaciones = L.layerGroup().addTo(mapa);
    
    // Carga inicial
    cargarEstaciones(mapa);

    // Configuración del listener con debounce (retraso)
    let timeout;
    mapa.on('moveend', () => {
        // Limpia el timeout anterior para evitar peticiones múltiples
        clearTimeout(timeout);
        // Espera 1 segundo de inactividad antes de recargar
        timeout = setTimeout(() => cargarEstaciones(mapa), 1000);
    });
}

/**
 * @brief Consulta la API de WAQI para obtener estaciones dentro de los límites visibles.
 * @details
 * Obtiene los bounds (Norte, Sur, Este, Oeste) del mapa y construye la URL de consulta.
 * Si la respuesta es exitosa, llama a `dibujarEstacionesComoIconos`.
 *
 * @param {L.Map} mapa - Instancia del mapa para obtener los límites (bounds).
 * @async
 */
async function cargarEstaciones(mapa) {
    // Obtener límites visibles
    const bounds = mapa.getBounds();
    const lat1 = bounds.getSouth();
    const lng1 = bounds.getWest();
    const lat2 = bounds.getNorth();
    const lng2 = bounds.getEast();

    console.log(` Consultando estaciones...`);

    // Construcción de URL geo-restringida
    const url = `https://api.waqi.info/map/bounds/?latlng=${lat1},${lng1},${lat2},${lng2}&token=${WAQI_TOKEN}`;

    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        if (datos.status === 'ok') {
            console.log(` Estaciones encontradas: ${datos.data.length}`);
            dibujarEstacionesComoIconos(datos.data);
        } else {
            console.warn(" API WAQI Error:", datos.data);
        }
    } catch (error) {
        console.error(" Error conectando con estaciones:", error);
    }
}

/**
 * @brief Renderiza las estaciones recibidas como iconos en el mapa.
 * @details
 * 1. Limpia los marcadores antiguos de `capaEstaciones`.
 * 2. Itera sobre cada estación recibida.
 * 3. Crea un `L.divIcon` personalizado con el color correspondiente al AQI.
 * 4. Añade un tooltip y un evento click para ver detalles.
 *
 * @param {Array<Object>} estaciones - Lista de estaciones devuelta por la API.
 */
function dibujarEstacionesComoIconos(estaciones) {
    // Limpieza previa
    capaEstaciones.clearLayers(); 

    estaciones.forEach(est => {
        // Filtrar estaciones sin datos validos
        if (est.aqi === '-') return; 

        const valorAQI = parseInt(est.aqi);
        const colorFondo = obtenerColorAQI(valorAQI);

        // Icono HTML personalizado
        const iconoOficial = L.divIcon({
            className: '', // Sin clases por defecto de Leaflet
            html: `
                <div class="station-icon-marker" style="background-color: ${colorFondo}; width: 30px; height: 30px;">
                    <i class="fas fa-broadcast-tower"></i>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -20]
        });

        // Creación del marcador
        const marker = L.marker([est.lat, est.lon], { 
            icon: iconoOficial,
            zIndexOffset: 1000 // Prioridad visual alta
        });

        // Tooltip básico (hover)
        marker.bindTooltip(`
            <div style="text-align:center">
                <strong>${est.station.name}</strong><br>
                Estación Oficial<br>
                AQI: ${est.aqi}
            </div>
        `, { direction: 'top', offset: [0, -20] });

        // Evento Click: Cargar detalles
        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e); // Evitar propagación al mapa
            mostrarPopupDetalle(est, marker);
        });

        capaEstaciones.addLayer(marker);
    });
}

/**
 * @brief Carga y muestra los detalles completos de una estación en un popup.
 * @details
 * Realiza una segunda petición a la API usando el UID de la estación para obtener
 * desglose de contaminantes (PM2.5, PM10, O3, etc.) y metadatos.
 *
 * @param {Object} estacionResumen - Datos básicos de la estación (incluye UID).
 * @param {L.Marker} marker - El marcador sobre el cual abrir el popup.
 * @async
 */
async function mostrarPopupDetalle(estacionResumen, marker) {
    const popupOptions = {
        autoPan: false, // Evita mover el mapa para no disparar recargas
        className: 'official-popup-container'
    };

    // Popup temporal de carga
    marker.bindPopup('<div style="padding:10px; text-align:center; color:#5BA3F5"><i class="fas fa-spinner fa-spin"></i> Conectando...</div>', popupOptions).openPopup();

    // URL de detalle por UID
    const url = `https://api.waqi.info/feed/@${estacionResumen.uid}/?token=${WAQI_TOKEN}`;

    try {
        const res = await fetch(url);
        const json = await res.json();

        if (json.status === 'ok') {
            const d = json.data;
            const iaqa = d.iaqi;
            
            // Diccionario de traducción de contaminantes
            const nombres = {
                pm25: "PM 2.5", pm10: "PM 10", o3: "Ozono (O₃)", 
                no2: "NO₂", so2: "SO₂", co: "CO",
                t: "Temp.", h: "Humedad", w: "Viento", p: "Presión"
            };

            // Generación de lista HTML
            let listadoHtml = '';
            for (const [key, val] of Object.entries(iaqa)) {
                if (nombres[key]) {
                    listadoHtml += `
                        <li>
                            <span class="gas-name">${nombres[key]}</span>
                            <span class="gas-value">${val.v}</span>
                        </li>`;
                }
            }

            // Construcción del HTML final
            const html = `
                <div class="official-popup">
                    <div class="popup-header" style="background-color: ${obtenerColorAQI(d.aqi)}">
                        <span class="city-name">${d.city.name.split(',')[0]}</span>
                        <span class="aqi-badge">AQI ${d.aqi}</span>
                    </div>
                    <div class="popup-body">
                        <div class="last-update">
                            <i class="fas fa-clock"></i> Hora: ${d.time.s.substring(11, 16)}
                        </div>
                        <ul class="pollutant-list">
                            ${listadoHtml || '<li>Datos generales solo</li>'}
                        </ul>
                        <div class="popup-footer">
                            Fuente: ${d.attributions[0]?.name || 'GVA'}
                        </div>
                    </div>
                </div>
            `;
            marker.setPopupContent(html);
        }
    } catch (e) {
        marker.setPopupContent('Error de conexión.');
    }
}

/**
 * @brief Devuelve un color hexadecimal según el nivel de AQI.
 * @details
 * - 0-50: Verde (Bueno)
 * - 51-100: Amarillo (Moderado)
 * - 101-150: Naranja (Insalubre para grupos sensibles)
 * - 151-200: Rojo (Insalubre)
 * - 201-300: Morado (Muy insalubre)
 * - >300: Granate (Peligroso)
 *
 * @param {number} aqi - Índice de Calidad del Aire.
 * @return {string} Color en formato Hex.
 */
function obtenerColorAQI(aqi) {
    if (aqi <= 50) return "#009966"; 
    if (aqi <= 100) return "#ffde33"; 
    if (aqi <= 150) return "#ff9933"; 
    if (aqi <= 200) return "#cc0033"; 
    if (aqi <= 300) return "#660099";
    return "#7e0023"; 
}

// Exposición global para acceso desde otros scripts
window.inicializarEstacionesOficiales = inicializarEstacionesOficiales;