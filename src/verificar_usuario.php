<?php
/**
 * @file verificar_usuario.php
 * @brief Script de backend (PHP) para la verificación de cuentas vía correo electrónico.
 * @details
 * Este script actúa como el 'endpoint' al que accede el usuario al hacer clic en el enlace
 * de verificación recibido por email.
 * * Flujo principal:
 * 1. Conexión segura con Firebase Firestore usando credenciales de servicio.
 * 2. Decodificación de parámetros URL (Email y Token).
 * 3. Validación de integridad (Token BBDD vs Token URL).
 * 4. Verificación de caducidad (Token expirado).
 * - Si caducado: Genera uno nuevo, actualiza BBDD y llama a la API de correo para reenviar.
 * 5. Confirmación de éxito: Actualiza el estado del usuario a 'verificado'.
 * 6. Renderizado de respuesta visual HTML.
 */

// Carga de dependencias de Composer (Google Cloud Firestore Client)
require '../../vendor/autoload.php';

use Google\Cloud\Firestore\FirestoreClient;
use Google\Cloud\Core\Timestamp;

// ==========================================
// CONFIGURACIÓN DE CREDENCIALES
// ==========================================

// Ruta absoluta de credenciales firebase en el servidor (Plesk/Apache)
$keyFilePath = '/p/vhosts/mrmenaya.upv.edu.es/serviceAccountKey.json';

// ID del proyecto en Firebase Console
$projectId = 'proyecto-biometria-2025';

// Inicialización de la conexión con Firestore
try {
    if (!file_exists($keyFilePath)) {
        throw new Exception("No se encuentra el archivo de credenciales en: " . $keyFilePath);
    }

    $db = new FirestoreClient([
        'keyFilePath' => $keyFilePath,
        'projectId' => $projectId,
    ]);
} catch (Exception $e) {
    // Error crítico de conexión: Detenemos la ejecución por seguridad
    die("Error de conexión con la base de datos.");
    error_log($e->getMessage());
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * @brief Decodifica una cadena Base64 URL-Safe recibida por GET.
 * input:string -> decodificar_parametro() -> string
 * * @details
 * Reinvierte el proceso de codificación realizado en Python/JS.
 * 1. Restaura el padding '=' si fue truncado.
 * 2. Reemplaza caracteres URL-safe (-_) por los estándar de Base64 (+/).
 * 3. Decodifica la cadena resultante.
 * * @param input La cadena codificada recibida en la URL.
 * @return La cadena original decodificada (email o token).
 */
function decodificar_parametro($input) {
    $remainder = strlen($input) % 4;
    if ($remainder) {
        $padlen = 4 - $remainder;
        $input .= str_repeat('=', $padlen);
    }
    return base64_decode(strtr($input, '-_', '+/'));
}

/**
 * @brief Genera una página HTML completa con el resultado de la operación.
 * titulo:string, mensaje:string, exito:boolean -> generar_html_respuesta() -> string (HTML)
 * * @details
 * Crea una plantilla HTML responsiva con estilos en línea (CSS) para mostrar feedback al usuario.
 * Adapta colores e iconos según si la operación fue exitosa o fallida.
 * * @param titulo El encabezado principal de la tarjeta.
 * @param mensaje El cuerpo del mensaje explicativo.
 * @param exito Booleano para determinar el color (Verde/Rojo) y el icono.
 * @return String conteniendo todo el código HTML de la página.
 */
function generar_html_respuesta($titulo, $mensaje, $exito) {
    $color = $exito ? '#28a745' : '#dc3545'; // Verde para éxito, Rojo para error
    $icono = $exito ? '✅' : '⚠️';

    // Sintaxis Heredoc para generar el bloque HTML limpiamente
    return <<<HTML
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{$titulo}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
            .card { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; max-width: 90%; width: 400px; }
            h1 { color: #333; margin-bottom: 20px; font-size: 24px; }
            p { color: #666; line-height: 1.6; margin-bottom: 30px; }
            .icon { font-size: 50px; margin-bottom: 20px; display: block; }
            .btn { display: inline-block; padding: 12px 30px; background-color: #0E344C; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; transition: background 0.3s; }
            .btn:hover { background-color: #082233; }
        </style>
    </head>
    <body>
        <div class="card">
            <span class="icon">{$icono}</span>
            <h1 style="color: {$color}">{$titulo}</h1>
            <p>{$mensaje}</p>
            <a href="https://biometria-g3.vercel.app/index.html" class="btn">Ir a Iniciar Sesión</a>
        </div>
    </body>
    </html>
HTML;
}

// ==========================================
// LÓGICA PRINCIPAL DEL SCRIPT
// ==========================================

// 1. Recepción de parámetros GET
$p1_hash = $_GET['p1'] ?? '';
$p2_hash = $_GET['p2'] ?? '';

// Validación básica de entrada
if (empty($p1_hash) || empty($p2_hash)) {
    die("Link inválido: Faltan parámetros.");
}

// 2. Decodificación de credenciales (Email y Token)
$email = decodificar_parametro($p1_hash);
$token_url = decodificar_parametro($p2_hash);

// 3. Consulta a Firestore (Búsqueda por ID de documento = Email)
try {
    $docRef = $db->collection('usuarios')->document($email);
    $snapshot = $docRef->snapshot();
} catch (Exception $e) {
    die("Error al consultar el usuario en la base de datos.");
}

// Verificación de existencia del usuario
if (!$snapshot->exists()) {
    die("Enlace no válido o usuario no registrado.");
}

// Extracción de datos del documento
$data = $snapshot->data();
$token_db = $data['token'] ?? null;
// 'validez' es un objeto complejo (Timestamp) de Google Cloud
$validez_db = $data['validez'] ?? null;
$estado_token = $data['estado_token'] ?? null;

// 4. VALIDACIONES DE SEGURIDAD

// A) Integridad: Validar que el token de la URL es idéntico al almacenado
if ($token_db !== $token_url) {
    die("Link inválido: El token de seguridad no coincide.");
}

// B) Estado Previo: Validar si ya fue verificado para no repetir el proceso
if ($estado_token == 1) {
    echo generar_html_respuesta("¡Ya verificado!", "Tu cuenta ya había sido verificada anteriormente. Puedes iniciar sesión sin problemas.", true);
    exit;
}

// C) Caducidad: Validar si el token ha expirado
$ahora = new DateTime();
$fecha_validez_dt = null;

if ($validez_db) {
    // Conversión de tipo: Firestore Timestamp -> PHP DateTime
    $fecha_validez_dt = $validez_db->get()->format('Y-m-d H:i:s');
    $fecha_validez_object = new DateTime($fecha_validez_dt);

    if ($ahora > $fecha_validez_object) {
        // --- CASO: TOKEN CADUCADO (Lógica de recuperación automática) ---

        // 1. Generar nuevo token criptográfico y extender validez 24h
        $nuevo_token = substr(bin2hex(random_bytes(8)), 0, 16);
        $nueva_validez = new Timestamp(new DateTime('+1 day'));

        // 2. Actualizar credenciales en Firestore
        $docRef->update([
            ['path' => 'token', 'value' => $nuevo_token],
            ['path' => 'validez', 'value' => $nueva_validez]
        ]);

        // 3. Llamada a Microservicio Externo (API) para reenviar correo
        $url_api = 'https://api-envio-correos.onrender.com/email/verificacion';

        $datos_post = json_encode([
            'email' => $email,
            'token' => $nuevo_token
        ]);

        // Configuración de cURL para petición POST
        $ch = curl_init($url_api);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $datos_post);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($datos_post)
        ]);

        $respuesta_api = curl_exec($ch);
        $codigo_http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        // ----------------------------------------------------

        // 4. Feedback al usuario según resultado del envío de correo
        if ($codigo_http == 200) {
            $mensaje_usuario = "Este enlace ha caducado. Por seguridad, hemos generado nuevas credenciales y <b>te hemos enviado un nuevo correo automáticamente</b>. Revisa tu bandeja de entrada.";
        } else {
            // Fallback en caso de error en el servicio de correo (API caída, etc.)
            $mensaje_usuario = "Este enlace ha caducado y hemos renovado tus credenciales. Sin embargo, hubo un error al enviarte el correo automáticamente. Por favor, <b>solicita un nuevo envío desde la aplicación</b>.";
        }

        // 5. Renderizar respuesta de caducidad
        echo generar_html_respuesta(
            "Enlace caducado",
            $mensaje_usuario,
            false
        );
        exit;
    }
}

// ==========================================
// CASO DE ÉXITO: VERIFICACIÓN COMPLETADA
// ==========================================

// 1. Actualizar estado en BBDD: estado_token = 1 (Verificado)
$docRef->update([
    ['path' => 'estado_token', 'value' => 1]
]);

// 2. Mostrar confirmación visual al usuario
echo generar_html_respuesta(
    "¡Cuenta Verificada!",
    "Gracias por confirmar tu correo ($email). <br>Ya tienes acceso completo a Breathe Tracking.",
    true
);
?>