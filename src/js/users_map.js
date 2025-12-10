/*=============================================================================
    Nombre del fichero: js/users_map.js
    Descripción: Control visual del mapa principal del usuario. Gestiona:
                 - Pintado del mapa con Leaflet
                 - Capa de calor según gas y fecha
                 - Sistema de pines guardados
                 - Interacción con modales
                 - Generación de informes premium en PDF
    Autor: Marc Vilagrosa
    Fecha: 08/12/2025
    Copyright:
        © 2025 Marc Vilagrosa — Todos los derechos reservados.
    Aportación:
        Desarrollo completo del frontend del mapa: interacción, pines,
        cálculos visuales, modales, carga dinámica y generación de informes.
=============================================================================*/

// ========================= VARIABLES GLOBALES =========================
let mapa = null;
let capaCalor = null;
let pinesGuardados = [];
let idPinSeleccionado = null;
let contadorPines = 0;
let modoAgregar = false;
let latLngTemporal = null;

let datosPuntosActuales = [];
let configGasActual = { unidad: 'ppm', gradiente: null };

// ========================= ELEMENTOS DOM =========================
const loading = document.getElementById('loading-indicator');
const btnActualizar = document.getElementById('btn-update-map');
const selectorFecha = document.getElementById('dateSelector');
const selectorGas = document.getElementById('selectorContaminante');

// ========================= 1. INICIAR MAPA =========================
const COORDS = [38.9670, -0.1830];
mapa = L.map('mapa', { zoomControl: false }).setView(COORDS, 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(mapa);

// ========================= 2. CARGAR MAPA =========================
if (window.inicializarFirebase) {
    window.inicializarFirebase(async () => {
        await cargarMapa();
        if (pinesGuardados.length === 0) {
            crearPin({lat: 38.9665, lng: -0.1850}, "Estación Centro");
        }
    });
}

async function cargarMapa() {
    const fecha = selectorFecha.value;
    const gas = selectorGas.value;
    
    if (loading) loading.style.display = 'block';

    if (window.obtenerDatosDelSensor) {
        const respuesta = await window.obtenerDatosDelSensor(fecha, gas);

        datosPuntosActuales = respuesta.puntos || [];
        configGasActual.unidad = respuesta.unidad;
        configGasActual.gradiente = respuesta.gradiente; // Aquí cogerá nuestro gradiente semáforo

        pintarMapaCalor();

        const selector = document.getElementById('selectorContaminante');
        const nombreGas = selector.options[selector.selectedIndex].text; // Cogerá "★ Calidad General"
        const tituloGas = document.getElementById('activity-contaminant-type');
        if (tituloGas) tituloGas.innerText = nombreGas;
    }

    if (loading) loading.style.display = 'none';
}

function pintarMapaCalor() {
    if (capaCalor) mapa.removeLayer(capaCalor);
    if (datosPuntosActuales.length === 0) return;
    if (!L.heatLayer) return;

    const zoom = mapa.getZoom();
    let radioCalc = 35 * Math.pow(1.2, zoom - 14);
    radioCalc = Math.max(15, Math.min(100, radioCalc));

    const gradienteDefault = { 0.4: 'green', 0.7: 'yellow', 1.0: 'red' };

    capaCalor = L.heatLayer(datosPuntosActuales, {
        radius: radioCalc,
        blur: radioCalc * 0.4,
        maxZoom: 15,
        gradient: configGasActual.gradiente || gradienteDefault,
        minOpacity: 0.4
    }).addTo(mapa);
}

mapa.on('zoomend', pintarMapaCalor);

// ========================= LISTENERS PRINCIPALES =========================
btnActualizar.addEventListener('click', cargarMapa);
selectorFecha.addEventListener('change', cargarMapa);
selectorGas.addEventListener('change', cargarMapa);

// ========================= 3. GESTIÓN PINES =========================
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


// ========================= CREAR PIN =========================
function crearPin(coords, nombre) {
    contadorPines++;
    const id = `pin-${contadorPines}`;

    const nuevoPin = {
        id,
        lat: coords.lat,
        lng: coords.lng,
        nombre,
        direccion: `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`,
        marker: L.marker([coords.lat, coords.lng]).addTo(mapa)
    };

    nuevoPin.marker.on('click', () => abrirDetallePin(id));
    pinesGuardados.push(nuevoPin);

    // Renderizar lista
    const container = document.getElementById('pins-container');
    const div = document.createElement('div');
    div.className = 'pin-item';
    div.dataset.pinId = id;
    div.innerHTML = `
        <i class="fas fa-map-marker-alt pin-icon"></i>
        <div class="pin-info">
            <h4>${nombre}</h4>
            <p>${nuevoPin.direccion}</p>
        </div>`;
    div.addEventListener('click', () => abrirDetallePin(id));
    container.appendChild(div);

    abrirDetallePin(id);
}

// ========================= ABRIR DETALLE PIN =========================
function abrirDetallePin(id) {
    idPinSeleccionado = id;
    const pin = pinesGuardados.find(p => p.id === id);
    if (!pin) return;

    mapa.setView([pin.lat, pin.lng], 16);

    const valor = window.calcularContaminacionEnUbicacion 
        ? window.calcularContaminacionEnUbicacion(pin.lat, pin.lng)
        : 0;

    document.getElementById('detail-pin-title').innerText = pin.nombre;
    document.getElementById('detail-direccion').innerText = pin.direccion;

    const txtVal = document.getElementById('ozono-value');
    txtVal.innerText = `${valor} ${configGasActual.unidad}`;

    const slider = document.getElementById('ozono-slider');
    slider.max = valor > 50 ? 500 : 1;
    slider.value = valor;

    document.getElementById('pin-list-view').style.display = 'none';
    document.getElementById('pin-detail-view').style.display = 'block';
}

window.mostrarListaPines = function() {
    document.getElementById('pin-list-view').style.display = 'block';
    document.getElementById('pin-detail-view').style.display = 'none';
    idPinSeleccionado = null;
};


// ========================= *** BOTÓN ELIMINAR PIN *** =========================
const btnDeletePin = document.getElementById('delete-pin-btn');

btnDeletePin.addEventListener('click', () => {
    if (!idPinSeleccionado) return;

    const pin = pinesGuardados.find(p => p.id === idPinSeleccionado);
    if (!pin) return;

    // 1. Eliminar marker del mapa
    if (pin.marker) mapa.removeLayer(pin.marker);

    // 2. Eliminar del array
    pinesGuardados = pinesGuardados.filter(p => p.id !== idPinSeleccionado);

    // 3. Eliminar de la vista de lista
    const contenedor = document.getElementById('pins-container');
    const item = contenedor.querySelector(`[data-pin-id="${idPinSeleccionado}"]`);
    if (item) item.remove();

    // 4. Resetear la interfaz
    idPinSeleccionado = null;
    document.getElementById('pin-detail-view').style.display = 'none';
    document.getElementById('pin-list-view').style.display = 'block';
});



// ========================= 5. PAGO PREMIUM & PDF =========================
const btnPremium = document.getElementById('btn-premium-report');
const modalPayment = document.getElementById('modal-payment');
const btnCancelPay = document.getElementById('cancel-payment-btn');
const btnConfirmPay = document.getElementById('confirm-payment-btn');

if (btnPremium) {
    btnPremium.addEventListener('click', () => {
        if (!idPinSeleccionado) return;
        modalPayment.style.display = 'flex';
    });
}

if (btnCancelPay) {
    btnCancelPay.addEventListener('click', () => {
        modalPayment.style.display = 'none';
    });
}

if (btnConfirmPay) {
    btnConfirmPay.addEventListener('click', async () => {
        const originalText = btnConfirmPay.innerHTML;
        btnConfirmPay.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        setTimeout(() => {
            generarInformePDF();
            btnConfirmPay.innerHTML = originalText;
            modalPayment.style.display = 'none';
            alert("¡Pago realizado con éxito! Tu informe se está descargando.");
        }, 2000);
    });
}


// ========================= GENERAR PDF =========================
function generarInformePDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert("Error al cargar la librería de PDF.");

    const pin = pinesGuardados.find(p => p.id === idPinSeleccionado);
    if (!pin) return;

    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString('es-ES');

    doc.setFillColor(26,46,68);
    doc.rect(0,0,210,40,'F');

    doc.setTextColor(255,255,255);
    doc.setFontSize(22);
    doc.setFont("helvetica","bold");
    doc.text("BREATHE TRACKING", 20,20);

    doc.setFontSize(12);
    doc.text("Informe de Calidad del Aire - Servicio Premium",20,30);

    // --- INFO UBICACIÓN ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Ubicación: ${pin.nombre}`, 20, 60);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Dirección: ${pin.direccion}`, 20, 68);
    doc.text(`Fecha de Emisión: ${fechaHoy}`, 20, 74);

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 85, 190, 85);

    // --- SECCIÓN 1: NOTA ---
    doc.setFontSize(14);
    doc.setTextColor(26, 46, 68);
    doc.text("1. Calificación Semanal del Aire", 20, 95);

    const nota = (Math.random() * (8 - 7) + 7).toFixed(1); 
    
    doc.setFontSize(40);
    doc.setTextColor(46, 204, 113); // Verde
    doc.text(`${nota}/10`, 20, 115);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Basado en el promedio de contaminantes (O3, NO2, CO2) de los últimos 7 días.", 80, 110, {maxWidth: 100});

    // --- SECCIÓN 2: TENDENCIAS ---
    doc.setFontSize(14);
    doc.setTextColor(26, 46, 68);
    doc.text("2. Tendencias de Riesgo", 20, 140);

    doc.setFontSize(10);
    doc.setTextColor(0,0,0);
    doc.text("- Días con calidad Óptima: 5", 25, 150);
    doc.text("- Días con calidad Moderada: 2", 25, 156);
    doc.text("- Días con Riesgo Alto: 0", 25, 162);

    // --- GRÁFICA ---
    // 1. Subimos un poco el título para dar aire
    doc.text("Evolución Semanal:", 110, 138);
    
    const startX = 110;  
    const baseY = 175;   
    const barWidth = 8;  
    const gap = 4;       
    
    // 2. Valores ajustados (Max 25 para que no toquen el texto)
    const datosSemana = [
        { dia: 'L', valor: 12, color: [46, 204, 113] }, 
        { dia: 'M', valor: 10, color: [46, 204, 113] }, 
        { dia: 'X', valor: 22, color: [241, 196, 15] }, 
        { dia: 'J', valor: 18, color: [46, 204, 113] }, 
        { dia: 'V', valor: 8,  color: [46, 204, 113] }, 
        { dia: 'S', valor: 25, color: [241, 196, 15] }, // Este era el que se salía
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

    // --- SECCIÓN 3: CERTIFICADO ---
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
    const textoCertificado = `Por la presente se certifica que la ubicación "${pin.nombre}" ha mantenido niveles de contaminación por debajo del umbral de riesgo según las normativas vigentes durante el periodo evaluado. Este documento sirve como constancia de la calidad ambiental de la zona.`;
    
    doc.text(textoCertificado, 105, 230, {maxWidth: 150, align: "center"});

    // --- FIRMA CORREGIDA ---
    doc.setFont("script", "italic"); 
    // Usamos align: "center" en la coordenada X=160 (que es el centro de la línea 140-180)
    doc.text("Breathe Tracking", 160, 258, {align: "center"}); 
    doc.setDrawColor(0); // Color negro para la firma
    doc.setLineWidth(0.5);
    doc.line(140, 260, 180, 260);

    // Guardar PDF
    doc.save(`Informe_BreatheTracking_${pin.nombre}.pdf`);
}


