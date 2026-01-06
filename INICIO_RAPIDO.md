# 🎯 PRUEBA DE CARGA - RESUMEN EJECUTIVO

## 📦 Lo Que Has Recibido

He creado una **solución completa y lista para usar** para simular 200 sensores IoT enviando datos a Firebase Firestore.

### 🗂️ Archivos Creados

```
📁 scripts_python/
├── 🔬 prueba_carga_sensores.py      (Script principal - ¡EJECUTA ESTO!)
├── 📊 analizar_resultados.py        (Análisis de resultados)
├── 🔧 setup_prueba.py               (Verificación de configuración)
└── 📄 serviceAccountKey.json        (⚠️ Descárgalo tú desde Firebase)

📁 Documentación/
├── 📖 GUIA_PRUEBA_CARGA.md          (Paso a paso detallado)
├── 📋 PRUEBA_CARGA.md               (Especificaciones técnicas)
├── ✅ CHECKLIST_PRUEBA.md            (Checklist interactivo)
└── 📄 PRUEBA_CARGA_README.md        (Resumen general)
```

---

## ⚡ INICIO RÁPIDO (3 PASOS)

### 1️⃣ DESCARGA CREDENCIALES (1 min)
```
Abre: https://console.firebase.google.com
  → Tu proyecto "biometria-g3"
  → ⚙️ Configuración
  → "Cuentas de servicio"
  → "Generar nueva clave privada"
  → Guarda como: serviceAccountKey.json
  → Colócalo en: scripts_python/serviceAccountKey.json
```

### 2️⃣ INSTALA DEPENDENCIAS (1 min)
```powershell
cd scripts_python
pip install firebase-admin tqdm
```

### 3️⃣ EJECUTA LA PRUEBA (1-2 min)
```powershell
python prueba_carga_sensores.py
```

✨ **¡Eso es todo!**

---

## 📊 ¿QUÉ VA A PASAR?

Cuando ejecutes el script:

### 1. Genera 200 Sensores 🤖
```
Sensor_001: lat:38.97, lng:-0.18, O3:0.045, CO:5.2, NO2:48.3, ...
Sensor_002: lat:38.98, lng:-0.19, O3:0.052, CO:4.8, NO2:52.1, ...
...
Sensor_200: lat:38.95, lng:-0.17, O3:0.048, CO:6.1, NO2:45.7, ...
```

### 2. Envía Datos a Firebase 📤
```
✓ SENSOR_001 enviado (145ms)
✓ SENSOR_002 enviado (138ms)
✓ SENSOR_003 enviado (152ms)
...
✓ SENSOR_200 enviado (141ms)
```

### 3. Muestra Resultados 📈
```
✅ Éxito: 200/200 (100%)
⏱️  Latencia promedio: 145ms
🚀 Velocidad: 10 docs/segundo
```

---

## 💾 DATOS GENERADOS

Cada sensor envía información realista:

```json
{
  "sensor_id": "SENSOR_001",
  "ubicacion": {
    "lat": 38.9660,
    "lng": -0.1850
  },
  "gases": {
    "O3": 0.045,      // Ozono (ppm)
    "CO": 3.5,        // Monóxido de carbono
    "NO2": 45.2,      // Dióxido de nitrógeno
    "SO2": 25.8,      // Dióxido de azufre
    "CO2": 450        // Dióxido de carbono
  },
  "temperatura": 22.5,
  "humedad": 65.0,
  "aqi": 45,
  "estado": "activo"
}
```

---

## 📈 RESULTADOS ESPERADOS

| Métrica | Valor Esperado | Estado |
|---------|---|---|
| **Sensores creados** | 200 | ✅ |
| **Tasa de éxito** | 100% | ✅ |
| **Latencia promedio** | <200ms | ✅ |
| **Docs/segundo** | 5-10 | ✅ |
| **Tiempo total** | 30-60s | ✅ |

---

## 🔍 VERIFICAR EN FIREBASE

Después de ejecutar, verás en Firebase Console:

```
Firestore Database
└── Sensores
    ├── SENSOR_001
    │   └── datos
    │       └── 2025-12-30T14:35:00Z_sensor_001
    │           └── {todos los campos arriba}
    ├── SENSOR_002
    │   └── datos
    │       └── 2025-12-30T14:35:00Z_sensor_002
    │           └── {...}
    └── ...SENSOR_200
```

**Almacenamiento usado:** ~200 KB

---

## 📚 DOCUMENTACIÓN DISPONIBLE

### 🟢 EMPIEZA AQUÍ
- **GUIA_PRUEBA_CARGA.md** → Paso a paso con capturas
- **CHECKLIST_PRUEBA.md** → Lista interactiva para seguir

### 📖 INFORMACIÓN DETALLADA
- **PRUEBA_CARGA.md** → Especificaciones técnicas completas
- **PRUEBA_CARGA_README.md** → Resumen general

---

## ⚙️ CONFIGURACIÓN FÁCIL

### Cambiar número de sensores
Abre `prueba_carga_sensores.py`, línea 23:
```python
NUM_SENSORES = 200  # Cambiar a: 10, 50, 100, 500, etc.
```

### Cambiar velocidad (threads)
Línea 24:
```python
NUM_THREADS = 20  # Cambiar a: 5, 10, 30, 50, etc.
```

### Cambiar ubicación
Línea 30-31:
```python
LAT_BASE = 38.9660   # Cambiar latitud
LNG_BASE = -0.1850   # Cambiar longitud
```

---

## 🎯 CASOS DE USO

### 1. Prueba Rápida (5 min)
```python
NUM_SENSORES = 20
NUM_THREADS = 5
```
→ Verifica que todo funciona

### 2. Prueba Normal (20 min) ⭐ RECOMENDADO
```python
NUM_SENSORES = 200
NUM_THREADS = 20
```
→ Prueba completa de 200 sensores

### 3. Prueba de Estrés (45 min)
```python
NUM_SENSORES = 1000
NUM_THREADS = 50
```
→ Verifica límites del servidor

---

## 🚨 SI HAY ERRORES

### Error: "serviceAccountKey.json no encontrado"
→ Descárgalo desde Firebase Console y colócalo en `scripts_python/`

### Error: "PERMISSION_DENIED"
→ En Firestore Rules, cambia a: `allow write: if true;` (solo para testing)

### Error: "Module not found"
→ Ejecuta: `pip install firebase-admin tqdm`

### Latencia muy alta (>500ms)
→ Revisa tu conexión a internet o reduce NUM_SENSORES

**Más soluciones en GUIA_PRUEBA_CARGA.md**

---

## ✨ PRÓXIMOS PASOS

Después de la prueba exitosa:

1. **Visualización:** Muestra los sensores en el mapa
2. **Alertas:** Crea notificaciones si AQI > umbral
3. **Histórico:** Guarda datos por día/semana
4. **API:** Crea endpoints para consumir datos
5. **Producción:** Implementa con 200+ sensores reales

---

## 📊 MONITOREO

### En tiempo real mientras se ejecuta
```powershell
python prueba_carga_sensores.py
# Verás barra de progreso en vivo
```

### Después de ejecutar
```powershell
python analizar_resultados.py
# Opción 1: Ver resultados
# Opción 2: Estadísticas de Firestore
# Opción 3: Limpiar datos
```

### En Firebase Console
- Ve a **Firestore** > **Usage**
- Observa picos de escrituras
- Monitorea almacenamiento consumido

---

## 💡 TIPS Y TRUCOS

### Ejecutar múltiples pruebas
```powershell
# Prueba 1: 50 sensores
# Prueba 2: 100 sensores
# Prueba 3: 200 sensores
# Prueba 4: 500 sensores
```

### Guardar resultados
Los resultados se guardan automáticamente en:
```
resultados_prueba_carga.json
```

### Limpiar datos
```powershell
python analizar_resultados.py
# Opción 3 para limpiar todo
```

---

## 📋 RESUMEN DE ARCHIVOS

### Scripts Ejecutables
- ✅ `prueba_carga_sensores.py` - **EJECUTA ESTE**
- ✅ `analizar_resultados.py` - Análisis post-prueba
- ✅ `setup_prueba.py` - Verificación previa

### Documentación
- 📖 `GUIA_PRUEBA_CARGA.md` - **LEE ESTE PRIMERO**
- 📋 `CHECKLIST_PRUEBA.md` - Lista para seguir
- 📚 `PRUEBA_CARGA.md` - Especificaciones
- 📄 `PRUEBA_CARGA_README.md` - Resumen general

---

## 🎓 CONCEPTOS CLAVE

### ¿Por qué 200 sensores?
- Número realista para una ciudad
- Suficiente para probar escalabilidad
- Manejable en términos de datos

### ¿Datos ficticios coherentes?
✅ Rangos realistas de contaminación
✅ Ubicaciones en un área geográfica (Gandía)
✅ Valores que podrían ocurrir en la realidad

### ¿Por qué Firebase?
- Sin servidor (serverless)
- Escalable automáticamente
- Fácil de usar
- Bajo costo para volúmenes pequeños

---

## ✅ CHECKLIST ANTES DE EMPEZAR

- [ ] Python 3.8+ instalado
- [ ] serviceAccountKey.json descargado
- [ ] Archivo colocado en `scripts_python/`
- [ ] Dependencias instaladas (`pip install firebase-admin tqdm`)
- [ ] Navegador con Firebase Console abierto
- [ ] Conexión a internet estable

---

## 🎉 ¡LISTO!

**Todo está listo para que ejecutes la prueba.**

### Pasos finales:
1. Descarga `serviceAccountKey.json` desde Firebase
2. Colócalo en `scripts_python/serviceAccountKey.json`
3. Abre PowerShell en `scripts_python/`
4. Ejecuta: `python prueba_carga_sensores.py`
5. ¡Observa cómo se envían 200 sensores a Firebase!

### Tiempo total: **5-15 minutos**

**¡Mucho éxito con tu prueba de carga! 🚀**

---

*Creado: 2025-12-30*
*Versión: 1.0*
*Proyecto: Breathe Tracking - Prueba de Carga de Sensores IoT*
