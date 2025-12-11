/**
 * Archivo: js/users_profile.js
 * Propósito: Gestionar la sesión (Auth) y cargar/guardar los datos de perfil (Firestore).
 */

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { openModal, closeModal, validate, clearFieldErrors } from "./users_edit.js";

const firebaseConfig = {
    apiKey: "AIzaSyCbAVEYYdtSLmrH_opCM72G_G01QXPRZ48",
    authDomain: "biometria-g3.firebaseapp.com",
    databaseURL: "https://biometria-g3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "biometria-g3",
    storageBucket: "biometria-g3.firebasestorage.app",
    messagingSenderId: "817957103566",
    appId: "1:817957103566:web:75c78a0a28f3380d092d9f"
};

// Inicializa Firebase o reutiliza la instancia existente para evitar errores.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Referencia global al UID del usuario actual
let currentUserId = null;
let currentProfileDocId = null;


document.addEventListener('DOMContentLoaded', function () {
    const statusEl = document.getElementById('status');
    const editForm = document.getElementById('editForm'); // Referencia al formulario del modal
    const modalBackdrop = document.getElementById('modal-edit');
    const btnEdit = document.getElementById('btn-edit');
    const btnCancel = document.getElementById('edit-cancel');

    // 2. Referencias a los elementos del DOM (Vista del perfil)
    const pNombre = document.getElementById('p-nombre');
    const pApellidos = document.getElementById('p-apellidos');
    const pCp = document.getElementById('p-cp'); 
    // const pTelefono eliminado
    const pEmail = document.getElementById('p-email');

    // Inputs del modal de edición
    const editNombre = document.getElementById('edit-nombre');
    const editApellidos = document.getElementById('edit-apellidos');
    const editCp = document.getElementById('edit-cp'); 
    // const editTelefono eliminado

    // Botón de iniciar sesión para ocultarlo
    const loginLink = document.querySelector('.header-nav a[href="login.html"]');

    /** Muestra un mensaje de estado. */
    function showStatus(message, type = 'info') {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.className = 'status-bar show ' + (type ? 'status-' + type : '');
        setTimeout(hideStatus, 5000); // Ocultar después de 5 segundos
    }

    /** Oculta el mensaje de estado. */
    function hideStatus() {
        if (!statusEl) return;
        statusEl.className = 'status-bar';
        statusEl.textContent = '';
    }

    /**
     * Renderiza los datos del perfil en la vista de la página.
     * @param {Object} user - Objeto con los datos del usuario de Firestore.
     */
    function renderProfile(user) {
        if (!user) {
            // Si no hay datos, muestra placeholders o mensaje de error.
            pNombre.textContent = '—';
            pApellidos.textContent = '—';
            pCp.textContent = '—'; 
            pEmail.textContent = '—';
            document.getElementById('p-password').textContent = '••••••••';
            return;
        }
        hideStatus();

        pNombre.textContent = user.nombre || '—';
        pApellidos.textContent = user.apellidos || '—'; 
        pCp.textContent = user.cp || '—'; 
        pEmail.textContent = user.email || auth.currentUser?.email || '—'; 
        document.getElementById('p-password').textContent = '••••••••';
    }
    
    /** Rellena los campos del modal de edición con los datos actuales. */
    function fillEditModal(userData) {
        editNombre.value = userData.nombre || '';
        editApellidos.value = userData.apellidos || '';
        editCp.value = userData.cp || ''; 
    }


    /**
     * Carga los datos del perfil desde Firestore usando el UID del usuario.
     * @param {string} userId - El UID del usuario logueado.
     */
    async function loadUserProfileFromFirestore(userId) {
        currentUserId = userId;
        const emailKey = auth.currentUser?.email ? auth.currentUser.email.toLowerCase() : null;

        const tryLoad = async (docId) => {
            if (!docId) return null;
            const ref = doc(db, "Usuarios", docId);
            const snap = await getDoc(ref);
            if (!snap.exists()) return null;
            return { docId, data: snap.data() };
        };

        try {
            let result = await tryLoad(userId);
            if (!result && emailKey) {
                result = await tryLoad(emailKey);
            }

            if (result) {
                currentProfileDocId = result.docId;
                const userData = {
                    ...result.data,
                    email: auth.currentUser?.email || result.data.email,
                };
                fillEditModal(userData);
                return userData;
            }

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

    /** Maneja el envío y actualización del formulario de edición. */
    editForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            nombre: editNombre.value.trim(),
            apellidos: editApellidos.value.trim(),
            cp: editCp.value.trim(), 
        };
        const validationValues = { ...payload };
        clearFieldErrors();
        
        // Asumiendo que validate() en users_edit.js no valida telefono si no está en el objeto
        if (!validate(validationValues)) {
            showStatus('Corrige los campos marcados antes de guardar.', 'warning');
            return;
        }
        
        if (!currentUserId) {
            showStatus('Error: Usuario no autenticado para actualizar.', 'error');
            return;
        }

        const primaryDocId = currentProfileDocId || currentUserId;
        const emailDocId = auth.currentUser?.email ? auth.currentUser.email.toLowerCase() : null;
        const docRef = doc(db, "Usuarios", primaryDocId);
        try {
            showStatus('Guardando cambios...', 'info');
            
            const docPayload = {
                nombre: payload.nombre,
                apellidos: payload.apellidos,
                cp: payload.cp, 
                // telefono eliminado
                email: auth.currentUser?.email || undefined,
                uid: currentUserId,
                updated_at: new Date(),
            };

            await setDoc(docRef, docPayload, { merge: true });

            if (emailDocId && emailDocId !== primaryDocId) {
                await setDoc(doc(db, "Usuarios", emailDocId), docPayload, { merge: true });
            }
            
            const updatedData = await loadUserProfileFromFirestore(currentUserId);
            renderProfile(updatedData);

            closeModal(); // Cierra el modal después de guardar
            showStatus('¡Perfil actualizado con éxito!', 'success');
            
        } catch (error) {
            console.error("Error al actualizar el perfil:", error);
            showStatus('Error al guardar: ' + error.message, 'error');
        }
    });


    // 3. Manejador del botón de cerrar sesión (Uso de 'signOut' global)
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        try {
            await signOut(auth); // Cierra la sesión en Firebase
        } catch (error) {
            showStatus('Error al cerrar sesión: ' + error.message, 'error');
        }
    });


    // 4. PUNTO DE ENTRADA: Monitorear el estado de autenticación (Uso de 'onAuthStateChanged' global)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // USUARIO LOGUEADO
            if (loginLink) loginLink.style.display = 'none';

            const userData = await loadUserProfileFromFirestore(user.uid);
            renderProfile(userData);

        } else {
            // USUARIO NO LOGUEADO
            if (loginLink) loginLink.style.display = 'block'; 
            renderProfile(null); 
            
            showStatus('No hay sesión iniciada. Redirigiendo a login...', 'warning');
            
            setTimeout(() => {
                if (!auth.currentUser) {
                    window.location.href = 'login.html'; 
                }
            }, 1500); 
        }
    });

});