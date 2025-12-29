/**
 * @file users_edit.js
 * @brief Módulo de utilidades para la gestión del modal de edición de perfil.
 */

/**
 * @brief Variable de estado para accesibilidad (A11y).
 */
let elementFocusedBeforeModal = null;

// Helpers internos para selección de elementos del DOM
const getModal = () => document.getElementById('modal-edit');
const getFieldError = (name) => document.querySelector(`.field-error[data-for="${name}"]`);

/**
 * @brief Abre el modal de edición y gestiona el foco inicial.
 */
export function openModal() {
    const modal = getModal();
    if (!modal) return;
    
    // Guardamos quién tenía el foco para devolverlo luego (A11y)
    elementFocusedBeforeModal = document.activeElement;
    
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('show');
    
    // UX: Enfocar el primer input para que el usuario pueda escribir inmediatamente
    const firstInput = modal.querySelector('input:not([disabled]), textarea, select');
    firstInput?.focus();
}

/**
 * @brief Cierra el modal, limpia errores y restaura el foco.
 */
export function closeModal() {
    const modal = getModal();
    if (!modal) return;
    
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('show');
    
    // Importante: Limpiar estado visual sucio al salir
    clearFieldErrors();
    
    // Restaurar foco para navegación por teclado fluida
    if (elementFocusedBeforeModal) {
        elementFocusedBeforeModal.focus();
        elementFocusedBeforeModal = null;
    }
}

/**
 * @brief Elimina todos los mensajes de error visibles en el formulario.
 */
export function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach((el) => {
        el.textContent = '';
        el.classList.remove('show');
    });
}

/**
 * @brief Helper interno para mostrar un error en un campo específico.
 */
function showFieldError(name, message) {
    const el = getFieldError(name);
    if (el) {
        el.textContent = message;
        el.classList.add('show');
    }
}

/**
 * @brief Valida los datos del formulario aplicando reglas de negocio.
 */
export function validate(values) {
    let ok = true;
    
    // Validación de Nombre
    if (!values.nombre || values.nombre.trim().length < 2) {
        showFieldError('nombre', 'El nombre es obligatorio (mínimo 2 caracteres).');
        ok = false;
    }
    
    // Validación de Apellidos
    if (!values.apellidos || values.apellidos.trim().length < 2) {
        showFieldError('apellidos', 'Los apellidos son obligatorios.');
        ok = false;
    }
    
    // Validación de Código Postal (Estricto: exactamente 5 dígitos numéricos)
    if (values.cp && values.cp.trim().length > 0 && !/^\d{5}$/.test(values.cp)) {
        showFieldError('cp', 'El Código Postal debe ser de 5 dígitos.');
        ok = false;
    }
    
    // Validación de cambio de contraseña (opcional, pero si inicia debe ser completo)
    const hasPasswordFields = values.currentPassword || values.newPassword || values.confirmPassword;
    
    if (hasPasswordFields) {
        // Si hay al menos un campo de contraseña, todos deben estar presentes y válidos
        if (!values.currentPassword || values.currentPassword.trim().length === 0) {
            showFieldError('currentPassword', 'La contraseña actual es obligatoria para cambiar la contraseña.');
            ok = false;
        }
        
        if (!values.newPassword || values.newPassword.trim().length === 0) {
            showFieldError('newPassword', 'La nueva contraseña es obligatoria.');
            ok = false;
        } else {
            // Validar complejidad de la nueva contraseña
            const passValidation = validatePasswordStrength(values.newPassword);
            if (!passValidation.valid) {
                showFieldError('newPassword', passValidation.message);
                ok = false;
            }
        }
        
        if (!values.confirmPassword || values.confirmPassword.trim().length === 0) {
            showFieldError('confirmPassword', 'Debes confirmar la nueva contraseña.');
            ok = false;
        } else if (values.newPassword !== values.confirmPassword) {
            showFieldError('confirmPassword', 'Las contraseñas no coinciden.');
            ok = false;
        }
    }
    
    return ok;
}

/**
 * @brief Valida la complejidad de una contraseña según los requisitos.
 */
export function validatePasswordStrength(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[\W_]/.test(password)
    };
    
    const allValid = Object.values(requirements).every(req => req);
    
    if (!allValid) {
        let missing = [];
        if (!requirements.length) missing.push('8 caracteres');
        if (!requirements.uppercase) missing.push('una mayúscula');
        if (!requirements.number) missing.push('un número');
        if (!requirements.special) missing.push('un carácter especial');
        
        return {
            valid: false,
            message: `La contraseña debe contener: ${missing.join(', ')}.`,
            requirements
        };
    }
    
    return { valid: true, requirements };
}

/**
 * @brief Actualiza el indicador visual de requisitos de contraseña en tiempo real.
 */
export function updatePasswordRequirements(password) {
    const requirements = validatePasswordStrength(password);
    
    document.querySelectorAll('.req-item').forEach(item => {
        const req = item.getAttribute('data-req');
        if (requirements.requirements[req]) {
            item.classList.add('met');
            item.classList.remove('unmet');
        } else {
            item.classList.remove('met');
            item.classList.add('unmet');
        }
    });
}

// --- EXPORTACIÓN COMPATIBLE CON JEST ---
// Esto permite que el test "vea" las funciones sin usar la palabra prohibida 'export'
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        openModal,
        closeModal,
        clearFieldErrors,
        validate,
        validatePasswordStrength,
        updatePasswordRequirements
    };
}