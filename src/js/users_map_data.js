/**
 * @file users_map_data.js
 * @brief Gestión de datos: Unidades correctas, Geofence y Alta Densidad en General.
 */

// ========================= CONFIGURACIÓN FIREBASE =========================
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
let globalDatosCache = []; 

//  UNIDADES
const UNIDADES_ESTANDAR = {
    'CO2': 'ppm', 'CO': 'ppm', 'O3': 'µg/m³', 'NO2': 'µg/m³', 'SO2': 'µg/m³', 'GENERAL': 'ICA'
};

//  SEMÁFORO ESTRICTO (3 NIVELES)
const INTENSIDAD_COLORES = {
    'verde': 0.2, 
    'amarillo': 0.6, 
    'naranja': 0.6, // Naranja -> Amarillo
    'rojo': 1.0, 
    'morado': 1.0   // Morado -> Rojo
};

// ========================= INICIALIZACIÓN =========================
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

// ========================= OBTENCIÓN DE DATOS =========================
window.obtenerDatosDelSensor = async function(fechaISO, tipoGas) {
    if (tipoGas === 'GENERAL') return await calcularMapaCalidadGeneral(fechaISO);
    return await descargarGasIndividual(fechaISO, tipoGas);
};

async function descargarGasIndividual(fechaISO, tipoGas) {
    const partes = fechaISO.split('-');
    const fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
    const idMap = `${tipoGas}_${fechaFormateada}`;

    try {
        let nivelesBBDD = [];
        let unidad = UNIDADES_ESTANDAR[tipoGas] || "ppm"; 
        let configGradiente = null;

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

        const docMapa = await db.collection("Mapas_Diarios").doc(idMap).get();
        if (!docMapa.exists) {
            globalDatosCache = [];
            return { puntos: [], gradiente: configGradiente, unidad };
        }

        const arrayPuntos = docMapa.data().Puntos_array || [];
        globalDatosCache = arrayPuntos.map(p => [parseFloat(p.lat), parseFloat(p.lng), parseFloat(p.valor)]);

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

// ========================= CÁLCULO MATEMÁTICO =========================
window.calcularContaminacionEnUbicacion = function(lat, lng) {
    if (!globalDatosCache || !globalDatosCache.length) return 0;

    const DISTANCIA_CORTE_KM = 0.04; // ~4km corte de señal
    const RADIO_VISUAL = 0.025;      // ~2.5km radio de influencia

    let sumaPonderada = 0;
    let pesoTotal = 0;
    let distMasCercana = Infinity;
    let valorMasCercano = 0;

    globalDatosCache.forEach(pt => {
        const d = Math.sqrt(Math.pow(lat - pt[0], 2) + Math.pow(lng - pt[1], 2));

        if (d < distMasCercana) {
            distMasCercana = d;
            valorMasCercano = pt[2];
        }

        if (d < RADIO_VISUAL) {
            // Peso cuadrático para priorizar lo cercano
            const peso = 1 / Math.pow(d + 0.0005, 2);
            sumaPonderada += pt[2] * peso;
            pesoTotal += peso;
        }
    });

    if (distMasCercana > DISTANCIA_CORTE_KM) return 0.0;
    
    // Si hay interpolación, usarla
    if (pesoTotal > 0) return parseFloat((sumaPonderada / pesoTotal).toFixed(2));
    
    // Si no (mancha aislada), usar valor directo
    return parseFloat(valorMasCercano.toFixed(2));
};

// ========================= UTILIDADES =========================
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

function procesarColoresDeBBDD(niveles) {
    let grad = {};
    grad[0.0] = 'rgba(0,0,0,0)';
    grad[0.2] = 'green'; 
    grad[0.6] = 'yellow'; 
    grad[1.0] = 'red';
    return grad;
}

// ========================= MAPA GENERAL (ALTA PRECISIÓN) =========================
async function calcularMapaCalidadGeneral(fechaISO) {
    const gases = ['O3', 'NO2', 'CO', 'SO2', 'CO2'];
    const promesas = gases.map(gas => descargarGasIndividual(fechaISO, gas));
    const resultados = await Promise.all(promesas);

    const mapaUnificado = new Map();
    
    resultados.forEach(res => {
        if (!res.puntos) return;
        res.puntos.forEach(pt => {
            // FIX: Usamos toFixed(5) para NO perder puntos por agrupación.
            // Mantenemos la densidad original de los sensores.
            const key = `${pt[0].toFixed(5)}_${pt[1].toFixed(5)}`;
            const intensidad = pt[2];

            // PRIORIDAD AL ROJO (MAX)
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
        
        let valorICA = 0; 
        if (intensidad >= 0.2) valorICA = 25;
        if (intensidad >= 0.6) valorICA = 75; 
        if (intensidad >= 1.0) valorICA = 150;
        arrayParaCache.push([lat, lng, valorICA]);
    });

    globalDatosCache = arrayParaCache;

    // Gradiente Estricto 3 Colores
    return {
        puntos: puntosFinales,
        gradiente: { 0.0: 'rgba(0,0,0,0)', 0.2: 'green', 0.6: 'yellow', 1.0: 'red' },
        unidad: "ICA Global"
    };
}