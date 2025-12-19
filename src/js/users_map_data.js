/**
 * @file users_map_data.js
 * @brief Gestión de datos geoespaciales y lógica de colorimetría para el mapa de calor.
 * @details
 * Este módulo actúa como la capa de datos (Data Layer) del mapa de usuarios. Sus responsabilidades son:
 * 1. Conexión y autenticación anónima con Firebase.
 * 2. Descarga de configuraciones de umbrales (niveles de peligro) desde Firestore.
 * 3. Descarga de puntos de medición geolocalizados.
 * 4. Transformación de datos crudos a "Intensidades Visuales" fijas (Lógica de Escalones).
 * 5. Interpolación de valores (IDW) para estimar contaminación en coordenadas arbitrarias.
 */

// ========================= 1. CONFIGURACIÓN =========================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyCbAVEYYdtSLmrH_opCM72G_G01QXPRZ48",
    authDomain: "biometria-g3.firebaseapp.com",
    databaseURL: "https://biometria-g3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "biometria-g3",
    storageBucket: "biometria-g3.firebasestorage.app",
    messagingSenderId: "817957103566",
    appId: "1:817957103566:web:75c78a0a28f3380d092d9f"
};

let db = null;
let auth = null;

/**
 * @brief Cache global de puntos para cálculos de interpolación.
 * @details Almacena un array de arrays [lat, lng, valor] para evitar re-consultas a la API
 * cuando el usuario hace clic en el mapa para consultar un valor específico.
 */
let globalDatosCache = []; 

/**
 * @brief Tabla de traducción de colores semánticos a intensidades de Heatmap.
 * @details
 * Leaflet heatmap utiliza valores de 0.0 a 1.0.
 * Este objeto fuerza a que un nivel "amarillo" siempre se pinte con intensidad 0.5,
 * independientemente de si el valor numérico es 50 o 55, garantizando coherencia visual estricta.
 */
const INTENSIDAD_COLORES = {
    'verde': 0.2,    // Intensidad baja
    'amarillo': 0.5, // Intensidad media (Justo en el centro del gradiente)
    'naranja': 0.7,  // Intensidad media-alta
    'rojo': 1.0,     // Intensidad máxima
    'morado': 1.0
};

// ========================= 2. INICIALIZAR =========================
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
    try {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
    } catch (e) { console.error("Error init Firebase:", e); }
}

/**
 * @brief Inicia la sesión anónima en Firebase para permitir lecturas.
 * callback:Function -> inicializarFirebase() -> void
 * * @details
 * Realiza un 'signInAnonymously'. Al completarse, ejecuta el callback proporcionado
 * (generalmente para iniciar la carga del mapa una vez autenticado).
 * * @param callback Función a ejecutar tras el éxito de la autenticación.
 */
window.inicializarFirebase = function(callback) {
    if (!auth) return;
    auth.signInAnonymously().then((cred) => {
        if (callback) callback(cred.user);
    }).catch(e => console.error("Error Auth:", e));
};

// ========================= 3. OBTENCIÓN DE DATOS =========================

/**
 * @brief Enrutador principal para la solicitud de datos de sensores.
 * fechaISO:string, tipoGas:string -> obtenerDatosDelSensor() -> Promise<Object>
 * * @details
 * Decide qué estrategia de descarga utilizar:
 * - Si tipoGas es 'GENERAL', calcula una intersección de todos los gases.
 * - Si es un gas específico, descarga su colección individual.
 * * @param fechaISO Fecha en formato 'YYYY-MM-DD'.
 * @param tipoGas Identificador del gas (ej: 'CO2', 'O3') o 'GENERAL'.
 * @return Promesa con el objeto de datos { puntos, gradiente, unidad }.
 */
window.obtenerDatosDelSensor = async function(fechaISO, tipoGas) {
    // Si piden GENERAL, calculamos la intersección
    if (tipoGas === 'GENERAL') {
        return await calcularMapaCalidadGeneral(fechaISO);
    }
    // Si es un gas normal
    return await descargarGasIndividual(fechaISO, tipoGas);
};

/**
 * @brief Descarga, procesa y normaliza los datos de un contaminante específico.
 * fechaISO:string, tipoGas:string -> descargarGasIndividual() -> Promise<Object>
 * * @details
 * 1. Construye el ID del documento (ej: 'O3_2023-10-27').
 * 2. Descarga la configuración de umbrales desde la colección 'Tipo_Gas'.
 * 3. Descarga los datos crudos desde 'Mapas_Diarios'.
 * 4. Aplica la función de normalización para convertir valores numéricos en intensidades visuales fijas.
 * * @note Actualiza `globalDatosCache` con los valores reales para la interpolación.
 */
async function descargarGasIndividual(fechaISO, tipoGas) {
    // Reordenar fecha de ISO (YYYY-MM-DD) a formato ID (DD-MM-YYYY)
    const partes = fechaISO.split('-');
    const fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
    const idMap = `${tipoGas}_${fechaFormateada}`;

    try {
        let nivelesBBDD = [];
        let unidad = "ppm";
        let configGradiente = null;

        // 1. Obtener Configuración de Umbrales (Metadatos visuales)
        try {
            const docConfig = await db.collection("Tipo_Gas").doc(tipoGas).get();
            if (docConfig.exists) {
                const data = docConfig.data();
                if (data.Umbrales?.Unidad) unidad = data.Umbrales.Unidad;
                if (data.Umbrales?.niveles) {
                    nivelesBBDD = data.Umbrales.niveles;
                    // Generamos el gradiente visual para Leaflet basado en la config de BBDD
                    configGradiente = procesarColoresDeBBDD(nivelesBBDD);
                }
            }
        } catch (e) { console.warn("Usando config default para", tipoGas); }

        // 2. Obtener Puntos de datos
        const docMapa = await db.collection("Mapas_Diarios").doc(idMap).get();
        if (!docMapa.exists) {
            globalDatosCache = [];
            return { puntos: [], gradiente: configGradiente, unidad };
        }

        const arrayPuntos = docMapa.data().Puntos_array || [];
        
        // Cache para interpolación (Guardamos valores REALES numéricos, no intensidades)
        globalDatosCache = arrayPuntos.map(p => [parseFloat(p.lat), parseFloat(p.lng), parseFloat(p.valor)]);

        // 3. NORMALIZACIÓN POR NIVELES (Lógica visual estricta)
        const puntosHeatmap = arrayPuntos.map(p => {
            const val = parseFloat(p.valor);
            
            // Calculamos la intensidad basándonos en el COLOR del nivel, NO en matemáticas lineales.
            // Esto crea el efecto de "escalones" visuales.
            const intensidad = obtenerIntensidadSegunNivel(val, nivelesBBDD);
            
            return [parseFloat(p.lat), parseFloat(p.lng), intensidad];
        });

        return { puntos: puntosHeatmap, gradiente: configGradiente, unidad };

    } catch (error) {
        console.error("Error descargando gas:", error);
        return { puntos: [], gradiente: null, unidad: "ppm" };
    }
}

// ========================= 4. CÁLCULO DE CALIDAD GENERAL =========================

/**
 * @brief Genera un mapa compuesto unificando todos los gases disponibles.
 * fechaISO:string -> calcularMapaCalidadGeneral() -> Promise<Object>
 * * @details
 * 1. Lanza peticiones paralelas para todos los gases definidos.
 * 2. Unifica los puntos en un Map usando la coordenada como clave.
 * 3. Principio de Precaución: Si una coordenada tiene varios valores, se queda con la intensidad MÁXIMA (la situación más peligrosa).
 * 4. Genera un gradiente de "semáforo" (Verde-Amarillo-Rojo).
 * * @return Objeto con los puntos fusionados y un gradiente estándar de riesgo.
 */
async function calcularMapaCalidadGeneral(fechaISO) {
    const gases = ['O3', 'NO2', 'CO', 'SO2', 'CO2'];
    const promesas = gases.map(gas => descargarGasIndividual(fechaISO, gas));
    const resultados = await Promise.all(promesas);

    const mapaUnificado = new Map();

    resultados.forEach(res => {
        if (!res.puntos) return;
        
        res.puntos.forEach(pt => {
            // pt[2] ya viene normalizado como 0.2, 0.5 o 1.0 según la función de niveles
            // Usamos coordenadas truncadas como clave única
            const key = `${pt[0].toFixed(4)}_${pt[1].toFixed(4)}`;
            const intensidad = pt[2];

            if (mapaUnificado.has(key)) {
                // Nos quedamos con la intensidad MAYOR (Prioridad al color más peligroso)
                const valorAnterior = mapaUnificado.get(key);
                if (intensidad > valorAnterior) {
                    mapaUnificado.set(key, intensidad);
                }
            } else {
                mapaUnificado.set(key, intensidad);
            }
        });
    });

    const puntosFinales = [];
    const arrayParaCache = []; 

    mapaUnificado.forEach((intensidad, key) => {
        const [latStr, lngStr] = key.split('_');
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        
        puntosFinales.push([lat, lng, intensidad]);
        
        // Convertimos la intensidad abstracta a un valor ICA estimado para mostrar en popups
        let valorICA = 0; // Verde
        if (intensidad === 0.5) valorICA = 50; // Amarillo
        if (intensidad >= 0.7) valorICA = 100; // Rojo
        
        arrayParaCache.push([lat, lng, valorICA]);
    });

    globalDatosCache = arrayParaCache;

    // Gradiente "Semáforo" específico para el mapa General
    // Ajustado manualmente para coincidir con las intensidades fijas (0.2, 0.5, 1.0)
    const gradienteSemaforo = {
        0.0: 'green',
        0.4: 'green',  
        0.5: 'yellow', // El valor 0.5 clavado se pintará amarillo
        0.6: 'orange',
        0.8: 'red',    // De 0.8 para arriba es rojo
        1.0: 'darkred'
    };

    return {
        puntos: puntosFinales,
        gradiente: gradienteSemaforo,
        unidad: "Nivel de Riesgo"
    };
}

// ========================= 5. FUNCIONES AUXILIARES CLAVE =========================

/**
 * @brief Traduce un valor numérico a una intensidad visual basada en configuración.
 * valor:number, niveles:Object[] -> obtenerIntensidadSegunNivel() -> number
 * * @details
 * Itera sobre el array de niveles (thresholds) descargado de Firestore.
 * Comprueba si el valor entra dentro de [min, max].
 * Si coincide, busca el color en `INTENSIDAD_COLORES` y devuelve su valor fijo (ej: 0.5).
 * Si no hay coincidencias, devuelve valor seguro (verde/0.2).
 */
function obtenerIntensidadSegunNivel(valor, niveles) {
    if (!niveles || niveles.length === 0) return 0.2; // Default verde si no hay config

    let colorEncontrado = 'verde'; // Por defecto

    // Buscamos en qué nivel encaja el valor
    for (let nivel of niveles) {
        let cumpleMin = true;
        let cumpleMax = true;

        if (nivel.min !== undefined && valor < nivel.min) cumpleMin = false;
        if (nivel.max !== undefined && valor > nivel.max) cumpleMax = false;

        if (cumpleMin && cumpleMax) {
            colorEncontrado = nivel.color ? nivel.color.toLowerCase() : 'verde';
            break; // Ya encontramos el nivel, salimos del bucle
        }
    }

    // Devolvemos la intensidad fija mapeada (ej: Amarillo -> 0.5)
    return INTENSIDAD_COLORES[colorEncontrado] || 0.2;
}

/**
 * @brief Genera un objeto de gradiente compatible con Leaflet Heatmap.
 * niveles:Object[] -> procesarColoresDeBBDD() -> Object
 * * @details
 * Crea un mapa donde las claves son las intensidades (0.0 - 1.0) y los valores
 * son los strings de color CSS. Se asegura de alinear los cortes del gradiente
 * con las intensidades fijas definidas en el sistema.
 */
function procesarColoresDeBBDD(niveles) {
    let grad = {};
    const coloresLeaflet = { 
        verde:'green', amarillo:'yellow', rojo:'red', 
        naranja:'orange', morado:'purple' 
    };
    
    // Mapeamos los cortes del gradiente para que coincidan con nuestras intensidades fijas
    // Verde (0.2), Amarillo (0.5), Rojo (1.0)
    grad[0.2] = 'green';
    grad[0.5] = 'yellow';
    grad[0.8] = 'orange'; // Transición visual
    grad[1.0] = 'red';

    return grad;
}

/**
 * @brief Calcula el valor interpolado en una coordenada específica (IDW).
 * lat:number, lng:number -> calcularContaminacionEnUbicacion() -> number
 * * @details
 * Utiliza la Ponderación de Distancia Inversa (Inverse Distance Weighting).
 * Busca puntos en `globalDatosCache` dentro de un radio determinado (0.008 grados).
 * Calcula un promedio ponderado donde los puntos más cercanos tienen más influencia.
 * * @param lat Latitud del punto clicado.
 * @param lng Longitud del punto clicado.
 * @return Valor numérico estimado de contaminación en ese punto.
 */
window.calcularContaminacionEnUbicacion = function(lat, lng) {
    if (!globalDatosCache || !globalDatosCache.length) return 0;
    let totalVal = 0, totalPeso = 0;
    const radio = 0.008; // Radio de búsqueda aprox 800m
    
    globalDatosCache.forEach(pt => {
        // Distancia Euclidiana simple (suficiente para distancias cortas)
        const d = Math.sqrt(Math.pow(lat - pt[0], 2) + Math.pow(lng - pt[1], 2));
        if (d < radio) {
            const peso = 1 / (d + 0.0001); // Evitamos división por cero
            totalVal += pt[2] * peso;
            totalPeso += peso;
        }
    });
    
    return totalPeso === 0 ? 0 : parseFloat((totalVal / totalPeso).toFixed(2));
};


// ========================= EXPORTAR PARA TESTS =========================
// Esto permite que Jest vea las funciones y variables privadas
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        obtenerIntensidadSegunNivel,
        procesarColoresDeBBDD,
        // Exponemos una función para inyectar datos falsos en la cache y probar la interpolación
        setCachePruebas: (datos) => { globalDatosCache = datos; },
        calcularContaminacionEnUbicacion: window.calcularContaminacionEnUbicacion
    };
}