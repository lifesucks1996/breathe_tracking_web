# 🚀 Guía Paso a Paso - Prueba de Carga de Sensores

## 📝 Resumen Rápido

```
Objetivo: Simular 200 sensores enviando datos ficticios a Firebase Firestore
Tiempo estimado: 5-15 minutos
Archivos necesarios: serviceAccountKey.json, Python 3.8+
```

---

## 🎯 Fase 1: Preparación (5 minutos)

### Paso 1.1: Obtener Credenciales de Firebase

1. Abre [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto `biometria-g3`
3. Ve a **⚙️ Configuración del proyecto** (arriba a la izquierda)
4. Abre la pestaña **"Cuentas de servicio"**
5. Haz clic en **"Generar nueva clave privada"** (botón azul)
6. Se descargará un archivo JSON

### Paso 1.2: Colocar el Archivo en la Carpeta Correcta

1. Coloca el archivo descargado en: `scripts_python/serviceAccountKey.json`
   ```
   breathe_tracking_web/
   ├── scripts_python/
   │   ├── serviceAccountKey.json  ← AQUÍ
   │   ├── generar_datos_mapas.py
   │   ├── prueba_carga_sensores.py
   │   └── analizar_resultados.py
   ```

### Paso 1.3: Instalar Python y Dependencias

**Windows:**
```powershell
# Abre PowerShell como administrador
python --version  # Verifica que Python está instalado

# Navega a la carpeta del proyecto
cd "C:\DATA\UPV\3CuatrimestreA\PROYECTOBIOMETRIA\ProyectoGrupo3\WEB\breathe_tracking_web\scripts_python"

# Instala las dependencias necesarias
pip install firebase-admin tqdm
```

**Linux/Mac:**
```bash
python3 --version
cd scripts_python
pip3 install firebase-admin tqdm
```

✅ **Resultado esperado:**
```
Successfully installed firebase-admin-6.x.x tqdm-4.x.x
```

---

## 🔬 Fase 2: Ejecutar la Prueba (2-3 minutos)

### Opción A: Prueba Rápida (20 sensores - RECOMENDADO PARA PROBAR PRIMERO)

**Edita `prueba_carga_sensores.py` línea 23:**
```python
NUM_SENSORES = 20  # Cambiar de 200 a 20 para prueba rápida
```

Luego ejecuta:
```powershell
python prueba_carga_sensores.py
```

**Output esperado:**
```
======================================================================
🔬 PRUEBA DE CARGA - SENSORES IoT
======================================================================
📊 Parámetros:
   • Sensores: 20
   • Threads: 20
   • Timestamp: 2025-12-30T14:35:00.123456
======================================================================

📤 Enviando datos a Firestore...

Progreso: 20/20 [100%] ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

### Opción B: Prueba Completa (200 sensores)

**Asegúrate que `prueba_carga_sensores.py` tiene:**
```python
NUM_SENSORES = 200
NUM_THREADS = 20
```

Ejecuta:
```powershell
python prueba_carga_sensores.py
```

⏱️ **Tiempo esperado:** 30-60 segundos

---

## 📊 Fase 3: Ver Resultados (1 minuto)

### Opción 1: Resultados en la Consola (Inmediato)

Después de que termina la prueba, verás:
```
======================================================================
📈 RESULTADOS DE LA PRUEBA
======================================================================

✅ Éxito: 200/200 (100.0%)
❌ Fallos: 0/200

⏱️  Latencia:
   • Promedio: 145.32 ms
   • Mínima: 98.45 ms
   • Máxima: 234.67 ms

🚀 Velocidad: ~10.0 documentos/segundo
```

### Opción 2: Archivo JSON con Resultados

Se crea automáticamente: `scripts_python/resultados_prueba_carga.json`

```json
{
  "timestamp": "2025-12-30T14:35:00.123456",
  "config": {
    "num_sensores": 200,
    "num_threads": 20
  },
  "resultados": {
    "exitosos": 200,
    "fallos": 0,
    "latencia_promedio": 145.32,
    "latencia_min": 98.45,
    "latencia_max": 234.67
  }
}
```

### Opción 3: Análisis Interactivo

```powershell
python analizar_resultados.py
```

**Menú:**
```
📋 Opciones:
1. Ver resultados de la última prueba
2. Obtener estadísticas de Firestore
3. Limpiar datos de prueba (TODOS los sensores)
4. Salir
```

---

## 🔍 Fase 4: Verificar en Firebase Console (2 minutos)

### Ver los Datos Creados

1. Abre [Firebase Console](https://console.firebase.google.com)
2. Selecciona proyecto `biometria-g3`
3. Ve a **Firestore Database**
4. Expande la colección `Sensores`
5. Verás documentos como:
   ```
   Sensores/
   ├── SENSOR_001/
   │   └── datos/
   │       └── 2025-12-30T14:35:00.123456_sensor_001
   │           ├── sensor_id: "SENSOR_001"
   │           ├── ubicacion: {lat: 38.98, lng: -0.18}
   │           ├── gases: {O3: 0.045, CO: 5.3, NO2: 85.2, ...}
   │           ├── temperatura: 22.5
   │           └── ...
   ├── SENSOR_002/
   └── SENSOR_003/
   ```

### Monitorear Uso de Firebase

1. Ve a **Firestore Database**
2. Abre pestaña **Usage** (Uso)
3. Observa:
   - **Writes:** Deberías ver 200 (o 20 si hiciste prueba rápida)
   - **Data stored:** ~200KB (o ~20KB)
   - **Network:** Datos enviados

---

## 📈 Fase 5: Análisis de Resultados

### Métricas Clave

| Métrica | Valor Esperado | Bueno | Excelente |
|---------|---|---|---|
| **Tasa de éxito** | >95% | >98% | 100% |
| **Latencia promedio** | <200ms | <150ms | <100ms |
| **Docs/segundo** | >5 | >8 | >10 |
| **Errores** | 0-5 | 0-2 | 0 |

### Interpretación de Resultados

✅ **Todo verde (100% éxito, <100ms latencia)**
- Tu servidor está bien configurado
- Firebase puede manejar 200+ sensores sin problemas

⚠️ **Algunos errores (95-99% éxito)**
- Posible saturación temporal
- Verifica reglas de Firestore
- Considera aumentar `NUM_THREADS` o reducir sensores

❌ **Muchos errores (>5% fallos, >300ms latencia)**
- Revisa reglas de Firestore (permiso de escritura)
- Comprueba conexión a internet
- Verifica cuota de Firebase

---

## 🧹 Fase 6: Limpiar Datos (Opcional)

### Opción 1: Desde el Script de Análisis

```powershell
python analizar_resultados.py
# Selecciona opción 3 (Limpiar datos)
# Confirma escribiendo "SÍ"
```

### Opción 2: Manualmente desde Firebase Console

1. Ve a **Firestore Database**
2. Haz clic derecho en colección `Sensores`
3. Selecciona **Delete collection**
4. Confirma

---

## ⚙️ Configuración Avanzada

### Cambiar Número de Sensores

Edita `prueba_carga_sensores.py`:
```python
NUM_SENSORES = 500  # Aumenta a 500 sensores
```

### Ajustar Paralelismo

```python
NUM_THREADS = 50  # Aumentar para más velocidad (usa más RAM)
```

### Cambiar Rango de Valores

```python
RANGOS = {
    "O3": (0.040, 0.130),      # Aumenta máximo
    "CO": (2.0, 25.0),         # Más contaminación
    ...
}
```

---

## 🚨 Solución de Problemas

### ❌ Error: "FileNotFoundError: serviceAccountKey.json"

**Solución:**
```
1. Descarga serviceAccountKey.json desde Firebase Console
2. Colócalo en: scripts_python/serviceAccountKey.json
3. Verifica que el nombre es exacto (sin espacios)
```

### ❌ Error: "PERMISSION_DENIED"

**Solución:**
Ve a Firebase Console > Firestore Database > Rules
Cambia a:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // Solo para testing
    }
  }
}
```

### ❌ Error: "Module not found: firebase_admin"

**Solución:**
```powershell
pip install firebase-admin
pip install tqdm
```

### ❌ Error: "Timeout after XXXms"

**Solución:**
```python
# En prueba_carga_sensores.py, aumenta timeout
TIMEOUT_SEGUNDOS = 60  # Aumenta de 30 a 60
```

---

## 📊 Ejemplo de Salida Completa

```
======================================================================
🔬 PRUEBA DE CARGA - SENSORES IoT
======================================================================
📊 Parámetros:
   • Sensores: 200
   • Threads: 20
   • Timestamp: 2025-12-30T14:35:45.123456
======================================================================

✅ Firebase inicializado correctamente

📤 Enviando datos a Firestore...

Progreso: 200/200 [100%] ████████████████████ 45.3s

======================================================================
📈 RESULTADOS DE LA PRUEBA
======================================================================

✅ Éxito: 200/200 (100.0%)
❌ Fallos: 0/200

⏱️  Latencia:
   • Promedio: 142.56 ms
   • Mínima: 95.23 ms
   • Máxima: 298.14 ms

🚀 Velocidad: ~10.0 documentos/segundo

======================================================================
✨ Prueba completada
======================================================================

📍 Documentos escritos: Sensores/<sensor_id>/datos/<timestamp>
🔍 Verifica en Firebase Console > Firestore Database > Colección 'Sensores'

💾 Resultados guardados en: resultados_prueba_carga.json
```

---

## 📚 Próximos Pasos

Después de la prueba exitosa:

1. **Automatizar envío:** Implementa un servicio que envíe datos periódicamente
2. **Visualización:** Muestra los datos en el mapa
3. **Alertas:** Crea notificaciones si AQI > umbral
4. **Optimización:** Implementa batch writes para mejor rendimiento
5. **Escalabilidad:** Aumenta a 1000+ sensores

---

## ✨ ¡Listo!

Ya tienes todo lo necesario para ejecutar la prueba de carga. 

**Resumen de comandos:**
```powershell
# 1. Ir a la carpeta
cd scripts_python

# 2. Instalar dependencias
pip install firebase-admin tqdm

# 3. Ejecutar prueba
python prueba_carga_sensores.py

# 4. Ver análisis (opcional)
python analizar_resultados.py
```

¡Mucho éxito con tu prueba! 🎉
