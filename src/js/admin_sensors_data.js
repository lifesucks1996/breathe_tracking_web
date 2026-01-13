/**
 * @file admin_sensors_data.js
 * @brief Archivo de datos simulados (Mock Data) para el panel de administración.
 * @details
 * Este archivo contiene estructuras JSON estáticas que simulan la respuesta
 * de una base de datos. Se utiliza para poblar las tablas de sensores y
 * las vistas de detalle sin necesidad de conexión activa al backend durante el desarrollo de la UI.
 */

/**
 * @brief Lista principal de sensores registrados en el sistema.
 * (void) -> adminSensorsData -> Array<Object>
 * * @details
 * Array de objetos donde cada elemento representa un sensor físico.
 * Contiene información básica para el listado general (ID, nombre, ubicación, estado).
 * Incluye sensores activos e inactivos para probar diferentes estados de la interfaz.
 * * @note
 * El campo 'coords' sigue el formato [Latitud, Longitud] compatible con Leaflet.
 * El campo 'hasIncident' determina si se muestra una alerta visual en la tabla.
 */
const adminSensorsData = [
    // --- SENSORES ACTIVOS ---
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
        active: false, // Propiedad específica para marcar sensores fuera de servicio
        coords: [38.9600, -0.1900]
    },
    {
        id: 'OLD_00',
        name: 'Sensor OLD_00',
        location: 'Grao de Gandia (Zona Norte)',
        lastConnection: 'Sin señal',
        hasIncident: false,
        active: false, // Inactivo
        coords: [38.9950, -0.1550]
    }
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