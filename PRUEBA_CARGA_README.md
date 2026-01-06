# 📋 RESUMEN - Prueba de Carga de 200 Sensores

## 🎯 ¿Qué se ha creado?

He preparado una **solución completa** para realizar una prueba de carga simulando 200 sensores IoT enviando datos a Firebase Firestore.

### 📁 Archivos Creados

```
scripts_python/
├── 📄 prueba_carga_sensores.py    ← Script PRINCIPAL
├── 📄 analizar_resultados.py      ← Análisis de datos
├── 📄 setup_prueba.py             ← Verificación previa
└── serviceAccountKey.json         ← (Descarga desde Firebase)
```

### 📚 Documentación

```
├── GUIA_PRUEBA_CARGA.md    ← Paso a paso (EMPIEZA AQUÍ)
├── PRUEBA_CARGA.md         ← Especificaciones técnicas
└── README.md               ← Este archivo
```

---

## ⚡ Inicio Rápido (5 minutos)

### 1️⃣ Preparación
```powershell
# A. Descarga serviceAccountKey.json desde Firebase Console
#    Configuración > Cuentas de Servicio > Generar clave privada

# B. Colócalo en: scripts_python/serviceAccountKey.json

# C. Abre terminal en scripts_python/
cd "C:\...\breathe_tracking_web\scripts_python"
```

### 2️⃣ Instalar Dependencias
```powershell
pip install firebase-admin tqdm
```

### 3️⃣ Verificar Configuración (Opcional)
```powershell
python setup_prueba.py
```

### 4️⃣ Ejecutar Prueba
```powershell
python prueba_carga_sensores.py
```

### 5️⃣ Ver Resultados
```powershell
python analizar_resultados.py
```

---

## 📊 ¿Qué Hace Cada Script?

### 🔬 `prueba_carga_sensores.py` (Principal)

**Función:** Simula 200 sensores enviando datos a Firestore

**Características:**
- ✅ 200 sensores simultáneos (configurable)
- ✅ 20 threads paralelos (configurable)
- ✅ Datos realistas de contaminación
- ✅ Ubicación geoespacial (Gandía, Valencia)
- ✅ Medidas de 5 gases (O3, CO, NO2, SO2, CO2)
- ✅ Temperatura, humedad, presión
- ✅ Índice de calidad del aire (AQI)
- ✅ Barra de progreso en tiempo real

**Output:**
- Consola: Estadísticas y resultados
- Archivo: `resultados_prueba_carga.json`

---

### 📈 `analizar_resultados.py` (Análisis)

**Función:** Analizar resultados de la prueba

**Opciones del menú:**
1. Ver resultados de la última prueba
2. Obtener estadísticas de Firestore
3. Limpiar datos de prueba
4. Salir

---

### 🔧 `setup_prueba.py` (Configuración)

**Función:** Verificar que todo está listo

**Verifica:**
- ✅ Python 3.8+
- ✅ firebase-admin instalado
- ✅ tqdm instalado
- ✅ serviceAccountKey.json existe
- ✅ Scripts de prueba existen

---

## 📊 Datos Generados

Cada sensor envía:

```json
{
  "sensor_id": "SENSOR_001",
  "ubicacion": {
    "lat": 38.9660,
    "lng": -0.1850
  },
  "timestamp": "2025-12-30T14:35:00Z",
  "gases": {
    "O3": 0.045,      // ppm
    "CO": 3.5,        // mg/m³
    "NO2": 45.2,      // μg/m³
    "SO2": 25.8,      // μg/m³
    "CO2": 450        // ppm
  },
  "temperatura": 22.5,    // °C
  "humedad": 65.0,        // %
  "presion": 1013.25,     // hPa
  "aqi": 45,              // Índice (0-100)
  "nivel_calidad": "Aceptable",
  "bateria": 85.3,        // %
  "estado": "activo"
}
```

---

## 📈 Resultados Esperados

### Métricas de Éxito

| Métrica | Valor Esperado |
|---------|---|
| **Tasa de éxito** | 100% (0 errores) |
| **Tiempo total** | 30-60 segundos |
| **Latencia promedio** | 100-200 ms |
| **Documentos/segundo** | 5-10 docs/s |
| **Almacenamiento** | ~200 KB |

### Output Típico

```
======================================================================
📈 RESULTADOS DE LA PRUEBA
======================================================================

✅ Éxito: 200/200 (100.0%)
❌ Fallos: 0/200

⏱️  Latencia:
   • Promedio: 145.32 ms
   • Mínima: 95.23 ms
   • Máxima: 234.67 ms

🚀 Velocidad: ~10.0 documentos/segundo

======================================================================
```

---

## 🗂️ Estructura en Firestore

Después de la prueba, verás:

```
Sensores/
├── SENSOR_001/
│   └── datos/
│       └── 2025-12-30T14:35:00Z_sensor_001
│           ├── sensor_id
│           ├── ubicacion
│           ├── gases
│           ├── temperatura
│           └── ...
├── SENSOR_002/
│   └── datos/
│       └── 2025-12-30T14:35:00Z_sensor_002
│           └── ...
├── ...
└── SENSOR_200/
    └── datos/
        └── 2025-12-30T14:35:00Z_sensor_200
            └── ...
```

---

## ⚙️ Configuración

### Cambiar Número de Sensores

En `prueba_carga_sensores.py`, línea 23:
```python
NUM_SENSORES = 200  # Cambiar este valor
```

Ejemplos:
- `20` → Prueba rápida (2-5 segundos)
- `100` → Prueba normal (15-30 segundos)
- `200` → Prueba completa (30-60 segundos)
- `500` → Prueba de estrés (1-2 minutos)

### Cambiar Threads Paralelos

Línea 24:
```python
NUM_THREADS = 20  # Más threads = más velocidad (pero usa más RAM)
```

### Cambiar Ubicación Base

Línea 30-31:
```python
LAT_BASE = 38.9660   # Cambiar latitud
LNG_BASE = -0.1850   # Cambiar longitud
```

---

## 🚨 Solución de Problemas

### ❌ "FileNotFoundError: serviceAccountKey.json"
**Solución:** Descárgalo desde Firebase Console y colócalo en `scripts_python/`

### ❌ "ModuleNotFoundError: firebase_admin"
**Solución:** `pip install firebase-admin`

### ❌ "PERMISSION_DENIED" en Firestore
**Solución:** Actualiza reglas en Firebase Console a `allow write: if true;` (solo testing)

### ❌ "Timeout"
**Solución:** Aumenta `TIMEOUT_SEGUNDOS` en el script o revisa tu conexión

### ❌ Latencia muy alta (>500ms)
**Solución:** 
- Conexión de internet lenta
- Firebase saturado
- Reduce `NUM_SENSORES` o `NUM_THREADS`

---

## 💡 Casos de Uso

### 1. **Prueba Rápida de Funcionamiento** (5 min)
```python
NUM_SENSORES = 10
NUM_THREADS = 5
```
→ Verifica que todo funciona

### 2. **Prueba de Escalabilidad** (15 min)
```python
NUM_SENSORES = 200
NUM_THREADS = 20
```
→ Verifica que 200 sensores funcionan

### 3. **Prueba de Estrés** (30 min)
```python
NUM_SENSORES = 1000
NUM_THREADS = 50
```
→ Verifica límites del servidor

### 4. **Prueba Continua** (Crear servicio)
Implementa un script que envíe datos cada X segundos en producción

---

## 📊 Monitoreo en Firebase

### Ver Uso en Tiempo Real

1. Firebase Console → Firestore Database
2. Abre pestaña **Usage** (Uso)
3. Observa:
   - **Reads:** Lecturas
   - **Writes:** Escrituras (deberías ver +200)
   - **Delete:** Eliminaciones
   - **Data stored:** Almacenamiento usado (~200KB)

### Costo Estimado

**Plan Spark (Gratis):** 
- 50,000 lecturas/día ✅
- 20,000 escrituras/día ✅
- 1 GB almacenamiento ✅

**Plan Blaze (Pay-as-you-go):**
- Muy económico para este volumen
- ~$0.06 por 100,000 escrituras

---

## 🎓 Próximos Pasos

Después de la prueba exitosa:

### 1. **Visualización en el Mapa**
- Conecta los datos de sensores al mapa de usuarios
- Muestra en tiempo real los 200 sensores

### 2. **Alertas Automáticas**
- Crea notificaciones si AQI > umbral
- Alerta a usuarios cercanos

### 3. **Histórico**
- Guarda datos por día/semana
- Crea gráficos de tendencias

### 4. **API REST**
- Crea un endpoint que devuelva datos de sensores
- Integra con apps móviles

### 5. **Optimización**
- Implementa batch writes
- Crea índices en campos de búsqueda
- Implementa caché local

---

## 📚 Documentación Relacionada

- **GUIA_PRUEBA_CARGA.md** → Paso a paso detallado
- **PRUEBA_CARGA.md** → Especificaciones técnicas
- [Firebase Admin SDK](https://firebase.google.com/docs/database/admin/start)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)

---

## ✨ ¡Listo para Empezar!

**Resumen de pasos:**
1. ✅ Descarga `serviceAccountKey.json`
2. ✅ Colócalo en `scripts_python/`
3. ✅ Ejecuta: `python prueba_carga_sensores.py`
4. ✅ Analiza resultados: `python analizar_resultados.py`

**Tiempo total: 5-10 minutos** ⏱️

¿Preguntas? Revisa **GUIA_PRUEBA_CARGA.md** para instrucciones detalladas.

**¡Mucho éxito con tu prueba! 🚀**
