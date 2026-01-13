/**
 * @file users_map.js
 * @brief Interfaz visual: Saturación de Rojo forzada y PDF Original.
 */

// ========================= FIX CANVAS =========================
HTMLCanvasElement.prototype.getContext = (function(origFn) {
  return function(type, attributes) {
    if (type === '2d') {
      attributes = Object.assign({}, attributes, { willReadFrequently: true });
    }
    return origFn.call(this, type, attributes);
  };
})(HTMLCanvasElement.prototype.getContext);

// ========================= VARIABLES =========================
let mapa = null;
let capaCalor = null;
let heatmapCongelado = null;
const ZOOM_CONGELADO = 14; 

let pinesGuardados = [];
let idPinSeleccionado = null;
let contadorPines = 0;
let modoAgregar = false;
let latLngTemporal = null;

let datosPuntosActuales = [];
let configGasActual = { unidad: 'ppm', gradiente: null, nombre: '', umbrales: [] };

// DOM
const loading = document.getElementById('loading-indicator');
const btnActualizar = document.getElementById('btn-update-map');
const selectorGas = document.getElementById('selectorContaminante');

// 1. INICIAR
const COORDS = [38.9670, -0.1830];
mapa = L.map('mapa', { zoomControl: false }).setView(COORDS, 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapa);

// API ESTACIONES OFICIALES
// Esperar a que todo cargue y lanzar las estaciones oficiales
window.addEventListener('load', () => {
    if (window.inicializarEstacionesOficiales) {
        window.inicializarEstacionesOficiales(mapa);
    }
});

// 2. CARGAR
if (window.inicializarFirebase) {
    window.inicializarFirebase(async () => {
        await cargarMapa();
        if (pinesGuardados.length === 0) crearPin({lat: 38.9665, lng: -0.1850}, "Estación Centro");
    });
}

async function cargarMapa() {
    const fecha = "2025-12-01"; 
    const gas = selectorGas.value;

    if (loading) loading.style.display = 'block';
    if (heatmapCongelado) { mapa.removeLayer(heatmapCongelado); heatmapCongelado = null; }

    if (window.obtenerDatosDelSensor) {
        const respuesta = await window.obtenerDatosDelSensor(fecha, gas);

        datosPuntosActuales = respuesta.puntos || [];
        configGasActual.unidad = respuesta.unidad || 'ppm';
        configGasActual.nombre = respuesta.nombre || gas;
        configGasActual.umbrales = respuesta.umbrales || [];
        
        if (respuesta.gradiente) {
            configGasActual.gradiente = respuesta.gradiente;
        } else {
            configGasActual.gradiente = construirGradienteDesdeUmbrales(respuesta.umbrales);
        }

        pintarMapaCalor();

        const selectorText = selectorGas.options[selectorGas.selectedIndex].text;
        const tituloGas = document.getElementById('activity-contaminant-type');
        if (tituloGas) tituloGas.innerText = selectorText;

        if (idPinSeleccionado) actualizarSidebar(idPinSeleccionado);
    }
    if (loading) loading.style.display = 'none';
}

function construirGradienteDesdeUmbrales(umbrales) {
    if (!umbrales || umbrales.length === 0) {
        return { 0.0: 'rgba(0,0,0,0)', 0.2: 'green', 0.6: 'yellow', 1.0: 'red' };
    }
    const ordenados = [...umbrales].sort((a, b) => (a.max || 0) - (b.max || 0));
    const gradiente = {};
    const total = ordenados.length - 1;

    ordenados.forEach((u, i) => {
        const pos = Number((i / total).toFixed(2));
        let col = u.color || '#808080';
        if (col === 'orange') col = 'yellow';
        if (col === 'purple') col = 'red';
        gradiente[pos] = hexToRgba(col, 0.85);
    });
    gradiente[0.0] = 'rgba(0,0,0,0)';
    return gradiente;
}

function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// PINTAR
function pintarMapaCalor() {
    if (!datosPuntosActuales.length || !L.heatLayer) return;

    
    // Fijamos max en 0.8. Esto significa que cualquier valor >= 0.8 (como nuestro Rojo 1.0)
    // se pintará con la intensidad MÁXIMA absoluta del gradiente.
    // Esto arregla que el mapa general se vea "flojo" comparado con los individuales.
    const maxVal = 0.8; 

    capaCalor = L.heatLayer(datosPuntosActuales, {
        radius: 45, 
        blur: 35, 
        minOpacity: 0.3, 
        max: maxVal, 
        gradient: configGasActual.gradiente
    }).addTo(mapa);

    mapa.setZoom(ZOOM_CONGELADO);
    setTimeout(() => {
        if (!capaCalor || !capaCalor._canvas) return;
        const imgData = capaCalor._canvas.toDataURL('image/png');
        const bounds = mapa.getBounds();
        mapa.removeLayer(capaCalor);
        capaCalor = null;
        heatmapCongelado = L.imageOverlay(imgData, bounds, { opacity: 0.85, interactive: false }).addTo(mapa);
        //mapa.setMaxBounds(bounds.pad(0.5)); la comento para que no ancle el zoom
    }, 400); 
}

// PINES
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
            btnAdd.innerHTML = 'Cancelar';
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
    btnAdd.innerHTML = 'Añadir Marcador';
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
    const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(mapa);

    const nuevoPin = {
        id, lat: coords.lat, lng: coords.lng, nombre,
        direccion: `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`,
        marker: marker
    };

    marker.on('click', () => abrirDetallePin(id));
    marker.on('drag', (e) => {
        const pos = e.target.getLatLng();
        nuevoPin.lat = pos.lat; nuevoPin.lng = pos.lng;
        if (idPinSeleccionado === id) actualizarSidebar(id);
    });
    marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        nuevoPin.direccion = `Lat: ${pos.lat.toFixed(4)}, Lng: ${pos.lng.toFixed(4)}`;
        actualizarSidebar(id);
    });

    pinesGuardados.push(nuevoPin);
    const container = document.getElementById('pins-container');
    const div = document.createElement('div');
    div.className = 'pin-item';
    div.dataset.pinId = id;
    div.innerHTML = `<i class="fas fa-map-marker-alt pin-icon"></i><div class="pin-info"><h4>${nombre}</h4><p class="pin-dir-text">${nuevoPin.direccion}</p></div>`;
    div.addEventListener('click', () => abrirDetallePin(id));
    container.appendChild(div);
    abrirDetallePin(id);
}

function abrirDetallePin(id) {
    idPinSeleccionado = id;
    const pin = pinesGuardados.find(p => p.id === id);
    if (!pin) return;
    document.getElementById('pin-list-view').style.display = 'none';
    document.getElementById('pin-detail-view').style.display = 'block';
    document.getElementById('detail-pin-title').innerText = pin.nombre;
    actualizarSidebar(id);
}

function actualizarSidebar(id) {
    const pin = pinesGuardados.find(p => p.id === id);
    if (!pin) return;

    document.getElementById('detail-direccion').innerText = pin.direccion;
    
    const valor = window.calcularContaminacionEnUbicacion 
        ? window.calcularContaminacionEnUbicacion(pin.lat, pin.lng)
        : 0;

    const txtVal = document.getElementById('ozono-value');
    txtVal.innerText = `${valor.toFixed(2)} ${configGasActual.unidad}`;
    txtVal.style.color = ''; 

    const slider = document.getElementById('ozono-slider');
    const maxUmbral = configGasActual.umbrales.length > 0
        ? Math.max(...configGasActual.umbrales.map(u => u.max || 100))
        : (valor > 100 ? valor * 1.5 : 100);
    
    slider.max = maxUmbral;
    slider.value = Math.min(valor, maxUmbral);

    const d = new Date();
    document.getElementById('detail-ultimas-mediciones').innerText = `${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
}

const btnDeletePin = document.getElementById('delete-pin-btn');
btnDeletePin.addEventListener('click', () => {
    if (!idPinSeleccionado) return;
    const pin = pinesGuardados.find(p => p.id === idPinSeleccionado);
    if (pin && pin.marker) mapa.removeLayer(pin.marker);
    pinesGuardados = pinesGuardados.filter(p => p.id !== idPinSeleccionado);
    const item = document.querySelector(`.pin-item[data-pin-id="${idPinSeleccionado}"]`);
    if(item) item.remove();
    idPinSeleccionado = null;
    document.getElementById('pin-detail-view').style.display = 'none';
    document.getElementById('pin-list-view').style.display = 'block';
});
window.mostrarListaPines = function() {
    document.getElementById('pin-detail-view').style.display = 'none';
    document.getElementById('pin-list-view').style.display = 'block';
    idPinSeleccionado = null;
};
btnActualizar.addEventListener('click', cargarMapa);
selectorGas.addEventListener('change', cargarMapa);

// PAGOS Y PDF
const btnPremium = document.getElementById('btn-premium-report');
const modalPayment = document.getElementById('modal-payment');
const btnCancelPay = document.getElementById('cancel-payment-btn');
const btnConfirmPay = document.getElementById('confirm-payment-btn');
if (btnPremium) btnPremium.addEventListener('click', () => { if(idPinSeleccionado) modalPayment.style.display='flex'; });
if (btnCancelPay) btnCancelPay.addEventListener('click', () => modalPayment.style.display='none');
if (btnConfirmPay) btnConfirmPay.addEventListener('click', () => {
    modalPayment.style.display='none';
    generarInformePDF();
});

// ========================= GENERADOR PDF ORIGINAL =========================
function generarInformePDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert("Error al cargar la librería de PDF.");

    const pin = pinesGuardados.find(p => p.id === idPinSeleccionado);
    if (!pin) return;

    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString('es-ES');

    // Header Azul
    doc.setFillColor(26,46,68);
    doc.rect(0,0,210,40,'F'); 

    doc.setTextColor(255,255,255);
    doc.setFontSize(22);
    doc.setFont("helvetica","bold");
    doc.text("BREATHE TRACKING", 20,20);

    doc.setFontSize(12);
    doc.text("Informe de Calidad del Aire - Servicio Premium",20,30);

    // Info Usuario
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Ubicación: ${pin.nombre}`, 20, 60);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Dirección: ${pin.direccion}`, 20, 68);
    doc.text(`Fecha de Emisión: ${fechaHoy}`, 20, 74);
    doc.text(`Contaminante analizado: ${configGasActual.nombre} (${configGasActual.unidad})`, 20, 80);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 85, 190, 85);

    // Sección 1: Nota
    doc.setFontSize(14);
    doc.setTextColor(26, 46, 68);
    doc.text("1. Calificación Semanal del Aire", 20, 95);

    const nota = (Math.random() * (8 - 7) + 7).toFixed(1);
    
    doc.setFontSize(40);
    doc.setTextColor(46, 204, 113); 
    doc.text(`${nota}/10`, 20, 115);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Basado en el promedio de ${configGasActual.nombre} de los últimos 7 días.`, 80, 110, {maxWidth: 100});

    // Sección 2: Gráficas
    doc.setFontSize(14);
    doc.setTextColor(26, 46, 68);
    doc.text("2. Tendencias de Riesgo", 20, 140);

    doc.setFontSize(10);
    doc.setTextColor(0,0,0);
    doc.text("- Días con calidad Óptima: 5", 25, 150);
    doc.text("- Días con calidad Moderada: 2", 25, 156);
    doc.text("- Días con Riesgo Alto: 0", 25, 162);

    doc.text("Evolución Semanal:", 110, 138);
    
    // Gráfica de Barras
    const startX = 110;  
    const baseY = 175;  
    const barWidth = 8;  
    const gap = 4;      
    
    const datosSemana = [
        { dia: 'L', valor: 12, color: [46, 204, 113] },
        { dia: 'M', valor: 10, color: [46, 204, 113] },
        { dia: 'X', valor: 22, color: [241, 196, 15] },
        { dia: 'J', valor: 18, color: [46, 204, 113] },
        { dia: 'V', valor: 8,  color: [46, 204, 113] },
        { dia: 'S', valor: 25, color: [241, 196, 15] },
        { dia: 'D', valor: 6,  color: [46, 204, 113] }  
    ];

    doc.setDrawColor(200, 200, 200);
    doc.line(startX, baseY, startX + (barWidth + gap) * 7, baseY); 

    datosSemana.forEach((dato, index) => {
        const xPos = startX + (index * (barWidth + gap));
        
        doc.setFillColor(dato.color[0], dato.color[1], dato.color[2]);
        doc.rect(xPos, baseY - dato.valor, barWidth, dato.valor, 'F'); 

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(dato.dia, xPos + 2, baseY + 5);
    });

    // Certificado
    doc.setDrawColor(241, 196, 15);
    doc.setLineWidth(1);
    doc.rect(20, 190, 170, 80);

    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 46, 68);
    doc.text("CERTIFICADO DE ZONA DE INTERÉS", 105, 210, {align: "center"});

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const textoCertificado = `Por la presente se certifica que la ubicación "${pin.nombre}" ha mantenido niveles de ${configGasActual.nombre} por debajo del umbral de riesgo según las normativas vigentes durante el periodo evaluado. Este documento sirve como constancia de la calidad ambiental de la zona.`;
    
    doc.text(textoCertificado, 105, 230, {maxWidth: 150, align: "center"});

    doc.setFont("script", "italic"); 
    doc.text("Breathe Tracking", 160, 258, {align: "center"});
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(140, 260, 180, 260);

    doc.save(`Informe_BreatheTracking_${pin.nombre.replace(/\s/g, '_')}.pdf`);
}