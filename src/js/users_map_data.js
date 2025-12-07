/**
 * js/users_map_data.js
 * Descarga datos y normaliza la escala dinámicamente según el gas seleccionado.
 */

// 1. CONFIGURACIÓN (Pon tus claves reales)
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
let globalDatosCache = []; // Datos crudos para los pines

// Inicialización
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

// Login Anónimo
window.inicializarFirebase = function(alEstarListo) {
    if (!auth) return;
    auth.signInAnonymously().then((cred) => {
        if(alEstarListo) alEstarListo(cred.user);
    }).catch(e => console.error("Error Auth:", e));
};

// --- OBTENCIÓN DE DATOS INTELIGENTE ---
window.obtenerDatosDelSensor = async function(fechaISO, tipoGas) {
    const partes = fechaISO.split('-'); 
    const fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`; 
    
    // IDs Dinámicos: Funcionarán para CO, SO2, NO2... lo que sea que selecciones
    const idDocumentoMapa = `${tipoGas}_${fechaFormateada}`;
    const idDocumentoConfig = tipoGas; 

    console.log(`📡 Buscando configuración para gas: ${tipoGas}`);

    try {
        let configGradiente = null;
        let unidad = "ppm"; 
        let maximoEscala = 100; // Valor de seguridad

        // A) LEER LA CONFIGURACIÓN DEL GAS (Tipo_Gas)
        try {
            const docConfig = await db.collection("Tipo_Gas").doc(idDocumentoConfig).get();
            if (docConfig.exists) {
                const data = docConfig.data();
                
                // 1. Obtener Unidad
                if (data.Umbrales && data.Umbrales.Unidad) {
                    unidad = data.Umbrales.Unidad;
                }
                
                // 2. Obtener Niveles para calcular colores y escala
                if (data.Umbrales && data.Umbrales.niveles) {
                    const niveles = data.Umbrales.niveles;
                    
                    configGradiente = procesarColoresDeBBDD(niveles);
                    
                    // AQUÍ ESTÁ LA CLAVE: Calculamos el máximo para ESTE gas específico
                    maximoEscala = calcularMaximoDeLaBBDD(niveles);
                    console.log(`📏 Escala calculada para ${tipoGas}: 0 - ${maximoEscala} ${unidad}`);
                }
            }
        } catch (err) {
            console.warn("⚠️ Error leyendo config del gas, usando valores por defecto.");
        }

        // B) LEER LOS PUNTOS (Mapas_Diarios)
        const docMapa = await db.collection("Mapas_Diarios").doc(idDocumentoMapa).get();

        if (!docMapa.exists) {
            console.warn(`❌ No hay mapa para ${idDocumentoMapa}`);
            globalDatosCache = [];
            return { puntos: [], gradiente: configGradiente, unidad: unidad };
        }

        const dataMapa = docMapa.data();
        const arrayPuntos = dataMapa.Puntos_array || [];

        // C) NORMALIZAR PUNTOS
        // Convertimos el valor real (ej: 5000 CO2) a intensidad (0.0-1.0) usando el máximo calculado
        const puntosProcesados = arrayPuntos.map(p => {
            let valorReal = parseFloat(p.valor);
            let intensidad = valorReal / maximoEscala;
            
            // Tope visual en 1.0 (Rojo intenso)
            if (intensidad > 1.0) intensidad = 1.0; 
            
            return [
                parseFloat(p.lat),
                parseFloat(p.lng),
                intensidad 
            ];
        });

        // Guardamos originales para los pines
        globalDatosCache = arrayPuntos.map(p => [parseFloat(p.lat), parseFloat(p.lng), parseFloat(p.valor)]);

        return {
            puntos: puntosProcesados,
            gradiente: configGradiente,
            unidad: unidad
        };

    } catch (error) {
        console.error("❌ Error general:", error);
        return { puntos: [], gradiente: null, unidad: "ppm" };
    }
};

// --- FUNCIONES AUXILIARES ---

// Busca el valor más alto en los umbrales de la BBDD
function calcularMaximoDeLaBBDD(niveles) {
    let maximo = 0;
    niveles.forEach(nivel => {
        if (nivel.max && nivel.max > maximo) maximo = nivel.max;
        if (nivel.min && nivel.min > maximo) maximo = nivel.min;
    });
    return maximo > 0 ? maximo : 100;
}

// Genera el gradiente de colores
function procesarColoresDeBBDD(niveles) {
    let gradiente = {};
    const mapaColores = { 
        'verde': 'green', 'amarillo': 'yellow', 'rojo': 'red', 
        'naranja': 'orange', 'morado': 'purple', 'violeta': 'purple' 
    };
    
    niveles.forEach((nivel, index) => {
        let stop = (index + 1) / niveles.length; 
        let c = nivel.color ? nivel.color.toLowerCase() : 'blue';
        gradiente[stop.toFixed(2)] = mapaColores[c] || c;
    });
    return Object.keys(gradiente).length > 0 ? gradiente : null;
}

// Cálculo para los pines (Usa valor real)
window.calcularContaminacionEnUbicacion = function(lat, lng) {
    if (!globalDatosCache || globalDatosCache.length === 0) return 0;
    let totalVal = 0;
    let totalPeso = 0;
    const radio = 0.008; 

    globalDatosCache.forEach(pt => {
        const d = Math.sqrt(Math.pow(lat - pt[0], 2) + Math.pow(lng - pt[1], 2));
        if (d < radio) {
            let peso = 1 / (d + 0.0001);
            totalVal += pt[2] * peso;
            totalPeso += peso;
        }
    });

    if (totalPeso === 0) return 0;
    return parseFloat((totalVal / totalPeso).toFixed(2));
};