/**
 * @file users_map_data.js
 * @brief Gestión de datos de mapas, conexión a Firebase y cálculos matemáticos.
 * @details
 * Este archivo actúa como la capa de datos (Model) para el mapa de usuarios.
 * Sus responsabilidades principales son:
 * 1. Conectar con Firebase Firestore para descargar mapas diarios de contaminantes.
 * 2. Procesar los datos crudos y convertirlos en puntos visuales (Heatmap) con intensidad 0-1.
 * 3. Realizar cálculos matemáticos (Interpolación IDW) para estimar la contaminación
 * en cualquier punto donde el usuario haga clic, basándose en los sensores cercanos.
 * 4. Gestionar la caché de datos para evitar descargas innecesarias.
 *
 * @version 1.5 (Con Depuración y IDW corregido)
 * @author Breathe Tracking Team
 */

// ========================= CONFIGURACIÓN FIREBASE =========================

/**
 * @brief Configuración de conexión a Firebase.
 * @details Intenta leer una configuración global inyectada (`__firebase_config`) o usa la por defecto.
 */
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyCbAVEYYdtSLmrH_opCM72G_G01QXPRZ48",
    authDomain: "biometria-g3.firebaseapp.com",
    databaseURL: "https://biometria-g3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "biometria-g3",
    storageBucket: "biometria-g3.firebasestorage.app",
    messagingSenderId: "817957103566",
    appId: "1:817957103566:web:75c78a0a28f3380d092d9f"
};

/** @brief Instancia de Firestore Database. */
let db = null;
/** @brief Instancia de Firebase Auth. */
let auth = null;

/**
 * @brief Caché global de datos descargados.
 * @details Almacena un array de arrays `[lat, lng, valor]` para realizar cálculos matemáticos
 * sin tener que volver a consultar el DOM o la base de datos.
 * @type {Array<Array<number>>}
 */
let globalDatosCache = []; 

// UNIDADES
/**
 * @brief Diccionario de unidades de medida estándar por tipo de gas.
 * @const {Object}
 */
const UNIDADES_ESTANDAR = {
    'CO2': 'ppm', 'CO': 'ppm', 'O3': 'µg/m³', 'NO2': 'µg/m³', 'SO2': 'µg/m³', 'GENERAL': 'ICA'
};

// SEMÁFORO ESTRICTO (3 NIVELES)
/**
 * @brief Mapeo de nombres de colores a valores de intensidad del Heatmap (0.0 a 1.0).
 * @details Se usa para traducir la configuración de colores de la BBDD a lo que entiende Leaflet.heat.
 * @const {Object}
 */
const INTENSIDAD_COLORES = {
    'verde': 0.2, 
    'amarillo': 0.6, 
    'naranja': 0.6, // Naranja -> Amarillo (Simplificación visual)
    'rojo': 1.0, 
    'morado': 1.0   // Morado -> Rojo (Simplificación visual)
};

// ========================= INICIALIZACIÓN =========================

// Inicialización segura si la librería firebase está cargada
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
    try {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
    } catch (e) { console.error("Error init Firebase:", e); }
}

/**
 * @brief Inicializa la autenticación anónima con Firebase.
 * @param {Function} callback - Función a ejecutar cuando la autenticación sea exitosa.
 */
window.inicializarFirebase = function(callback) {
    if (!auth) return;
    auth.signInAnonymously().then((cred) => {
        if (callback) callback(cred.user);
    }).catch(e => console.error("Error Auth:", e));
};

// ========================= OBTENCIÓN DE DATOS =========================

/**
 * @brief Función principal para obtener datos de sensores.
 * @details Decide si descargar un gas individual o calcular el mapa general compuesto.
 * @param {string} fechaISO - Fecha en formato YYYY-MM-DD.
 * @param {string} tipoGas - Identificador del gas (ej: "CO2", "GENERAL").
 * @return {Promise<Object>} Objeto con puntos, gradiente y unidad.
 */
window.obtenerDatosDelSensor = async function(fechaISO, tipoGas) {
    console.log(` Descargando datos para: ${tipoGas} (${fechaISO})`);
    if (tipoGas === 'GENERAL') return await calcularMapaCalidadGeneral(fechaISO);
    return await descargarGasIndividual(fechaISO, tipoGas);
};

/**
 * @brief Descarga los datos de un gas específico desde Firestore.
 * @details
 * 1. Consulta la colección `Tipo_Gas` para obtener umbrales y colores.
 * 2. Consulta la colección `Mapas_Diarios` para obtener los puntos de medición.
 * 3. Rellena `globalDatosCache` con los valores numéricos reales.
 * 4. Genera los puntos visuales (normalizados 0-1) para el Heatmap.
 *
 * @param {string} fechaISO - Fecha solicitada.
 * @param {string} tipoGas - Tipo de gas.
 */
async function descargarGasIndividual(fechaISO, tipoGas) {
    const partes = fechaISO.split('-');
    const fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`; // DD-MM-YYYY
    const idMap = `${tipoGas}_${fechaFormateada}`;

    try {
        let nivelesBBDD = [];
        let unidad = UNIDADES_ESTANDAR[tipoGas] || "ppm"; 
        let configGradiente = null;

        // 1. Obtener Configuración del Gas (Umbrales)
        try {
            const docConfig = await db.collection("Tipo_Gas").doc(tipoGas).get();
            if (docConfig.exists) {
                const data = docConfig.data();
                if (data.Umbrales?.Unidad) unidad = data.Umbrales.Unidad; 
                if (data.Umbrales?.niveles) {
                    nivelesBBDD = data.Umbrales.niveles;
                    configGradiente = procesarColoresDeBBDD(nivelesBBDD);
                }
            }
        } catch (e) { console.warn("Usando config default para", tipoGas); }

        // 2. Obtener Datos del Mapa (Puntos)
        const docMapa = await db.collection("Mapas_Diarios").doc(idMap).get();
        
        if (!docMapa.exists) {
            console.warn(" No hay datos para esta fecha en BBDD.");
            globalDatosCache = [];
            return { puntos: [], gradiente: configGradiente, unidad };
        }

        const arrayPuntos = docMapa.data().Puntos_array || [];
        
        // --- DEBUG IMPORTANTE: Ver qué valores llegan realmente ---
        if (arrayPuntos.length > 0) {
            const valores = arrayPuntos.map(p => parseFloat(p.valor));
            const maxVal = Math.max(...valores);
            const minVal = Math.min(...valores);
            console.log(` Datos RAW BBDD -> N° Puntos: ${arrayPuntos.length}, Min: ${minVal}, Max: ${maxVal}`);
            
            if (maxVal <= 1.0 && unidad !== 'ICA') {
                console.warn(" ALERTA: Los valores parecen normalizados (0-1). El mapa saldrá coloreado pero el dato numérico será muy bajo (0.x). Revisa si guardas el valor real en BBDD.");
            }
        }
        // ---------------------------------------------------------

        // Guardamos en cache los valores CRUDOS para el cálculo numérico posterior
        globalDatosCache = arrayPuntos.map(p => [parseFloat(p.lat), parseFloat(p.lng), parseFloat(p.valor)]);

        // Preparamos los puntos para el Heatmap (Intensidad visual 0-1)
        const puntosHeatmap = arrayPuntos.map(p => {
            const val = parseFloat(p.valor);
            const intensidad = obtenerIntensidadSegunNivel(val, nivelesBBDD);
            return [parseFloat(p.lat), parseFloat(p.lng), intensidad];
        });

        return { puntos: puntosHeatmap, gradiente: configGradiente, unidad };

    } catch (error) {
        console.error("Error descargando gas:", error);
        return { puntos: [], gradiente: null, unidad: "ppm" };
    }
}

// ========================= CÁLCULO MATEMÁTICO (CORREGIDO) =========================

/**
 * @brief Calcula el nivel de contaminación estimado en una coordenada específica.
 * @details
 * Utiliza el algoritmo de Interpolación de Ponderación de Distancia Inversa (IDW).
 * - Busca puntos en `globalDatosCache`.
 * - Pondera los valores cercanos (más peso cuanto más cerca).
 * - Si está fuera del rango (`DISTANCIA_CORTE`), devuelve 0.
 * - Incluye correcciones para evitar el "efecto borde vacío".
 *
 * @param {number} lat - Latitud del punto a consultar.
 * @param {number} lng - Longitud del punto a consultar.
 * @return {number} Valor interpolado de contaminación.
 */
window.calcularContaminacionEnUbicacion = function(lat, lng) {
    if (!globalDatosCache || !globalDatosCache.length) return 0;

    // Distancias en GRADOS (aprox: 0.01 grados ~ 1.1km)
    // Aumentamos un poco el radio para asegurar que pille datos si estás cerca
    const DISTANCIA_CORTE = 0.05;  // ~5.5km (Si estás más lejos, devuelve 0)
    const RADIO_VISUAL = 0.035;    // ~3.8km (Radio de influencia para interpolar)

    let sumaPonderada = 0;
    let pesoTotal = 0;
    let distMasCercana = Infinity;
    let valorMasCercano = 0;

    globalDatosCache.forEach(pt => {
        // Distancia Euclidiana simple (suficiente para distancias cortas)
        const d = Math.sqrt(Math.pow(lat - pt[0], 2) + Math.pow(lng - pt[1], 2));

        // Rastrear siempre el punto más cercano absoluto
        if (d < distMasCercana) {
            distMasCercana = d;
            valorMasCercano = pt[2];
        }

        // Interpolación IDW (Inverse Distance Weighting)
        if (d < RADIO_VISUAL) {
            // Factor de suavizado (0.001) para evitar división por cero si estás encima
            const peso = 1 / Math.pow(d + 0.001, 2); 
            sumaPonderada += pt[2] * peso;
            pesoTotal += peso;
        }
    });

    console.log(` Cálculo Pin (${lat.toFixed(4)},${lng.toFixed(4)}): DistanciaMin=${distMasCercana.toFixed(4)}, ValorCercano=${valorMasCercano}`);

    // CASO 1: Estás demasiado lejos de cualquier sensor
    if (distMasCercana > DISTANCIA_CORTE) {
        console.log("-> Fuera de rango (0.0)");
        return 0.0;
    }
    
    // CASO 2: Estás en zona de influencia (Interpolar)
    if (pesoTotal > 0) {
        const resultado = parseFloat((sumaPonderada / pesoTotal).toFixed(2));
        // FIX: Si el resultado es absurdamente pequeño (<0.1) pero hay datos cercanos grandes,
        // forzamos el valor más cercano para evitar el "efecto borde vacío".
        if (resultado < 0.1 && valorMasCercano > 1) {
             return parseFloat(valorMasCercano.toFixed(2));
        }
        return resultado;
    }
    
    // CASO 3: Fallback (Mancha aislada sin peso suficiente)
    return parseFloat(valorMasCercano.toFixed(2));
};

// ========================= UTILIDADES =========================

/**
 * @brief Determina la intensidad visual (0-1) de un valor según los umbrales.
 * @param {number} valor - Valor numérico del contaminante.
 * @param {Array} niveles - Configuración de niveles de la BBDD.
 * @return {number} Intensidad para el Heatmap (ej: 0.2, 0.6, 1.0).
 */
function obtenerIntensidadSegunNivel(valor, niveles) {
    if (!niveles || niveles.length === 0) return 0.2; 
    let colorEncontrado = 'verde';
    for (let nivel of niveles) {
        let cumpleMin = (nivel.min === undefined) || (valor >= nivel.min);
        let cumpleMax = (nivel.max === undefined) || (valor <= nivel.max);
        if (cumpleMin && cumpleMax) {
            let c = nivel.color ? nivel.color.toLowerCase() : 'verde';
            if (c === 'naranja') c = 'amarillo';
            if (c === 'morado') c = 'rojo';
            colorEncontrado = c;
            break;
        }
    }
    return INTENSIDAD_COLORES[colorEncontrado] || 0.2;
}

/**
 * @brief Genera un objeto gradiente compatible con Leaflet a partir de niveles BBDD.
 * @param {Array} niveles - Configuración de niveles.
 * @return {Object} Objeto gradiente { 0.2: 'green', ... }.
 */
function procesarColoresDeBBDD(niveles) {
    let grad = {};
    grad[0.0] = 'rgba(0,0,0,0)';
    grad[0.2] = 'green'; 
    grad[0.6] = 'yellow'; 
    grad[1.0] = 'red';
    return grad;
}

// ========================= MAPA GENERAL =========================

/**
 * @brief Genera un mapa compuesto de Calidad General (ICA).
 * @details
 * Descarga todos los gases disponibles, superpone sus intensidades y se queda
 * con el peor valor (máximo) en cada punto geográfico.
 * @param {string} fechaISO - Fecha solicitada.
 * @return {Promise<Object>} Datos del mapa general.
 */
async function calcularMapaCalidadGeneral(fechaISO) {
    const gases = ['O3', 'NO2', 'CO', 'SO2', 'CO2'];
    const promesas = gases.map(gas => descargarGasIndividual(fechaISO, gas));
    const resultados = await Promise.all(promesas);

    const mapaUnificado = new Map();
    
    resultados.forEach(res => {
        if (!res.puntos) return;
        res.puntos.forEach(pt => {
            const key = `${pt[0].toFixed(5)}_${pt[1].toFixed(5)}`;
            const intensidad = pt[2];
            if (mapaUnificado.has(key)) {
                if (intensidad > mapaUnificado.get(key)) mapaUnificado.set(key, intensidad);
            } else {
                mapaUnificado.set(key, intensidad);
            }
        });
    });

    const puntosFinales = [];
    const arrayParaCache = []; 

    mapaUnificado.forEach((intensidad, key) => {
        const [lat, lng] = key.split('_').map(parseFloat);
        puntosFinales.push([lat, lng, intensidad]);
        
        // Convertimos Intensidad a valor numérico ICA legible
        let valorICA = 0; 
        if (intensidad >= 0.2) valorICA = 25;
        if (intensidad >= 0.6) valorICA = 75; 
        if (intensidad >= 1.0) valorICA = 150;
        arrayParaCache.push([lat, lng, valorICA]);
    });

    globalDatosCache = arrayParaCache;

    return {
        puntos: puntosFinales,
        gradiente: { 0.0: 'rgba(0,0,0,0)', 0.2: 'green', 0.6: 'yellow', 1.0: 'red' },
        unidad: "ICA Global"
    };
}


// ========================= FUNCIONES AUXILIARES PARA TESTS =========================

/**
 * @brief Inyecta datos falsos en la caché para pruebas unitarias.
 * @details Permite probar `calcularContaminacionEnUbicacion` sin conexión a Firebase.
 * @param {Array} datosFalsos - Datos mock.
 */
function setCachePruebas(datosFalsos) {
    globalDatosCache = datosFalsos;
}

// ========================= EXPORTACIÓN PARA JEST =========================

/* Esto comprueba si estamos en un entorno de Node.js (Jest).
   Si es así, exportamos las funciones para que el test las pueda leer.
   Si estamos en el navegador, esto se ignora y no rompe nada.
*/
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        obtenerIntensidadSegunNivel,
        // Como calcularContaminacion está definida en window, la referenciamos así:
        calcularContaminacionEnUbicacion: window.calcularContaminacionEnUbicacion,
        setCachePruebas
    };
}