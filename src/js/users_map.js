/**
 * js/users_map.js
 * Gestión visual del mapa y pines.
 */

let mapa = null;
let capaCalor = null;
let pinesGuardados = []; 
let idPinSeleccionado = null;
let contadorPines = 0;
let modoAgregar = false;
let latLngTemporal = null;

let datosPuntosActuales = [];
let configGasActual = { unidad: 'ppm', gradiente: null };

// DOM Elements
const loading = document.getElementById('loading-indicator');
const btnActualizar = document.getElementById('btn-update-map');
const selectorFecha = document.getElementById('dateSelector');
const selectorGas = document.getElementById('selectorContaminante');

// --- 1. INICIAR MAPA ---
const COORDS = [38.9670, -0.1830];
mapa = L.map('mapa', { zoomControl: false }).setView(COORDS, 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(mapa);

// --- 2. CARGAR ---
if (window.inicializarFirebase) {
    window.inicializarFirebase(async (user) => {
        await cargarMapa();
        if (pinesGuardados.length === 0) {
            crearPin({lat: 38.9665, lng: -0.1850}, "Estación Centro");
        }
    });
}

// --- 3. LÓGICA MAPA ---
async function cargarMapa() {
    const fecha = selectorFecha.value;
    const gas = selectorGas.value;
    
    if(loading) loading.style.display = 'block';

    if (window.obtenerDatosDelSensor) {
        const respuesta = await window.obtenerDatosDelSensor(fecha, gas);
        
        datosPuntosActuales = respuesta.puntos || [];
        configGasActual.unidad = respuesta.unidad;
        configGasActual.gradiente = respuesta.gradiente;
        
        pintarMapaCalor();
        
        // Actualizar título en panel lateral
        const nombreGas = selectorGas.options[selectorGas.selectedIndex].text;
        const tituloGas = document.getElementById('activity-contaminant-type');
        if(tituloGas) tituloGas.innerText = nombreGas;
        
        if (idPinSeleccionado) abrirDetallePin(idPinSeleccionado);
    }
    
    if(loading) loading.style.display = 'none';
}

function pintarMapaCalor() {
    if (capaCalor) mapa.removeLayer(capaCalor);
    if (datosPuntosActuales.length === 0) return;
    if (!L.heatLayer) return;

    // Radio Dinámico
    const zoom = mapa.getZoom();
    let radioCalc = 35 * Math.pow(1.2, zoom - 14); 
    radioCalc = Math.max(15, Math.min(radioCalc, 100)); 

    const gradienteDefault = { 0.4: 'green', 0.7: 'yellow', 1.0: 'red' };

    capaCalor = L.heatLayer(datosPuntosActuales, {
        radius: radioCalc,
        blur: radioCalc * 0.7,
        maxZoom: 15,
        gradient: configGasActual.gradiente || gradienteDefault,
        minOpacity: 0.4
    }).addTo(mapa);
}

mapa.on('zoomend', () => {
    if (datosPuntosActuales.length > 0) pintarMapaCalor();
});

// Listeners
btnActualizar.addEventListener('click', cargarMapa);
selectorGas.addEventListener('change', cargarMapa);
selectorFecha.addEventListener('change', cargarMapa);

// --- 4. GESTIÓN PINES ---
const btnAdd = document.getElementById('add-pin-btn');
const modal = document.getElementById('name-pin-modal');
const inputName = document.getElementById('new-pin-name-input');
const btnConfirm = document.getElementById('confirm-add-btn');
const btnCancel = document.getElementById('cancel-add-btn');

if(btnAdd) {
    btnAdd.addEventListener('click', () => {
        modoAgregar = !modoAgregar;
        if (modoAgregar) {
            btnAdd.style.backgroundColor = '#e74c3c';
            btnAdd.innerHTML = '<i class="fas fa-times"></i> Cancelar';
            document.getElementById('mapa').style.cursor = 'crosshair';
            mapa.on('click', alHacerClickMapa);
        } else {
            resetearModoAgregar();
        }
    });
}

function resetearModoAgregar() {
    modoAgregar = false;
    btnAdd.style.backgroundColor = '';
    btnAdd.innerHTML = '<i class="fas fa-map-marker-alt"></i> Añadir Marcador';
    document.getElementById('mapa').style.cursor = '';
    mapa.off('click', alHacerClickMapa);
}

function alHacerClickMapa(e) {
    latLngTemporal = e.latlng;
    modal.style.display = 'flex';
    inputName.value = '';
    inputName.focus();
}

btnConfirm.addEventListener('click', () => {
    const nombre = inputName.value.trim() || `Punto ${contadorPines + 1}`;
    crearPin(latLngTemporal, nombre);
    modal.style.display = 'none';
    resetearModoAgregar();
});

btnCancel.addEventListener('click', () => { modal.style.display = 'none'; });

function crearPin(coords, nombre) {
    contadorPines++;
    const id = `pin-${contadorPines}`;
    
    const nuevoPin = {
        id: id,
        lat: coords.lat,
        lng: coords.lng,
        nombre: nombre,
        direccion: `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`,
        marker: L.marker([coords.lat, coords.lng]).addTo(mapa)
    };
    
    nuevoPin.marker.on('click', () => abrirDetallePin(id));
    pinesGuardados.push(nuevoPin);
    
    // Renderizar lista
    const container = document.getElementById('pins-container');
    const div = document.createElement('div');
    div.className = 'pin-item';
    div.innerHTML = `<i class="fas fa-map-marker-alt pin-icon"></i><div class="pin-info"><h4>${nombre}</h4><p>${nuevoPin.direccion}</p></div>`;
    div.addEventListener('click', () => abrirDetallePin(id));
    container.appendChild(div);

    abrirDetallePin(id);
}

function abrirDetallePin(id) {
    idPinSeleccionado = id;
    const pin = pinesGuardados.find(p => p.id === id);
    if (!pin) return;

    mapa.setView([pin.lat, pin.lng], 16);
    
    // CALCULAR VALOR REAL
    const valor = window.calcularContaminacionEnUbicacion 
        ? window.calcularContaminacionEnUbicacion(pin.lat, pin.lng) 
        : 0;

    document.getElementById('detail-pin-title').innerText = pin.nombre;
    document.getElementById('detail-direccion').innerText = pin.direccion;
    
    const txtVal = document.getElementById('ozono-value');
    txtVal.innerText = `${valor} ${configGasActual.unidad}`;
    
    // Ajustar Slider (Solo visual)
    const slider = document.getElementById('ozono-slider');
    // Para que el slider se vea bien, necesitamos saber el máximo, pero simplificamos:
    // Si valor > 100 asumimos escala grande, si < 1 asumimos escala pequeña
    let maxSlider = valor > 50 ? 500 : 1;
    slider.max = maxSlider;
    slider.value = valor;

    document.getElementById('pin-list-view').style.display = 'none';
    document.getElementById('pin-detail-view').style.display = 'block';
}

window.mostrarListaPines = function() {
    document.getElementById('pin-list-view').style.display = 'block';
    document.getElementById('pin-detail-view').style.display = 'none';
    idPinSeleccionado = null;
    mapa.closePopup();
};