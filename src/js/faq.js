/**
 * @file faq.js
 * @description Funcionalidad para la página de FAQ
 * Maneja la apertura/cierre de preguntas frecuentes
 */

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    inicializarFAQ();
    inicializarScrollNavegacion();
});

/**
 * Inicializa todos los elementos FAQ
 * Añade listeners a los botones de preguntas
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
 * Abre o cierra la respuesta de una pregunta
 * @param {Element} elemento - El botón de pregunta clickeado
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
 * Cierra todas las respuestas FAQ
 * Descomenta la línea en abrirCerrarRespuesta para usar como acordeón
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
 * Maneja la navegación suave desde el índice de contenidos
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
 * Abre el primer item FAQ de una sección
 * @param {Element} seccion - La sección a procesar
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
 * Función para búsqueda de preguntas (opcional)
 * Puedes implementar esto si agregas un buscador
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
 * Accesibilidad: Soporte para teclado
 * Permite navegar con Tab y Enter
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
 * Abre todas las preguntas de una sección
 * @param {string} idSeccion - ID de la sección
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
 * Cierra todas las preguntas de una sección
 * @param {string} idSeccion - ID de la sección
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
 * Imprime la sección FAQ actual
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
