/**
 * @file users_map.js
 * @brief Controlador visual del mapa interactivo del usuario.
 * @details
 * Este script orquesta la interfaz de usuario del mapa principal. Sus funciones incluyen:
 * 1. Inicialización y configuración del mapa Leaflet.
 * 2. Gestión de capas de visualización (Mapa de calor dinámico).
 * 3. Lógica de interacción para añadir, listar y borrar marcadores personales (Pines).
 * 4. Simulación de datos en tiempo real para la vista de detalle.
 * 5. Generación de informes PDF del lado del cliente usando jsPDF.
 */

/*=============================================================================
    Nombre del fichero: js/users_map.js
    Descripción: Control visual del mapa principal del usuario.
    Autor: Marc Vilagrosa
    Fecha: 08/12/2025
=============================================================================*/

// ========================= VARIABLES GLOBALES =========================
let mapa = null;
let capaCalor = null;        // Referencia a la capa de Leaflet.heat
let pinesGuardados = [];     // Almacén local de pines en memoria
let idPinSeleccionado = null;
let contadorPines = 0;       // Generador de IDs secuenciales simples
let modoAgregar = false;     // Estado de la máquina de estados (Navegación vs Edición)
let latLngTemporal = null;   // Almacena coord. del clic antes de confirmar nombre

// Cache local de datos visuales para redibujado rápido sin peticiones extra
let datosPuntosActuales = [];
let configGasActual = { unidad: 'ppm', gradiente: null };

// ========================= ELEMENTOS DOM =========================
const loading = document.getElementById('loading-indicator');
const btnActualizar = document.getElementById('btn-update-map');
const selectorFecha = document.getElementById('dateSelector');
const selectorGas = document.getElementById('selectorContaminante');

// ========================= 1. INICIAR MAPA =========================
/**
 * @brief Configuración inicial del objeto mapa de Leaflet.
 * @note Se desactiva el control de zoom por defecto para usar una UI personalizada si fuera necesario,
 * o simplemente para limpieza visual.
 */
const COORDS = [38.9670, -0.1830]; // Coordenadas centradas en Gandia
mapa = L.map('mapa', { zoomControl: false }).setView(COORDS, 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(mapa);

// ========================= 2. CARGAR MAPA =========================
// Hook de entrada: Espera a que users_map_data.js exponga la función de inicialización
if (window.inicializarFirebase) {
    window.inicializarFirebase(async () => {
        await cargarMapa();
        // Pin de ejemplo para que el mapa no se vea vacío al inicio
        if (pinesGuardados.length === 0) {
            crearPin({lat: 38.9665, lng: -0.1850}, "Estación Centro");
        }
    });
}

/**
 * @brief Orquesta la petición de datos y la actualización visual del mapa.
 * (DOM State) -> cargarMapa() -> Promise<void>
 * * @details
 * 1. Lee los valores de los selectores HTML (Fecha y Tipo de Gas).
 * 2. Llama a la capa de datos (`window.obtenerDatosDelSensor`) para traer los puntos procesados.
 * 3. Actualiza las variables globales de configuración (gradiente, unidad).
 * 4. Llama a `pintarMapaCalor` para renderizar.
 * 5. Actualiza títulos de la UI.
 */
async function cargarMapa() {
    const fecha = selectorFecha.value;
    const gas = selectorGas.value;
    
    if (loading) loading.style.display = 'block';

    if (window.obtenerDatosDelSensor) {
        // Llamada asíncrona al módulo de datos (users_map_data.js)
        const respuesta = await window.obtenerDatosDelSensor(fecha, gas);

        datosPuntosActuales = respuesta.puntos || [];
        configGasActual.unidad = respuesta.unidad;
        configGasActual.gradiente = respuesta.gradiente; // Aquí cogerá nuestro gradiente semáforo personalizado

        pintarMapaCalor();

        // Actualización de textos en la interfaz
        const selector = document.getElementById('selectorContaminante');
        const nombreGas = selector.options[selector.selectedIndex].text; 
        const tituloGas = document.getElementById('activity-contaminant-type');
        if (tituloGas) tituloGas.innerText = nombreGas;
    }

    if (loading) loading.style.display = 'none';
}

/**
 * @brief Renderiza la capa de calor (Heatmap) sobre el mapa base.
 * (global: datosPuntosActuales) -> pintarMapaCalor() -> void
 * * @details
 * Elimina la capa anterior si existe para evitar superposiciones.
 * Calcula el radio de los puntos dinámicamente basándose en el nivel de zoom actual
 * para mantener la visibilidad consistente al acercar/alejar.
 * Usa `L.heatLayer` (plugin de Leaflet).
 */
function pintarMapaCalor() {
    if (capaCalor) mapa.removeLayer(capaCalor);
    if (datosPuntosActuales.length === 0) return;
    if (!L.heatLayer) return;

    const zoom = mapa.getZoom();
    
    // Fórmula heurística para ajustar el tamaño del 'borrón' del heatmap según el zoom
    let radioCalc = 35 * Math.pow(1.2, zoom - 14);
    radioCalc = Math.max(15, Math.min(100, radioCalc)); // Clamp entre 15 y 100

    const gradienteDefault = { 0.4: 'green', 0.7: 'yellow', 1.0: 'red' };

    capaCalor = L.heatLayer(datosPuntosActuales, {
        radius: radioCalc,
        blur: radioCalc * 0.4,
        maxZoom: 15,
        gradient: configGasActual.gradiente || gradienteDefault,
        minOpacity: 0.4
    }).addTo(mapa);
}

// Re-pintar al hacer zoom para recalcular el radio
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
            // Cambio visual del botón para indicar estado activo
            btnAdd.style.backgroundColor = '#e74c3c';
            btnAdd.innerHTML = '<i class="fas fa-times"></i> Cancelar';
            document.getElementById('mapa').style.cursor = 'crosshair'; // Cursor en cruz
            mapa.on('click', alHacerClickMapa);
        } else {
            resetearModoAgregar();
        }
    });
}

/**
 * @brief Restaura el estado de la interfaz al modo de navegación normal.
 * (void) -> resetearModoAgregar() -> void
 * * @details
 * Quita el listener de clic del mapa, restaura el cursor y el estilo del botón.
 */
function resetearModoAgregar() {
    modoAgregar = false;
    btnAdd.style.backgroundColor = '';
    btnAdd.innerHTML = '<i class="fas fa-map-marker-alt"></i> Añadir Marcador';
    document.getElementById('mapa').style.cursor = '';
    mapa.off('click', alHacerClickMapa);
}

/**
 * @brief Manejador del clic en el mapa cuando se está en 'Modo Agregar'.
 * e:LeafletEvent -> alHacerClickMapa() -> void
 * * @details
 * Captura las coordenadas del evento clic. Muestra el modal para pedir nombre al usuario.
 */
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
/**
 * @brief Instancia un nuevo marcador en el mapa y en la lista lateral.
 * coords:Object, nombre:string -> crearPin() -> void
 * * @details
 * 1. Crea un objeto de datos para el pin.
 * 2. Añade un `L.marker` al mapa.
 * 3. Añade un elemento HTML a la lista lateral ('pins-container').
 * 4. Configura listeners para abrir el detalle al hacer clic.
 */
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

    // Renderizar lista lateral (DOM)
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

    // Abrimos directamente el detalle del nuevo pin
    abrirDetallePin(id);
}

// ========================= ABRIR DETALLE PIN =========================
/**
 * @brief Muestra la vista detallada de un pin específico.
 * id:string -> abrirDetallePin() -> void
 * * @details
 * 1. Busca el pin en el array `pinesGuardados`.
 * 2. Centra el mapa en el pin.
 * 3. Llama a `window.calcularContaminacionEnUbicacion` (del archivo de datos) para interpolar el valor en ese punto exacto.
 * 4. Simula datos temporales (hora de última medición).
 * 5. Actualiza el DOM (Slider, textos) y cambia la vista de 'Lista' a 'Detalle'.
 */
function abrirDetallePin(id) {
    idPinSeleccionado = id;
    const pin = pinesGuardados.find(p => p.id === id);
    if (!pin) return;

    mapa.setView([pin.lat, pin.lng], 16);

    // Interacción con la capa de datos para obtener valor real interpolado
    const valor = window.calcularContaminacionEnUbicacion 
        ? window.calcularContaminacionEnUbicacion(pin.lat, pin.lng)
        : 0;

    document.getElementById('detail-pin-title').innerText = pin.nombre;
    document.getElementById('detail-direccion').innerText = pin.direccion;

    // --- SIMULACIÓN DE HORA (Mejora de UX) ---
    // Generamos una fecha actual y le restamos entre 0 y 45 minutos aleatorios
    const fechaSimulada = new Date();
    fechaSimulada.setMinutes(fechaSimulada.getMinutes() - Math.floor(Math.random() * 45));
    
    const horas = fechaSimulada.getHours().toString().padStart(2, '0');
    const minutos = fechaSimulada.getMinutes().toString().padStart(2, '0');
    const horaTexto = `${horas}:${minutos}`;

    document.getElementById('detail-ultimas-mediciones').innerText = horaTexto;
    // ------------------------------------------

    const txtVal = document.getElementById('ozono-value');
    txtVal.innerText = `${valor} ${configGasActual.unidad}`;

    const slider = document.getElementById('ozono-slider');
    // Ajuste dinámico de escala del slider según magnitud del valor
    slider.max = valor > 50 ? 500 : 1; 
    
    if(valor < 1) slider.max = 1;
    else if(valor < 100) slider.max = 100;
    
    slider.value = valor;

    // Cambio de vista (Toggle)
    document.getElementById('pin-list-view').style.display = 'none';
    document.getElementById('pin-detail-view').style.display = 'block';

    /**
     * @brief Función interna (Closure) para regresar a la lista.
     * Se define aquí para tener contexto, aunque podría ser global.
     */
    window.mostrarListaPines = function() {
        document.getElementById('pin-detail-view').style.display = 'none';
        document.getElementById('pin-list-view').style.display = 'block';
        idPinSeleccionado = null;
    };
}


// ========================= *** BOTÓN ELIMINAR PIN *** =========================
const btnDeletePin = document.getElementById('delete-pin-btn');

btnDeletePin.addEventListener('click', () => {
    if (!idPinSeleccionado) return;

    const pin = pinesGuardados.find(p => p.id === idPinSeleccionado);
    if (!pin) return;

    // 1. Eliminar marker del mapa (Leaflet)
    if (pin.marker) mapa.removeLayer(pin.marker);

    // 2. Eliminar del array en memoria
    pinesGuardados = pinesGuardados.filter(p => p.id !== idPinSeleccionado);

    // 3. Eliminar de la vista de lista (DOM)
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
        // Feedback visual de carga
        btnConfirmPay.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        // Simulación de proceso de pago asíncrono
        setTimeout(() => {
            generarInformePDF();
            btnConfirmPay.innerHTML = originalText;
            modalPayment.style.display = 'none';
            alert("¡Pago realizado con éxito! Tu informe se está descargando.");
        }, 2000);
    });
}


// ========================= GENERAR PDF =========================
/**
 * @brief Genera y descarga un informe PDF detallado usando jsPDF.
 * (global: idPinSeleccionado) -> generarInformePDF() -> void
 * * @details
 * Construye un documento PDF vectorial paso a paso:
 * 1. Encabezado corporativo con fondo de color.
 * 2. Detalles de ubicación y fecha.
 * 3. Generación aleatoria de una "Calificación Semanal" (Simulación de análisis avanzado).
 * 4. Dibujado manual de una gráfica de barras usando coordenadas geométricas (`doc.rect`).
 * 5. Inserción de un certificado y firma digital simulada.
 * * @note Requiere que la librería `jspdf` esté cargada en el window global.
 */
function generarInformePDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert("Error al cargar la librería de PDF.");

    const pin = pinesGuardados.find(p => p.id === idPinSeleccionado);
    if (!pin) return;

    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString('es-ES');

    // Header Azul
    doc.setFillColor(26,46,68);
    doc.rect(0,0,210,40,'F'); // x, y, w, h, style

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

    // Simulación: Genera nota entre 7.0 y 8.0
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

    // --- GRÁFICA DE BARRAS MANUAL ---
    doc.text("Evolución Semanal:", 110, 138);
    
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
    doc.line(startX, baseY, startX + (barWidth + gap) * 7, baseY); // Eje X

    // Renderizado de cada barra iterando sobre los datos
    datosSemana.forEach((dato, index) => {
        const xPos = startX + (index * (barWidth + gap));
        
        doc.setFillColor(dato.color[0], dato.color[1], dato.color[2]);
        doc.rect(xPos, baseY - dato.valor, barWidth, dato.valor, 'F'); // x, y, w, h, style

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

    // --- FIRMA ---
    doc.setFont("script", "italic"); // Intenta usar una fuente cursiva si está disponible
    doc.text("Breathe Tracking", 160, 258, {align: "center"}); 
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(140, 260, 180, 260);

    // Descarga final del archivo
    doc.save(`Informe_BreatheTracking_${pin.nombre}.pdf`);
}