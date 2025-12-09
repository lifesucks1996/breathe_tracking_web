/**
 * @file users_map_data.js
 * @author Marc Vilagrosa
 * @date 2025
 * @brief Gestión de datos del mapa: descarga desde Firebase, normalización,
 *        escalado dinámico por gas, cálculo de gradientes y utilidades para
 *        interpolación de contaminación.
 *
 * Este archivo contiene toda la lógica relacionada con:
 *  - Inicialización de Firebase
 *  - Autenticación anónima
 *  - Obtención dinámica de configuraciones por tipo de gas
 *  - Descarga de mapas diarios
 *  - Normalización de valores para generar intensidades adecuadas para el heatmap
 *  - Cálculo del gradiente según niveles definidos en Firestore
 *  - Interpolación de contaminación alrededor de un punto
 */

// ========================= 1. CONFIGURACIÓN GLOBAL =========================
/**
 * @brief Carga la configuración de Firebase. Si existe una variable global
 *        `__firebase_config` la utiliza, de lo contrario aplica valores por defecto.
 */
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "PON_TU_API_KEY_AQUI",
    authDomain: "biometria-g3.firebaseapp.com",
    projectId: "biometria-g3",
    storageBucket: "biometria-g3.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

let db = null;
let auth = null;
let globalDatosCache = []; // Datos reales para pines e interpolación

// ========================= 2. INICIALIZAR FIREBASE =========================
/**
 * @brief Inicializa Firebase solo si no existe una instancia previa.
 */
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        auth = firebase.auth();
        console.log("✅ Firebase Data: Inicializado.");
    } catch (e) {
        console.error("❌ Error inicializando Firebase:", e);
    }
}

// ========================= 3. LOGIN ANÓNIMO =========================
/**
 * @brief Realiza autenticación anónima y ejecuta un callback cuando está listo.
 * @param {Function} alEstarListo Función que recibe el usuario autenticado.
 */
window.inicializarFirebase = function(alEstarListo) {
    if (!auth) return;
    auth.signInAnonymously().then((cred) => {
        if (alEstarListo) alEstarListo(cred.user);
    }).catch(e => console.error("Error Auth:", e));
};

// ========================= 4. OBTENCIÓN DE DATOS DEL SENSOR =========================
/**
 * @brief Descarga datos del sensor desde Firestore, calcula la escala dinámica
 *        para el gas seleccionado y normaliza puntos para el heatmap.
 *
 * @param {string} fechaISO Fecha seleccionada (dd-mm-yyyy).
 * @param {string} tipoGas Identificador del gas (CO, NO2, SO2...).
 * @return {Object} Contiene:
 *   - puntos: Lista normalizada [lat, lng, intensidad]
 *   - gradiente: Colores procesados desde Firestore
 *   - unidad: Unidad de medida del gas
 */
window.obtenerDatosDelSensor = async function(fechaISO, tipoGas) {
    const partes = fechaISO.split('-');
    const fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;

    const idDocumentoMapa = `${tipoGas}_${fechaFormateada}`;
    const idDocumentoConfig = tipoGas;

    console.log(`Buscando configuración para gas: ${tipoGas}`);

    try {
        let configGradiente = null;
        let unidad = "ppm";
        let maximoEscala = 100;

        // ---------- A) LEER CONFIGURACIÓN DEL GAS ----------
        try {
            const docConfig = await db.collection("Tipo_Gas").doc(idDocumentoConfig).get();
            if (docConfig.exists) {
                const data = docConfig.data();

                if (data.Umbrales?.Unidad) unidad = data.Umbrales.Unidad;

                if (data.Umbrales?.niveles) {
                    const niveles = data.Umbrales.niveles;
                    configGradiente = procesarColoresDeBBDD(niveles);
                    maximoEscala = calcularMaximoDeLaBBDD(niveles);
                    console.log(`Escala calculada para ${tipoGas}: 0 - ${maximoEscala} ${unidad}`);
                }
            }
        } catch (err) {
            console.warn("Error leyendo config del gas, usando valores por defecto.");
        }

        // ---------- B) LEER LOS DATOS DEL MAPA DIARIO ----------
        const docMapa = await db.collection("Mapas_Diarios").doc(idDocumentoMapa).get();

        if (!docMapa.exists) {
            console.warn(`No hay mapa para ${idDocumentoMapa}`);
            globalDatosCache = [];
            return { puntos: [], gradiente: configGradiente, unidad };
        }

        const dataMapa = docMapa.data();
        const arrayPuntos = dataMapa.Puntos_array || [];

        // ---------- C) NORMALIZAR VALORES PARA EL HEATMAP ----------
        const puntosProcesados = arrayPuntos.map(p => {
            let valorReal = parseFloat(p.valor);
            let intensidad = Math.min(valorReal / maximoEscala, 1.0);
            return [parseFloat(p.lat), parseFloat(p.lng), intensidad];
        });

        globalDatosCache = arrayPuntos.map(p => [parseFloat(p.lat), parseFloat(p.lng), parseFloat(p.valor)]);

        return {
            puntos: puntosProcesados,
            gradiente: configGradiente,
            unidad
        };

    } catch (error) {
        console.error("Error general:", error);
        return { puntos: [], gradiente: null, unidad: "ppm" };
    }
};

// ========================= 5. FUNCIÓN AUXILIAR: MÁXIMO EN NIVELES =========================
/**
 * @brief Obtiene el valor máximo entre los niveles de umbrales.
 * @param {Array} niveles Lista de niveles con min/max/color.
 * @return {number} Máximo encontrado o 100 si no hay datos válidos.
 */
function calcularMaximoDeLaBBDD(niveles) {
    let maximo = 0;
    niveles.forEach(nivel => {
        if (nivel.max > maximo) maximo = nivel.max;
        if (nivel.min > maximo) maximo = nivel.min;
    });
    return maximo > 0 ? maximo : 100;
}

// ========================= 6. FUNCIÓN AUXILIAR: PROCESAR GRADIENTE =========================
/**
 * @brief Convierte los niveles de Firestore en un objeto gradiente para Leaflet.
 * @param {Array} niveles Lista de niveles [{min, max, color}].
 * @return {Object} Gradiente en formato {stop: color}.
 */
function procesarColoresDeBBDD(niveles) {
    let gradiente = {};
    const mapaColores = {
        verde: 'green',
        amarillo: 'yellow',
        rojo: 'red',
        naranja: 'orange',
        morado: 'purple',
        violeta: 'purple'
    };

    niveles.forEach((nivel, i) => {
        let stop = (i + 1) / niveles.length;
        let c = nivel.color?.toLowerCase() || 'blue';
        gradiente[stop.toFixed(2)] = mapaColores[c] || c;
    });

    return Object.keys(gradiente).length > 0 ? gradiente : null;
}

// ========================= 7. INTERPOLACIÓN PARA PINES =========================
/**
 * @brief Calcula la contaminación aproximada en una ubicación usando interpolación
 *        inversa de distancia sobre los valores reales descargados.
 *
 * @param {number} lat Latitud del punto.
 * @param {number} lng Longitud del punto.
 * @return {number} Valor interpolado redondeado a 2 decimales.
 */
window.calcularContaminacionEnUbicacion = function(lat, lng) {
    if (!globalDatosCache || globalDatosCache.length === 0) return 0;

    let totalVal = 0;
    let totalPeso = 0;
    const radio = 0.008; // Radio de influencia (aprox ~1km, ajustable)

    globalDatosCache.forEach(pt => {
        const d = Math.sqrt(Math.pow(lat - pt[0], 2) + Math.pow(lng - pt[1], 2));
        if (d < radio) {
            const peso = 1 / (d + 0.0001); // Evita división por cero
            totalVal += pt[2] * peso;
            totalPeso += peso;
        }
    });

    if (totalPeso === 0) return 0;
    return parseFloat((totalVal / totalPeso).toFixed(2));
};
