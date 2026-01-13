/**
 * @file official_stations.js
 * Script para gestionar las estaciones oficiales de calidad del aire.
 * Se conecta a la API de WAQI y dibuja los marcadores en el mapa.
 */

// TOKEN de WAQI
const WAQI_TOKEN = '59f20eb8c12bcdf627a18f8c3daea9a9abb4fc2c'; 

// Variable global para guardar la capa de marcadores y poder limpiarla luego
let capaEstaciones = null; 

// Funcion de inicio que se llama desde el mapa principal
function inicializarEstacionesOficiales(mapa) {
    if (!mapa) return; // Si no hay mapa, no hago nada
    
    console.log(" Iniciando sistema de estaciones oficiales...");

    // Creo un grupo de capas de Leaflet para meter aqui todos los iconos
    capaEstaciones = L.layerGroup().addTo(mapa);
    
    // Llamo a la funcion para cargar las estaciones nada mas empezar
    cargarEstaciones(mapa);

    // Esto es para actualizar las estaciones cuando el usuario mueve el mapa
    let timeout;
    mapa.on('moveend', () => {
        // Limpio el timeout anterior para no hacer peticiones a lo loco
        clearTimeout(timeout);
        // Espero 1 segundo despues de que termine de mover para recargar
        timeout = setTimeout(() => cargarEstaciones(mapa), 1000);
    });
}

// Funcion asincrona para pedir los datos a la API
async function cargarEstaciones(mapa) {
    // Obtengo los limites visibles del mapa (las 4 esquinas)
    const bounds = mapa.getBounds();
    const lat1 = bounds.getSouth();
    const lng1 = bounds.getWest();
    const lat2 = bounds.getNorth();
    const lng2 = bounds.getEast();

    console.log(` Consultando estaciones...`);

    // Construyo la URL con las coordenadas para pedir solo las estaciones de esa zona
    const url = `https://api.waqi.info/map/bounds/?latlng=${lat1},${lng1},${lat2},${lng2}&token=${WAQI_TOKEN}`;

    try {
        // Hago la peticion fetch
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        // Si la API me dice que todo ok, dibujo los iconos
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
 * Recorre los datos recibidos y crea un marcador para cada estacion
 */
function dibujarEstacionesComoIconos(estaciones) {
    // Primero borro los marcadores antiguos para que no se dupliquen
    capaEstaciones.clearLayers(); 

    estaciones.forEach(est => {
        // Si el valor AQI es un guion significa que no hay datos, asi que me salto esta estacion
        if (est.aqi === '-') return; 

        const valorAQI = parseInt(est.aqi);
        // Calculo el color (verde, amarillo, rojo...) segun la contaminacion
        const colorFondo = obtenerColorAQI(valorAQI);

        // Creo un icono personalizado con HTML para que sea cuadrado y tenga el color correspondiente
        const iconoOficial = L.divIcon({
            className: '', // Lo dejo vacio para quitar estilos por defecto de Leaflet
            html: `
                <div class="station-icon-marker" style="background-color: ${colorFondo}; width: 30px; height: 30px;">
                    <i class="fas fa-broadcast-tower"></i>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -20]
        });

        // Creo el marcador en las coordenadas de la estacion
        const marker = L.marker([est.lat, est.lon], { 
            icon: iconoOficial,
            zIndexOffset: 1000 // Le pongo un zIndex alto para que se vea por encima de otros elementos
        });

        // Añado un tooltip sencillo que sale al pasar el raton
        marker.bindTooltip(`
            <div style="text-align:center">
                <strong>${est.station.name}</strong><br>
                Estación Oficial<br>
                AQI: ${est.aqi}
            </div>
        `, { direction: 'top', offset: [0, -20] });

        // Añado el evento click para abrir el popup con detalles
        marker.on('click', (e) => {
            // Esto es importante: evita que el click atraviese el marcador y mueva el mapa
            L.DomEvent.stopPropagation(e); 
            mostrarPopupDetalle(est, marker);
        });

        // Finalmente añado el marcador a la capa
        capaEstaciones.addLayer(marker);
    });
}

// Funcion para pedir datos detallados de una estacion concreta al hacer click
async function mostrarPopupDetalle(estacionResumen, marker) {
    // Desactivo autoPan para que el mapa no se mueva solo al abrir el popup,
    // porque si se mueve dispara el evento 'moveend' y recarga todo otra vez
    const popupOptions = {
        autoPan: false,
        className: 'official-popup-container'
    };

    // Pongo un mensaje de carga temporal en el popup
    marker.bindPopup('<div style="padding:10px; text-align:center; color:#5BA3F5"><i class="fas fa-spinner fa-spin"></i> Conectando...</div>', popupOptions).openPopup();

    // URL para pedir los datos especificos de esa estacion usando su UID
    const url = `https://api.waqi.info/feed/@${estacionResumen.uid}/?token=${WAQI_TOKEN}`;

    try {
        const res = await fetch(url);
        const json = await res.json();

        if (json.status === 'ok') {
            const d = json.data;
            const iaqa = d.iaqi;
            
            // Diccionario para traducir las claves de la API a nombres legibles
            const nombres = {
                pm25: "PM 2.5", pm10: "PM 10", o3: "Ozono (O₃)", 
                no2: "NO₂", so2: "SO₂", co: "CO",
                t: "Temp.", h: "Humedad", w: "Viento", p: "Presión"
            };

            // Recorro los datos de contaminantes y genero la lista HTML
            let listadoHtml = '';
            for (const [key, val] of Object.entries(iaqa)) {
                // Solo muestro el dato si tengo su traduccion en el diccionario
                if (nombres[key]) {
                    listadoHtml += `
                        <li>
                            <span class="gas-name">${nombres[key]}</span>
                            <span class="gas-value">${val.v}</span>
                        </li>`;
                }
            }

            // Construyo todo el HTML del popup con los datos reales
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
            // Actualizo el contenido del popup
            marker.setPopupContent(html);
        }
    } catch (e) {
        marker.setPopupContent('Error de conexión.');
    }
}

// Funcion auxiliar para elegir el color segun el nivel de AQI
function obtenerColorAQI(aqi) {
    if (aqi <= 50) return "#009966"; 
    if (aqi <= 100) return "#ffde33"; 
    if (aqi <= 150) return "#ff9933"; 
    if (aqi <= 200) return "#cc0033"; 
    if (aqi <= 300) return "#660099";
    return "#7e0023"; }

// Hago publica la funcion de inicio para poder usarla en otros archivos
window.inicializarEstacionesOficiales = inicializarEstacionesOficiales;