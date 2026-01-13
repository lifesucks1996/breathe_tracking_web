/**
 * @file admin_sensors_data.js
 * @brief Archivo de datos simulados (Mock Data) para el panel de administración.
 * @details
 * Este archivo contiene estructuras JSON estáticas que simulan la respuesta
 * de una base de datos. Se utiliza para poblar las tablas de sensores y
 * las vistas de detalle sin necesidad de conexión activa al backend durante el desarrollo de la UI.
 * 
 * INCLUYE: 7 sensores reales + 200 sensores simulados para prueba de carga.
 */

// ============================================================================
// CONFIGURACIÓN PARA GENERACIÓN DE SENSORES SIMULADOS
// ============================================================================

// Centro de Gandía, Valencia, España
const LAT_BASE = 38.9660;
const LNG_BASE = -0.1850;
const RADIO_VARIACION = 0.05; // ~5km de dispersión

// Ubicaciones reales en Gandía
const UBICACIONES_GANDIA = [
    "C/ Gandia, Centro",
    "Av. del Cid, Gandia",
    "Plaza Mayor, Gandia",
    "Polígono Industrial, Gandia",
    "Puerto de Gandia",
    "Grao de Gandia",
    "Barrio de Marítimo",
    "Av. de la República",
    "C/ Mayor, Centro",
    "Paseo Marítimo",
    "Playa Centro",
    "C/ Acacias",
    "Av. Valencia",
    "Zona Portuaria",
    "C/ San Vicente Ferrer",
    "Parque de la Paz",
    "Av. Maestrazgo",
    "C/ Blasco Ibáñez",
    "Zona Comercial Centro",
    "Barrio Nuevo",
    "C/ León",
    "Av. Peris i Valero",
    "Playa Norte",
    "C/ Zorrilla",
    "Av. Carlos Sarthou"
];

// Función para generar coordenadas aleatorias
function generarCoordenadas() {
    const varLat = (Math.random() - 0.5) * 2 * RADIO_VARIACION;
    const varLng = (Math.random() - 0.5) * 2 * RADIO_VARIACION;
    return [
        Math.round((LAT_BASE + varLat) * 10000) / 10000,
        Math.round((LNG_BASE + varLng) * 10000) / 10000
    ];
}

// Función para generar última conexión (formato HH:MM realista)
function generarUltimaConexion() {
    const ahora = new Date();
    const minutosAtras = Math.floor(Math.random() * 720); // 0-720 minutos (12 horas)
    const fecha = new Date(ahora.getTime() - minutosAtras * 60000);
    
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    
    return `${horas}:${minutos}`;
}

// Función para generar 200 sensores simulados
function generarSensoresSimulados() {
    const sensores = [];
    
    for (let i = 1; i <= 200; i++) {
        const numeroSensor = String(i).padStart(3, '0');
        const tieneIncidente = Math.random() < 0.15; // 15% con incidentes
        
        sensores.push({
            id: `SENSOR_${numeroSensor}`,
            name: `Sensor ${numeroSensor}`,
            location: UBICACIONES_GANDIA[Math.floor(Math.random() * UBICACIONES_GANDIA.length)],
            lastConnection: generarUltimaConexion(),
            hasIncident: tieneIncidente,
            coords: generarCoordenadas()
        });
    }
    
    return sensores;
}

/**
 * @brief Lista principal de sensores registrados en el sistema.
 * (void) -> adminSensorsData -> Array<Object>
 * 
 * ESTRUCTURA: 7 sensores reales + 200 sensores simulados
 * 
 * @details
 * Array de objetos donde cada elemento representa un sensor físico.
 * Contiene información básica para el listado general (ID, nombre, ubicación, estado).
 * Incluye sensores activos e inactivos para probar diferentes estados de la interfaz.
 * 
 * @note
 * El campo 'coords' sigue el formato [Latitud, Longitud] compatible con Leaflet.
 * El campo 'hasIncident' determina si se muestra una alerta visual en la tabla.
 */
const adminSensorsData = [
    // --- SENSORES REALES (7 sensores originales) ---
    {
        id: 'ADS133',
        name: 'Sensor ADS133',
        location: 'C/ Gandia, Gandia',
        lastConnection: '14:32',
        hasIncident: false, // Estado normal
        coords: [38.9660, -0.1850]
    },
    {
        id: 'AKMSF134',
        name: 'Sensor AKMSF134',
        location: 'Av. del Cid 8, Gandia',
        lastConnection: '13:23',
        hasIncident: true, // Simulación de incidencia activa (alerta roja)
        coords: [38.9700, -0.1800]
    },
    {
        id: 'LMN789',
        name: 'Sensor LMN789',
        location: 'Plaza Mayor 1, Gandia',
        lastConnection: '10:05',
        hasIncident: false,
        coords: [38.9680, -0.1760]
    },
    {
        id: 'XYZ001',
        name: 'Sensor XYZ001',
        location: 'Polígono Industrial, Gandia',
        lastConnection: '09:10',
        hasIncident: true,
        coords: [38.9550, -0.1950]
    },
    {
        id: 'BTH202',
        name: 'Sensor BTH202',
        location: 'Puerto de Gandia, Gandia',
        lastConnection: '15:10',
        hasIncident: false,
        coords: [38.9900, -0.1600]
    },
    // --- SENSORES INACTIVOS (Para pruebas de filtrado) ---
    {
        id: 'OFF_99',
        name: 'Sensor OFF_99',
        location: 'Almacén Municipal',
        lastConnection: 'Hace 12 días',
        hasIncident: false,
        active: false,
        coords: [38.9600, -0.1900]
    },
    {
        id: 'OLD_00',
        name: 'Sensor OLD_00',
        location: 'Grao de Gandia (Zona Norte)',
        lastConnection: 'Sin señal',
        hasIncident: false,
        active: false,
        coords: [38.9950, -0.1550]
    },
    
    // --- SENSORES SIMULADOS (200 sensores para prueba de carga) ---
    ...generarSensoresSimulados()
];

/**
 * @brief Datos detallados de un sensor específico para la vista de detalle.
 * (void) -> sensorDetailData -> Object
 * * @details
 * Objeto singular que simula la información completa recuperada al hacer clic en un sensor.
 * Contiene métricas específicas como batería, lecturas de gases (Ozono, CO2) y 
 * el historial de ruta para pintar en el mapa.
 * * @note
 * El objeto 'point4' representa el último punto de medición recibido.
 * El array 'pathCoords' se usa para dibujar la polilínea de recorrido en el mapa.
 */
const sensorDetailData = {
    id: "AKMSF134",
    name: "Sensor AKMSF134",
    // Hora fija para que no salga undefined
    lastConnection: "14:35", 
    battery: "20%",
    
    // AQUÍ LA DIRECCIÓN INVENTADA DE GANDÍA (Solo saldrá esta)
    currentLocation: "Passeig Marítim de Neptú, 32, Gandía", 
    
    // Dejamos esto vacío para que no moleste
    avgLocation: "",
    
    // Coordenadas (pueden ser cualquiera, solo afectan a dónde pinta el punto en el mapa)
    pathCoords: [
        [38.995, -0.165], // Coordenadas aprox de Gandia
        [38.996, -0.166],
        [38.997, -0.167] 
    ],

    // Datos para el bloque de mediciones
    point4: {
        time: "14:35"
    }
};

window.sensorDetailData = sensorDetailData;