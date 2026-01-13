/**
 * @file admin_sensors_data.js
 * @brief Generación de datos simulados (Mock Data) para el Frontend.
 * @details
 * Este archivo simula la estructura de datos que normalmente vendría de Firebase.
 * Se utiliza para desarrollo y pruebas de carga en la interfaz (UI).
 * * Contiene:
 * - 7 Sensores "Reales" estáticos.
 * - 200 Sensores simulados generados algorítmicamente.
 * - Lógica para simular estados (Conectado, Alerta, Desconectado) y fechas pasadas.
 *
 * @note Este script replica el comportamiento del script de Python de carga masiva.
 * @version 2.1
 * @author Breathe Tracking Team
 */

/**
 * @brief Latitud base para la generación de coordenadas (Gandía, España).
 * @const {number}
 */
const LAT_BASE = 38.9660;

/**
 * @brief Longitud base para la generación de coordenadas (Gandía, España).
 * @const {number}
 */
const LNG_BASE = -0.1850;

/**
 * @brief Radio de dispersión en grados para los sensores aleatorios (~5km).
 * @const {number}
 */
const RADIO_VARIACION = 0.05; 

/**
 * @brief Lista de ubicaciones textuales para asignar nombres realistas.
 * @const {Array<string>}
 */
const UBICACIONES_GANDIA = [ 
    "C/ Gandia, Centro", "Av. del Cid, Gandia", "Plaza Mayor, Gandia", 
    "Polígono Industrial, Gandia", "Puerto de Gandia", "Grao de Gandia", 
    "Playa de Gandia", "Parque de la Estación", "C/ San Francisco de Borja" 
];

/**
 * @brief Genera un par de coordenadas aleatorias alrededor del punto base.
 * @return {Array<number>} Array [Latitud, Longitud].
 */
function generarCoordenadas() {
    const varLat = (Math.random() - 0.5) * 2 * RADIO_VARIACION;
    const varLng = (Math.random() - 0.5) * 2 * RADIO_VARIACION;
    return [ Math.round((LAT_BASE + varLat) * 10000) / 10000, Math.round((LNG_BASE + varLng) * 10000) / 10000 ];
}

/**
 * @brief Genera una cadena de fecha ISO en el pasado.
 * @details Útil para simular sensores que llevan tiempo desconectados y probar el ordenamiento.
 * @param {number} diasAtras - Número de días a restar a la fecha actual.
 * @return {string} Fecha en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss).
 */
function generarFechaPasada(diasAtras) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasAtras);
    // Formato ISO similar al de tu script Python
    return fecha.toISOString().split('T')[0] + "T10:00:00"; 
}

/**
 * @brief Genera el array masivo de sensores simulados.
 * @details
 * Crea 200 sensores divididos en dos grupos:
 * 1. 180 Sensores Activos (Conectados o con Alerta).
 * 2. 20 Sensores Inactivos (Desconectados con fechas antiguas).
 * * Asigna propiedades clave (`active`, `estado`, `hasIncident`) compatibles con los filtros del admin.
 * @return {Array<Object>} Array de objetos sensor.
 */
function generarSensoresSimulados() {
    const sensores = [];
    
    // 1. Simulación del bloque masivo (Normales e Incidencias) - Como tu script Python
    for (let i = 1; i <= 180; i++) {
        const num = String(i).padStart(3, '0');
        const esIncidencia = Math.random() < 0.15; // 15% incidencia
        
        sensores.push({
            id: `SENSOR_${num}`,
            name: `Sensor ${num}`,
            location: UBICACIONES_GANDIA[Math.floor(Math.random() * UBICACIONES_GANDIA.length)],
            lastConnection: "2026-01-11T18:30:00", // Hora reciente simulada
            hasIncident: esIncidencia, 
            active: true,
            estado: esIncidencia ? "Alerta" : "Conectado", // Compatible con tu Firebase
            coords: generarCoordenadas()
        });
    }

    // 2. Simulación de INACTIVOS (Para probar tu filtro de fechas)
    // Generamos 20 sensores que llevan desconectados diferentes tiempos
    for (let i = 181; i <= 200; i++) {
        const num = String(i).padStart(3, '0');
        // Aleatorio entre 1 día y 100 días atrás
        const diasInactivo = Math.floor(Math.random() * 100) + 1; 
        
        sensores.push({
            id: `SENSOR_${num}_OFF`,
            name: `Sensor ${num} (OFF)`,
            location: "Almacén Municipal (Retirado)",
            lastConnection: generarFechaPasada(diasInactivo), // FECHA ANTIGUA
            hasIncident: false,
            active: false, 
            estado: "Desconectado", // ESTO ES CLAVE PARA QUE SALGA GRIS
            coords: generarCoordenadas()
        });
    }
    
    return sensores;
}

/**
 * @brief Array principal de datos de sensores.
 * @details
 * Combina los sensores estáticos "reales" con los generados dinámicamente.
 * Es la fuente de verdad si no hay conexión a Firebase.
 * @type {Array<Object>}
 */
const adminSensorsData = [
    // TUS 7 SENSORES REALES (Fijos)
    { id: 'ADS133', name: 'Sensor ADS133', location: 'C/ Gandia', lastConnection: '14:32', hasIncident: false, active: true, estado: 'Conectado', coords: [38.9660, -0.1850] },
    { id: 'AKMSF134', name: 'Sensor AKMSF134', location: 'Av. del Cid', lastConnection: '13:23', hasIncident: true, active: true, estado: 'Alerta', coords: [38.9700, -0.1800] },
    { id: 'LMN789', name: 'Sensor LMN789', location: 'Plaza Mayor 1', lastConnection: '10:05', hasIncident: false, active: true, estado: 'Conectado', coords: [38.9680, -0.1760] },
    { id: 'XYZ001', name: 'Sensor XYZ001', location: 'Polígono Industrial', lastConnection: '09:10', hasIncident: true, active: true, estado: 'Peligro', coords: [38.9550, -0.1950] },
    { id: 'BTH202', name: 'Sensor BTH202', location: 'Puerto de Gandia', lastConnection: '15:10', hasIncident: false, active: true, estado: 'Conectado', coords: [38.9900, -0.1600] },
    { id: 'OFF_99', name: 'Sensor OFF_99', location: 'Almacén Municipal', lastConnection: '2025-11-15T09:00:00', hasIncident: false, active: false, estado: 'Desconectado', coords: [38.9600, -0.1900] },
    { id: 'OLD_00', name: 'Sensor OLD_00', location: 'Grao Zona Norte', lastConnection: '2025-08-20T10:00:00', hasIncident: false, active: false, estado: 'Baja', coords: [38.9950, -0.1550] },

    // AÑADIMOS LOS 200 SIMULADOS
    ...generarSensoresSimulados()
];

/**
 * @brief Datos Mock para la vista de detalle.
 * @details Se utiliza como fallback en admin_sensor_detail.js si no se encuentra el sensor específico.
 * @type {Object}
 */
const sensorDetailData = { 
    id: "AKMSF134", name: "Sensor AKMSF134", lastConnection: "14:35", 
    battery: "20%", currentLocation: "Gandia", 
    pathCoords: [[38.966, -0.185]], point4: { time: "14:35" } 
};
window.sensorDetailData = sensorDetailData;