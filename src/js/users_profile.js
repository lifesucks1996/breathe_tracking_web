/**
 * @file users_profile.js
 * @brief Gestor de sesión de usuario y manipulación de datos de perfil (CRUD).
 * @details
 * Este script actúa como el controlador principal de la página de perfil.
 * Sus responsabilidades incluyen:
 * 1. Escuchar cambios en la autenticación de Firebase (Login/Logout).
 * 2. Recuperar datos del usuario desde Firestore (soportando búsqueda por UID o Email).
 * 3. Renderizar la información en el DOM.
 * 4. Gestionar el formulario de edición y guardar los cambios en la base de datos.
 */

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { openModal, closeModal, validate, clearFieldErrors, updatePasswordRequirements } from "./users_edit.js";

// Configuración de conexión
const firebaseConfig = {
    apiKey: "AIzaSyCbAVEYYdtSLmrH_opCM72G_G01QXPRZ48",
    authDomain: "biometria-g3.firebaseapp.com",
    databaseURL: "https://biometria-g3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "biometria-g3",
    storageBucket: "biometria-g3.firebasestorage.app",
    messagingSenderId: "817957103566",
    appId: "1:817957103566:web:75c78a0a28f3380d092d9f"
};

// Inicialización Singleton (evita errores si el script se carga dos veces)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables de estado global para el contexto del usuario
let currentUserId = null;
let currentProfileDocId = null; // Almacena el ID real del documento (puede ser UID o Email)


document.addEventListener('DOMContentLoaded', function () {
    // 1. Referencias UI Generales
    const statusEl = document.getElementById('status');
    const editForm = document.getElementById('editForm'); 
    const modalBackdrop = document.getElementById('modal-edit');
    const btnEdit = document.getElementById('btn-edit');
    const btnCancel = document.getElementById('edit-cancel');

    // 2. Referencias a los elementos de visualización (Solo lectura)
    const pNombre = document.getElementById('p-nombre');
    const pApellidos = document.getElementById('p-apellidos');
    const pCp = document.getElementById('p-cp'); 
    const pEmail = document.getElementById('p-email');

    // 3. Referencias a Inputs del modal (Edición)
    const editNombre = document.getElementById('edit-nombre');
    const editApellidos = document.getElementById('edit-apellidos');
    const editCp = document.getElementById('edit-cp');
    
    // 4. Referencias a Inputs de cambio de contraseña
    const editCurrentPassword = document.getElementById('edit-current-password');
    const editNewPassword = document.getElementById('edit-new-password');
    const editConfirmPassword = document.getElementById('edit-confirm-password');
    
    // 5. Listeners de toggle de visibilidad de contraseña
    const passwordToggles = document.querySelectorAll('.password-input-wrapper .toggle-password');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const wrapper = toggle.closest('.password-input-wrapper');
            const input = wrapper.querySelector('input');
            const eyeOpen = toggle.querySelector('.fas.fa-eye');
            const eyeClosed = toggle.querySelector('.fas.fa-eye-slash');
            
            if (input.type === 'password') {
                input.type = 'text';
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = 'inline-block';
            } else {
                input.type = 'password';
                eyeOpen.style.display = 'inline-block';
                eyeClosed.style.display = 'none';
            }
        });
    });
    
    // 6. Listener en tiempo real para validar requisitos de contraseña
    if (editNewPassword) {
        editNewPassword.addEventListener('input', () => {
            if (editNewPassword.value) {
                updatePasswordRequirements(editNewPassword.value);
            }
        });
    }
    
    // Referencia para control de navegación
    const loginLink = document.querySelector('.header-nav a[href="login.html"]');

    /**
     * @brief Muestra un mensaje de retroalimentación visual al usuario.
     * message:string, type:string -> showStatus() -> void
     * * @details
     * Hace visible la barra de estado con un color específico (info, success, error)
     * y programa su ocultación automática tras 5 segundos.
     * * @param message El texto a mostrar.
     * @param type El tipo de alerta ('info', 'warning', 'error', 'success').
     */
    function showStatus(message, type = 'info') {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.className = 'status-bar show ' + (type ? 'status-' + type : '');
        setTimeout(hideStatus, 5000); // Ocultar después de 5 segundos
    }

    /**
     * @brief Oculta la barra de estado inmediatamente.
     * (void) -> hideStatus() -> void
     */
    function hideStatus() {
        if (!statusEl) return;
        statusEl.className = 'status-bar';
        statusEl.textContent = '';
    }

    /**
     * @brief Actualiza el DOM con los datos del usuario.
     * user:Object -> renderProfile() -> void
     * * @details
     * Si el objeto usuario es válido, rellena los campos de texto.
     * Si es null o undefined, muestra guiones (—) como placeholders.
     * * @param user Objeto con las propiedades del usuario (nombre, apellidos, cp, email).
     */
    function renderProfile(user) {
        if (!user) {
            // Estado vacío / Cargando
            pNombre.textContent = '—';
            pApellidos.textContent = '—';
            pCp.textContent = '—'; 
            pEmail.textContent = '—';
            document.getElementById('p-password').textContent = '••••••••';
            return;
        }
        hideStatus();

        // Inyección de datos segura (prevención básica de XSS vía textContent)
        pNombre.textContent = user.nombre || '—';
        pApellidos.textContent = user.apellidos || '—'; 
        pCp.textContent = user.cp || '—'; 
        pEmail.textContent = user.email || auth.currentUser?.email || '—'; 
        document.getElementById('p-password').textContent = '••••••••';
    }
    
    /**
     * @brief Prepara el formulario del modal con los valores actuales.
     * userData:Object -> fillEditModal() -> void
     * * @details
     * Mapea los datos de la vista a los inputs del formulario para facilitar la edición.
     */
    function fillEditModal(userData) {
        editNombre.value = userData.nombre || '';
        editApellidos.value = userData.apellidos || '';
        editCp.value = userData.cp || ''; 
    }

    /**
     * @brief Recupera el perfil desde Firestore con estrategia de doble búsqueda.
     * userId:string -> loadUserProfileFromFirestore() -> Promise<Object|null>
     * * @details
     * Implementa una lógica de fallback para compatibilidad con registros antiguos:
     * 1. Intenta buscar el documento por UID (Estándar actual).
     * 2. Si no existe, intenta buscar por Email (Legacy).
     * 3. Retorna los datos fusionados con el email actual de la sesión.
     * * @param userId El UID del usuario autenticado.
     * @return Promesa con los datos del usuario o null si hay error crítico.
     */
    async function loadUserProfileFromFirestore(userId) {
        currentUserId = userId;
        const emailKey = auth.currentUser?.email ? auth.currentUser.email.toLowerCase() : null;

        // Función helper interna para intentar cargar un documento
        const tryLoad = async (docId) => {
            if (!docId) return null;
            const ref = doc(db, "Usuarios", docId);
            const snap = await getDoc(ref);
            if (!snap.exists()) return null;
            return { docId, data: snap.data() };
        };

        try {
            // Intento 1: Búsqueda por UID
            let result = await tryLoad(userId);
            
            // Intento 2: Fallback a búsqueda por Email si falla el UID
            if (!result && emailKey) {
                result = await tryLoad(emailKey);
            }

            if (result) {
                currentProfileDocId = result.docId;
                // Construcción del objeto final asegurando que el email esté presente
                const userData = {
                    ...result.data,
                    email: auth.currentUser?.email || result.data.email,
                };
                fillEditModal(userData);
                return userData;
            }

            // Caso: Usuario autenticado pero sin documento en 'Usuarios'
            currentProfileDocId = null;
            console.warn("Documento de perfil no encontrado para:", userId, emailKey);
            showStatus('Perfil incompleto. Por favor, completa tus datos.', 'warning');
            return { email: auth.currentUser?.email };

        } catch (error) {
            console.error("Error al obtener el perfil de Firestore:", error);
            showStatus('Error al cargar el perfil. Por favor, revisa tus Reglas de Seguridad.', 'error');
            return null;
        }
    }

    // --- Listeners de Interfaz ---

    btnEdit?.addEventListener('click', () => {
        clearFieldErrors();
        openModal();
    });

    btnCancel?.addEventListener('click', () => closeModal());

    modalBackdrop?.addEventListener('click', (event) => {
        if (event.target === modalBackdrop) {
            closeModal();
        }
    });

    /**
     * @brief Manejador del envío del formulario de edición (Update).
     * event:SubmitEvent -> (anon_async) -> void
     * * @details
     * 1. Recolecta y limpia los datos del formulario.
     * 2. Valida los campos usando `users_edit.js`.
     * 3. Determina el ID del documento a actualizar.
     * 4. Si hay cambio de contraseña: reautentica y actualiza.
     * 5. Escribe en Firestore (usando `merge: true` para no borrar otros campos).
     * 6. Actualiza la vista local y cierra el modal.
     */
    editForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            nombre: editNombre.value.trim(),
            apellidos: editApellidos.value.trim(),
            cp: editCp.value.trim(),
            currentPassword: editCurrentPassword?.value?.trim() || '',
            newPassword: editNewPassword?.value?.trim() || '',
            confirmPassword: editConfirmPassword?.value?.trim() || '',
        };
        
        clearFieldErrors();
        
        // Validación de negocio (longitud, formato CP, complejidad de contraseña, etc.)
        if (!validate(payload)) {
            showStatus('Corrige los campos marcados antes de guardar.', 'warning');
            return;
        }
        
        if (!currentUserId) {
            showStatus('Error: Usuario no autenticado para actualizar.', 'error');
            return;
        }

        // Determinar clave primaria (preferencia por ID existente, sino UID)
        const primaryDocId = currentProfileDocId || currentUserId;
        const emailDocId = auth.currentUser?.email ? auth.currentUser.email.toLowerCase() : null;
        const docRef = doc(db, "Usuarios", primaryDocId);
        
        try {
            showStatus('Guardando cambios...', 'info');
            
            // --- PASO 1: Cambio de contraseña (si está presente) ---
            if (payload.newPassword) {
                try {
                    // Reautenticar al usuario con la contraseña actual
                    const credential = EmailAuthProvider.credential(
                        auth.currentUser.email,
                        payload.currentPassword
                    );
                    
                    await reauthenticateWithCredential(auth.currentUser, credential);
                    
                    // Si la reautenticación es exitosa, actualizar la contraseña
                    await updatePassword(auth.currentUser, payload.newPassword);
                    
                } catch (authError) {
                    console.error("Error de autenticación:", authError.code);
                    
                    // Mapeo de errores de autenticación
                    let authErrorMessage = 'Error al cambiar la contraseña.';
                    if (authError.code === 'auth/wrong-password') {
                        authErrorMessage = 'La contraseña actual es incorrecta.';
                    } else if (authError.code === 'auth/invalid-credential') {
                        authErrorMessage = 'La contraseña actual es incorrecta.';
                    }
                    
                    showStatus(authErrorMessage, 'error');
                    return;
                }
            }
            
            // --- PASO 2: Actualizar datos del perfil en Firestore ---
            const docPayload = {
                nombre: payload.nombre,
                apellidos: payload.apellidos,
                cp: payload.cp, 
                email: auth.currentUser?.email || undefined,
                uid: currentUserId,
                updated_at: new Date(),
            };

            // Escritura principal
            await setDoc(docRef, docPayload, { merge: true });

            // Mantenimiento de integridad: Si existe un doc con ID email, sincronizarlo también
            if (emailDocId && emailDocId !== primaryDocId) {
                await setDoc(doc(db, "Usuarios", emailDocId), docPayload, { merge: true });
            }
            
            // Recargar datos para confirmar la escritura
            const updatedData = await loadUserProfileFromFirestore(currentUserId);
            renderProfile(updatedData);

            // Limpiar campos de contraseña
            if (editCurrentPassword) editCurrentPassword.value = '';
            if (editNewPassword) editNewPassword.value = '';
            if (editConfirmPassword) editConfirmPassword.value = '';

            closeModal(); 
            showStatus('¡Perfil actualizado con éxito!', 'success');
            
        } catch (error) {
            console.error("Error al actualizar el perfil:", error);
            showStatus('Error al guardar: ' + error.message, 'error');
        }
    });


    // 3. Manejador del botón de cerrar sesión
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        try {
            await signOut(auth); // Cierra la sesión en Firebase y dispara onAuthStateChanged
        } catch (error) {
            showStatus('Error al cerrar sesión: ' + error.message, 'error');
        }
    });


    // 4. PUNTO DE ENTRADA PRINCIPAL: Monitor de Estado de Autenticación
    /**
     * @brief Listener global de cambios en la sesión de Firebase.
     * user:User|null -> (anon_async) -> void
     * * @details
     * Se dispara automáticamente al cargar la página o al hacer login/logout.
     * - Si hay usuario: Carga el perfil desde Firestore.
     * - Si no hay usuario: Muestra estado vacío y redirige al login tras una breve pausa.
     */
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // USUARIO LOGUEADO
            if (loginLink) loginLink.style.display = 'none';

            const userData = await loadUserProfileFromFirestore(user.uid);
            renderProfile(userData);

        } else {
            // USUARIO NO LOGUEADO (O Logout finalizado)
            if (loginLink) loginLink.style.display = 'block'; 
            renderProfile(null); 
            
            showStatus('No hay sesión iniciada. Redirigiendo a login...', 'warning');
            
            // Redirección de seguridad
            setTimeout(() => {
                if (!auth.currentUser) {
                    window.location.href = 'login.html'; 
                }
            }, 1500); 
        }
    });

});