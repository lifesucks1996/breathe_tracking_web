/**
 * @file users_map_data.js
 * @brief Gestión de datos: Lógica por ESCALONES (Niveles estrictos de BBDD).
 */

// ========================= 1. CONFIGURACIÓN =========================
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
let globalDatosCache = []; 

// Mapa de intensidades FIJAS para el Heatmap según el color de la BBDD
// Esto asegura que si es "amarillo", se pinte amarillo, sin importar el valor numérico.
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

window.inicializarFirebase = function(callback) {
    if (!auth) return;
    auth.signInAnonymously().then((cred) => {
        if (callback) callback(cred.user);
    }).catch(e => console.error("Error Auth:", e));
};

// ========================= 3. OBTENCIÓN DE DATOS =========================

window.obtenerDatosDelSensor = async function(fechaISO, tipoGas) {
    // Si piden GENERAL, calculamos la intersección
    if (tipoGas === 'GENERAL') {
        return await calcularMapaCalidadGeneral(fechaISO);
    }
    // Si es un gas normal
    return await descargarGasIndividual(fechaISO, tipoGas);
};

// --- Descarga y Procesa un Gas INDIVIDUAL ---
async function descargarGasIndividual(fechaISO, tipoGas) {
    const partes = fechaISO.split('-');
    const fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
    const idMap = `${tipoGas}_${fechaFormateada}`;

    try {
        let nivelesBBDD = [];
        let unidad = "ppm";
        let configGradiente = null;

        // 1. Obtener Configuración de Umbrales
        try {
            const docConfig = await db.collection("Tipo_Gas").doc(tipoGas).get();
            if (docConfig.exists) {
                const data = docConfig.data();
                if (data.Umbrales?.Unidad) unidad = data.Umbrales.Unidad;
                if (data.Umbrales?.niveles) {
                    nivelesBBDD = data.Umbrales.niveles;
                    // Generamos el gradiente visual para Leaflet
                    configGradiente = procesarColoresDeBBDD(nivelesBBDD);
                }
            }
        } catch (e) { console.warn("Usando config default para", tipoGas); }

        // 2. Obtener Puntos
        const docMapa = await db.collection("Mapas_Diarios").doc(idMap).get();
        if (!docMapa.exists) {
            globalDatosCache = [];
            return { puntos: [], gradiente: configGradiente, unidad };
        }

        const arrayPuntos = docMapa.data().Puntos_array || [];
        
        // Cache para interpolación (valores reales)
        globalDatosCache = arrayPuntos.map(p => [parseFloat(p.lat), parseFloat(p.lng), parseFloat(p.valor)]);

        // 3. NORMALIZACIÓN POR NIVELES (La parte importante)
        const puntosHeatmap = arrayPuntos.map(p => {
            const val = parseFloat(p.valor);
            
            // Calculamos la intensidad basándonos en el color del nivel, NO en matemáticas
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

async function calcularMapaCalidadGeneral(fechaISO) {
    const gases = ['O3', 'NO2', 'CO', 'SO2', 'CO2'];
    const promesas = gases.map(gas => descargarGasIndividual(fechaISO, gas));
    const resultados = await Promise.all(promesas);

    const mapaUnificado = new Map();

    resultados.forEach(res => {
        if (!res.puntos) return;
        
        res.puntos.forEach(pt => {
            // pt[2] ahora ya viene como 0.2, 0.5 o 1.0 según la función de niveles
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
        
        // Para el valor numérico en el pin, lo convertimos a algo legible
        let valorICA = 0; // Verde
        if (intensidad === 0.5) valorICA = 50; // Amarillo
        if (intensidad >= 0.7) valorICA = 100; // Rojo
        
        arrayParaCache.push([lat, lng, valorICA]);
    });

    globalDatosCache = arrayParaCache;

    // Gradiente "Semáforo" específico para el mapa General
    // Ajustado para coincidir con las intensidades fijas (0.2, 0.5, 1.0)
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
 * Recorre los niveles de la BBDD y determina el color correspondiente.
 * Luego devuelve la intensidad numérica asociada a ese color.
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
            break; // Ya encontramos el nivel, salimos
        }
    }

    // Devolvemos la intensidad fija (ej: Amarillo -> 0.5)
    return INTENSIDAD_COLORES[colorEncontrado] || 0.2;
}

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
    grad[0.8] = 'orange'; // Transición
    grad[1.0] = 'red';

    return grad;
}

window.calcularContaminacionEnUbicacion = function(lat, lng) {
    if (!globalDatosCache || !globalDatosCache.length) return 0;
    let totalVal = 0, totalPeso = 0;
    const radio = 0.008; 
    globalDatosCache.forEach(pt => {
        const d = Math.sqrt(Math.pow(lat - pt[0], 2) + Math.pow(lng - pt[1], 2));
        if (d < radio) {
            const peso = 1 / (d + 0.0001);
            totalVal += pt[2] * peso;
            totalPeso += peso;
        }
    });
    return totalPeso === 0 ? 0 : parseFloat((totalVal / totalPeso).toFixed(2));
};