# Breathe Tracking - WEB

**Breathe Tracking** es una plataforma web para la gestión, monitorización y análisis de sensores de calidad del aire. Este repositorio contiene el backend, la interfaz de administración web y scripts de procesamiento de datos.

## 🛠️ Tecnologías

* **Backend:** PHP y Firebase(Gestión de usuarios y API).
* **Frontend:** JavaScript (Vanilla), HTML5, CSS3.
* **Data & Scripts:** Python (Análisis de resultados y pruebas de carga).
* **Documentación:** Doxygen.

## 📂 Estructura del Proyecto

* **`src/`**: Código fuente principal de la aplicación web.
    * `auth/`: Lógica de autenticación.
    * `js/`: Lógica del cliente (mapas, gestión de sensores, perfiles).
    * `css/`: Estilos de la interfaz.
    * `verificar_usuario.php`: Validación de sesiones/tokens.
* **`scripts_python/`**: Scripts auxiliares.
    * `analizar_resultados.py`: Procesamiento de datos de sensores.
    * `prueba_carga_sensores.py`: Simulaciones y testing.
* **`docs_web/`**: Documentación generada automáticamente (HTML/Doxygen).
* **`test/`**: Tests unitarios y de lógica (JS).

## 🚀 Funcionalidades Clave

* **Panel de Administración:** Gestión de altas y bajas de sensores (`admin_sensors.js`).
* **Mapa de Usuarios:** Visualización geoespacial de usuarios y dispositivos (`users_map.js`).
* **Análisis de Datos:** Procesamiento semanal y reportes de calidad del aire.
* **Autenticación Segura:** Login y registro de usuarios.

## 📚 Documentación

La documentación técnica del código se genera mediante **Doxygen**.
Para visualizarla, abre el archivo `docs_web/index.html` en tu navegador.

Para regenerar la documentación:
```bash
doxygen Doxyfile