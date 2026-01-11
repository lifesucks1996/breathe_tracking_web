/**
 * @file faq.js
 * @brief Módulo de Preguntas Frecuentes (FAQ) con interactividad completa.
 * @details
 * Gestiona la funcionalidad de la página de FAQ incluyendo:
 * - Apertura/cierre de respuestas con animación suave
 * - Navegación desde tabla de contenidos con scroll suave
 * - Soporte de accesibilidad (ARIA, navegación por teclado)
 * - Búsqueda de preguntas (función disponible)
 * - Gestión de secciones (abrir/cerrar múltiples items)
 * - Impresión de FAQ
 *
 * @version 1.0
 * @author Breathe Tracking Team
 */

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    inicializarFAQ();
    inicializarScrollNavegacion();
});

/**
 * @brief Inicializa todos los elementos FAQ y asigna listeners de eventos.
 * @details
 * Selecciona todos los elementos con clase 'faq-question' y añade un
 * listener de clic a cada uno para abrir/cerrar su respuesta correspondiente.
 * void -> void
 * @return void
 */
function inicializarFAQ() {
    const preguntas = document.querySelectorAll('.faq-question');
    
    preguntas.forEach(pregunta => {
        pregunta.addEventListener('click', function() {
            abrirCerrarRespuesta(this);
        });
    });
}

/**
 * @brief Alterna la apertura/cierre de una respuesta FAQ con animación suave.
 * @details
 * Si la pregunta está cerrada, la abre y hace scroll suave hacia ella.
 * Si está abierta, simplemente la cierra.
 * Actualiza el atributo aria-expanded para accesibilidad.
 *
 * @param {Element} elemento - El botón .faq-question clickeado
 * @return void
 */
function abrirCerrarRespuesta(elemento) {
    const item = elemento.closest('.faq-item');
    const yaAbierto = item.classList.contains('active');
    
    // Cerrar todos los items abiertos (opcional: descomenta para acordeón)
    // cerrarTodas();
    
    // Alternar el estado del item actual
    if (yaAbierto) {
        item.classList.remove('active');
        // Animar el cierre
        elemento.setAttribute('aria-expanded', 'false');
    } else {
        item.classList.add('active');
        // Animar la apertura
        elemento.setAttribute('aria-expanded', 'true');
        
        // Scroll suave hacia la pregunta abierta
        elemento.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * @brief Cierra todas las respuestas FAQ visibles en la página.
 * @details
 * Elimina la clase 'active' de todos los items .faq-item
 * y actualiza los atributos aria-expanded para accesibilidad.
 * Útil para implementar modo acordeón.
 *
 * void -> void
 * @return void
 */
function cerrarTodas() {
    const todosLosItems = document.querySelectorAll('.faq-item');
    todosLosItems.forEach(item => {
        item.classList.remove('active');
        const boton = item.querySelector('.faq-question');
        boton.setAttribute('aria-expanded', 'false');
    });
}

/**
 * @brief Inicializa la navegación desde la tabla de contenidos con scroll suave.
 * @details
 * Asigna listeners a todos los enlaces de la tabla de contenidos.
 * Cuando se hace clic, realiza un scroll suave hacia la sección destino
 * y abre automáticamente el primer FAQ de esa sección.
 *
 * void -> void
 * @return void
 */
function inicializarScrollNavegacion() {
    const enlaces = document.querySelectorAll('.table-of-contents a');
    
    enlaces.forEach(enlace => {
        enlace.addEventListener('click', function(e) {
            e.preventDefault();
            
            const idDestino = this.getAttribute('href').substring(1);
            const elemento = document.getElementById(idDestino);
            
            if (elemento) {
                // Scroll suave hacia la sección
                elemento.scrollIntoView({ behavior: 'smooth' });
                
                // Opcional: Abrir el primer FAQ de la sección
                abrirPrimerFAQDelaSección(elemento);
            }
        });
    });
}

/**
 * @brief Abre el primer item FAQ de una sección específica.
 * @details
 * Busca el primer elemento .faq-item dentro de la sección proporcionada.
 * Si existe y no está activo, lo activa y actualiza aria-expanded.
 *
 * @param {Element} seccion - La sección (elemento DOM) a procesar
 * @return void
 */
function abrirPrimerFAQDelaSección(seccion) {
    const primerItem = seccion.querySelector('.faq-item');
    if (primerItem && !primerItem.classList.contains('active')) {
        primerItem.classList.add('active');
        const boton = primerItem.querySelector('.faq-question');
        boton.setAttribute('aria-expanded', 'true');
    }
}

/**
 * @brief Busca preguntas FAQ según un término de búsqueda.
 * @details
 * Filtra los items FAQ mostrando solo aquellos cuya pregunta o respuesta
 * contenga el término buscado (case-insensitive).
 * Oculta el resto mediante display: 'none'.
 *
 * @param {string} termino - El término a buscar en preguntas y respuestas
 * @return void
 */
function buscarPreguntas(termino) {
    const items = document.querySelectorAll('.faq-item');
    const terminoLower = termino.toLowerCase();
    
    items.forEach(item => {
        const pregunta = item.querySelector('.faq-question .question-text').textContent.toLowerCase();
        const respuesta = item.querySelector('.faq-answer').textContent.toLowerCase();
        
        if (pregunta.includes(terminoLower) || respuesta.includes(terminoLower)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * @brief Listener de teclado para navegar FAQ con Tab + Enter (accesibilidad).
 * @details
 * Permite a usuarios navegar el FAQ usando solo teclado.
 * Enter abre/cierra la pregunta enfocada.
 * Previene el comportamiento por defecto de Enter cuando se enfoca un .faq-question.
 *
 * @event keydown - Se dispara cuando se presiona una tecla
 * @return void
 */
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const elemento = document.activeElement;
        if (elemento.classList.contains('faq-question')) {
            event.preventDefault();
            abrirCerrarRespuesta(elemento);
        }
    }
});

// ===== UTILIDADES =====

/**
 * @brief Abre todos los items FAQ de una sección específica.
 * @details
 * Busca la sección por su ID y abre todos los .faq-item dentro.
 * Actualiza los atributos aria-expanded para accesibilidad.
 *
 * @param {string} idSeccion - El ID HTML de la sección a expandir
 * @return void
 */
function abrirTodosDeLaSección(idSeccion) {
    const seccion = document.getElementById(idSeccion);
    if (!seccion) return;
    
    const items = seccion.querySelectorAll('.faq-item');
    items.forEach(item => {
        item.classList.add('active');
        const boton = item.querySelector('.faq-question');
        boton.setAttribute('aria-expanded', 'true');
    });
}

/**
 * @brief Cierra todos los items FAQ de una sección específica.
 * @details
 * Busca la sección por su ID y cierra todos los .faq-item dentro.
 * Actualiza los atributos aria-expanded para accesibilidad.
 *
 * @param {string} idSeccion - El ID HTML de la sección a contraer
 * @return void
 */
function cerrarTodosDeLaSección(idSeccion) {
    const seccion = document.getElementById(idSeccion);
    if (!seccion) return;
    
    const items = seccion.querySelectorAll('.faq-item');
    items.forEach(item => {
        item.classList.remove('active');
        const boton = item.querySelector('.faq-question');
        boton.setAttribute('aria-expanded', 'false');
    });
}

/**
 * @brief Abre el diálogo de impresión del navegador para imprimir la página FAQ.
 * @details
 * Invoca window.print() para abrir el cuadro de diálogo de impresión.
 * El CSS @media print puede personalizar la salida de impresión.
 *
 * void -> void
 * @return void
 */
function imprimirFAQ() {
    window.print();
}

// Exportar funciones si se usa como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        inicializarFAQ,
        abrirCerrarRespuesta,
        buscarPreguntas,
        abrirTodosDeLaSección,
        cerrarTodosDeLaSección,
        imprimirFAQ
    };
}
