/**
 * @file login_auth.js
 * @brief Gestión de autenticación, recuperación de roles y redirección de usuarios.
 * @details
 * Este módulo maneja todo el flujo de inicio de sesión:
 * 1. Autenticación contra Firebase Authentication.
 * 2. Consulta adicional a Firestore para recuperar el rol del usuario (Admin vs Usuario).
 * 3. Lógica de UI para mostrar/ocultar contraseñas.
 * 4. Redirección condicional basada en el rol recuperado.
 */

// 1. Importaciones de Firebase SDK (vía CDN oficial)
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// **********************************************
// Configuración y conexión
// **********************************************
const firebaseConfig = {
  apiKey: "AIzaSyCbAVEYYdtSLmrH_opCM72G_G01QXPRZ48",
  authDomain: "biometria-g3.firebaseapp.com",
  databaseURL: "https://biometria-g3-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "biometria-g3",
  storageBucket: "biometria-g3.firebasestorage.app",
  messagingSenderId: "817957103566",
  appId: "1:817957103566:web:75c78a0a28f3380d092d9f"
};

// Inicializar o reutilizar Firebase (Patrón Singleton para evitar reinicializaciones)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app); // Referencia a Authentication
const db = getFirestore(app); // Referencia a Firestore

// **********************************************
// **********************************************

/**
 * @brief Recupera el perfil extendido del usuario desde Firestore para determinar su rol.
 * userId: string -> fetchUserProfile() -> Promise<Object>
 *
 * @details
 * Accede a la colección "Usuarios" utilizando el UID proporcionado por Authentication.
 * Extrae el campo 'Id_rol' para normalizarlo y devolverlo junto con el resto de datos.
 * Si el documento no existe, asigna un rol por defecto ('usuario') para evitar bloqueos.
 *
 * @note Es crucial para la seguridad de la navegación, ya que el Auth de Firebase 
 * por sí solo no almacena roles personalizados en este esquema.
 * * @param userId El identificador único (UID) del usuario autenticado.
 * @return Promesa que resuelve en un Objeto con los datos del usuario y la propiedad 'rol'.
 */
async function fetchUserProfile(userId) {
    const docRef = doc(db, "Usuarios", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const userData = docSnap.data();
        // Mapeamos Id_rol a la variable 'rol' para la lógica de redirección
        return {
            ...userData,
            rol: userData.Id_rol || 'usuario' 
        };
    }
    // Fallback seguro en caso de inconsistencia en la base de datos
    return { rol: 'usuario' }; 
}

document.addEventListener('DOMContentLoaded', function() {
    
    // ======================================================
    // A) MOSTRAR / OCULTAR CONTRASEÑA
    // ======================================================
    /**
     * @brief Lógica de UI para alternar la visibilidad del input de contraseña.
     * @details
     * Busca todos los elementos con clase '.toggle-password'.
     * Alterna el atributo 'type' del input entre 'password' y 'text'.
     * Cambia el icono (ojo abierto/cerrado) correspondientemente.
     */
    const toggles = document.querySelectorAll('.toggle-password');

    toggles.forEach((toggle) => {
        const wrapper = toggle.closest('.password-input-wrapper');
        if (!wrapper) return;

        const passwordInput = wrapper.querySelector('input[type="password"], input[type="text"]');
        const eyeOpen = toggle.querySelector('.fas.fa-eye');
        const eyeClosed = toggle.querySelector('.fas.fa-eye-slash');

        if (passwordInput && eyeOpen && eyeClosed) {
            toggle.addEventListener('click', function() {
                const isPassword = passwordInput.getAttribute('type') === 'password';
                // Cambio dinámico del tipo de input
                passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

                if (isPassword) {
                    eyeOpen.style.display = 'none';
                    eyeClosed.style.display = 'inline-block';
                } else {
                    eyeOpen.style.display = 'inline-block';
                    eyeClosed.style.display = 'none';
                }
            });
        }
    });

    // ======================================================
    // B) LOGIN CON FIREBASE AUTH
    // ======================================================
    const loginForm = document.getElementById("loginForm");
    
    if (loginForm) {
        /**
         * @brief Manejador del evento de envío del formulario de login.
         * event:SubmitEvent -> (anon) -> void
         * * @details
         * 1. Previene la recarga de la página.
         * 2. Autentica las credenciales contra Firebase Auth.
         * 3. Verifica el rol en Firestore.
         * 4. Redirige a la URL correspondiente según privilegios.
         */
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); 

            const email = document.getElementById("correo").value.trim();
            const password = document.getElementById("contrasena").value.trim();
            
            const msgEl = document.getElementById("loginMsg");
            const errEl = document.getElementById("loginError");

            // Limpiar mensajes previos de intentos anteriores
            if (msgEl) msgEl.textContent = "";
            if (errEl) errEl.textContent = "";
            
            try {
                // 1. Iniciar sesión en Firebase Authentication (Validación de credenciales)
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // 2. Obtener datos de Firestore para verificar el rol (Id_rol)
                // Esto es necesario para bifurcar la navegación
                const profile = await fetchUserProfile(user.uid);
                const userRole = profile.rol || 'usuario'; 

                // 3. Feedback visual de éxito
                if (msgEl) {
                    msgEl.style.color = "green";
                    msgEl.textContent = `Acceso concedido: ${userRole.toUpperCase()}`;
                }

                // 4. Redirigir según el rol con un pequeño retardo para UX
                setTimeout(() => {
                    // Lógica de bifurcación: Admin -> Dashboard sensores, Usuario -> Mapa
                    if (userRole === 'administrador' || userRole === 'admin') {
                        window.location.href = "../admin_sensors.html";
                    } else {
                        // Rol por defecto o 'usuario' redirige al mapa
                        window.location.href = "../users_map.html";
                    }
                }, 1000); 

            } catch (error) {
                console.error("Error de Firebase:", error.code, error.message);
                
                // Mapeo de errores técnicos a mensajes amigables para el usuario
                let errorMessage;
                switch (error.code) {
                    case 'auth/invalid-email':
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage = "Correo o contraseña incorrectos.";
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = "Acceso bloqueado temporalmente por demasiados intentos.";
                        break;
                    default:
                        errorMessage = "Error de inicio de sesión. Inténtalo de nuevo.";
                        break;
                }
                
                if (errEl) errEl.textContent = errorMessage;
            }
        });
    }

    // ===== Click en el logo -> ir al landing =====
    const headerLogo = document.querySelector('.main-header .logo');
    if (headerLogo) {
        headerLogo.style.cursor = 'pointer';
        headerLogo.addEventListener('click', () => {
            window.location.href = '../index.html'; 
        });
    }

});