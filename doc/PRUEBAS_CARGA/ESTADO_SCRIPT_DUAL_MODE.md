# 🚀 ESTADO ACTUAL - Script Dual-Mode

## ✅ Cambios Realizados

El script `prueba_carga_sensores.py` ha sido **completamente modificado** para soportar dos modos:

### 1. **MODO PRUEBAS** (Default)
- **Colección:** `Sensores` (simulación aislada)
- **IDs:** `SENSOR_001`, `SENSOR_002`, ..., `SENSOR_200`
- **Estructura:** Sensor → datos → mediciones individuales (subcollection)
- **Campos:** sensor_id, ubicacion(lat/lng), timestamp, gases(objeto), temperatura, humedad, presion, aqi, nivel_calidad, bateria, estado
- **Uso:** Pruebas de carga sin afectar datos reales

### 2. **MODO PRODUCCIÓN** (Nuevo)
- **Colección:** `sensores` (estructura real)
- **IDs:** `10000`, `10001`, ..., `10199` (numéricos)
- **Estructura:** Documento individual con todos los campos
- **Campos:** bateria, co2, estado, id_admin, nombre, ozono, temperatura, ubicacion, ultima_conexion, humedad, monoxido, nitrogeno, azufre
- **Uso:** Simular con estructura real de Firestore

---

## 🔧 Cómo Usar

### Cambiar de Modo
```python
# Línea 36 del script
MODO = "pruebas"       # ← Modo por defecto
# o
MODO = "produccion"    # ← Modo estructura real
```

### Ejecutar Modo Pruebas
```powershell
# El script está configurado así por defecto
python prueba_carga_sensores.py
```

**Resultado en Firebase:**
```
Sensores/
├── SENSOR_001/datos/2025-12-30T14:35:00Z_sensor_001
├── SENSOR_002/datos/2025-12-30T14:35:00Z_sensor_002
└── SENSOR_200/datos/2025-12-30T14:35:00Z_sensor_200
```

### Ejecutar Modo Producción
```powershell
# Primero edita el script línea 36
# MODO = "produccion"

# Luego ejecuta
python prueba_carga_sensores.py
```

**Resultado en Firebase:**
```
sensores/
├── 10000 {bateria, co2, estado, id_admin, nombre, ozono, temperatura, ubicacion, ultima_conexion, humedad, monoxido, nitrogeno, azufre}
├── 10001 {bateria, co2, estado, id_admin, nombre, ozono, temperatura, ubicacion, ultima_conexion, humedad, monoxido, nitrogeno, azufre}
└── 10199 {bateria, co2, estado, id_admin, nombre, ozono, temperatura, ubicacion, ultima_conexion, humedad, monoxido, nitrogeno, azufre}
```

---

## 📊 Funciones Modificadas

### 1. `generar_datos_sensor_pruebas(sensor_id, timestamp)`
**Líneas:** ~92-145
- Genera datos en formato PRUEBAS
- Ubicación con coordenadas (lat, lng)
- Gases como objeto anidado
- Múltiples mediciones por sensor

### 2. `generar_datos_sensor_produccion(sensor_id)`
**Líneas:** ~147-190
- Genera datos en formato PRODUCCIÓN
- Ubicación como texto descriptivo
- Gases como campos individuales
- Un documento único por sensor

### 3. `enviar_sensor_a_firebase(db, sensor_id, timestamp)`
**Líneas:** ~196-224
- Routing inteligente por MODO
- Si MODO == "pruebas": Escribe en `Sensores/sensor_id/datos/timestamp`
- Si MODO == "produccion": Escribe en `sensores/sensor_id`

### 4. `ejecutar_prueba_carga(db, num_sensores, num_threads)`
**Líneas:** ~230-300
- Genera IDs correctos según MODO
  - Pruebas: `SENSOR_001`, `SENSOR_002`, ...
  - Producción: `10000`, `10001`, ...
- Futures concurrentes con ThreadPoolExecutor
- Progreso con tqdm
- Estadísticas finales adaptadas al MODO

---

## 🎯 Ventajas del Dual-Mode

| Aspecto | Pruebas | Producción |
|---|---|---|
| **Aislamiento** | ✅ Datos separados | ✅ Estructura real |
| **Escalabilidad** | ✅ Pruebas sin límite | ✅ Compatible |
| **Precisión** | ✅ Simulado | ✅ Real |
| **Verificación** | ✅ Fácil de testear | ✅ Confiable |

---

## 🔍 Verificar en Firebase Console

### Modo Pruebas
```
Firestore Database
└── Colección "Sensores"
    └── Documento "SENSOR_001"
        └── Subcollection "datos"
            └── Documento "2025-12-30T14:35:00Z_sensor_001"
                ├── sensor_id: "SENSOR_001"
                ├── ubicacion: {lat: 38.966, lng: -0.185}
                ├── gases: {ozono: 0.045, ...}
                └── ...
```

### Modo Producción
```
Firestore Database
└── Colección "sensores"
    └── Documento "10000"
        ├── bateria: 45
        ├── co2: 1250
        ├── estado: "Desconectado"
        ├── id_admin: "admin1"
        ├── nombre: "Sensor123"
        ├── ozono: 0.0816...
        ├── temperatura: 25
        ├── ubicacion: "Plaça Polígono 20"
        ├── ultima_conexion: "2025-12-30T14:35:00Z"
        ├── humedad: 65.0
        ├── monoxido: 5.3
        ├── nitrogeno: 85.2
        └── azufre: 30.1
```

---

## 📈 Flujo de Ejecución

```
Inicio
   ↓
[Inicializar Firebase] ← serviceAccountKey.json
   ↓
[Leer MODO de configuración] (pruebas | produccion)
   ↓
[Generar lista de IDs según MODO]
   ├─ Pruebas: ["SENSOR_001", "SENSOR_002", ..., "SENSOR_200"]
   └─ Producción: [10000, 10001, ..., 10199]
   ↓
[Crear ThreadPoolExecutor con NUM_THREADS]
   ↓
[Para cada sensor ID]
   ├─ [Generar timestamp]
   ├─ [Llamar enviar_sensor_a_firebase()]
   │   ├─ Si pruebas: generar_datos_sensor_pruebas()
   │   └─ Si producción: generar_datos_sensor_produccion()
   ├─ [Registrar latencia y estado]
   └─ [Mostrar progreso con tqdm]
   ↓
[Mostrar estadísticas finales]
   ├─ Total sensores: N
   ├─ Exitosos: X
   ├─ Errores: Y
   ├─ Latencia promedio: Z ms
   ├─ Documentos/segundo: W
   └─ Colección usada: "Sensores" o "sensores"
```

---

## 🧪 Casos de Uso

### Caso 1: Prueba de Carga Estándar
```python
MODO = "pruebas"
NUM_SENSORES = 200
NUM_THREADS = 20
```
→ `python prueba_carga_sensores.py`
→ Resultado: 200 sensores en "Sensores" collection

### Caso 2: Simular Datos Reales
```python
MODO = "produccion"
NUM_SENSORES = 50
NUM_THREADS = 10
```
→ `python prueba_carga_sensores.py`
→ Resultado: 50 sensores en "sensores" collection

### Caso 3: Comparar Ambas Estructuras
```python
# Ejecutar una vez con MODO="pruebas"
# Ejecutar otra vez con MODO="produccion"
# Comparar datos en ambas colecciones
```

---

## ⚙️ Configuración Personalizable

### Número de Sensores
```python
NUM_SENSORES = 200  # Cambiar a 50, 100, 500, etc.
```

### Threads Concurrentes
```python
NUM_THREADS = 20    # Cambiar a 10, 30, etc.
```

### Ubicaciones (Modo Producción)
```python
UBICACIONES = [
    "Plaça Polígono 20",      # Editar según necesidad
    "Calle Principal",
    "Parque Central",
    "Zona Industrial",
    "Centro Histórico",
    "Barrio Residencial",
    "Frente Marítimo"
]
```

### Administradores (Modo Producción)
```python
IDS_ADMIN = ["admin1", "admin2", "admin3", "admin4", "admin5"]  # Cambiar si necesario
```

### Rangos de Gases
```python
RANGOS = {
    "ozono": (0.040, 0.130),       # min, max
    "monoxido": (2.0, 15.0),
    "nitrogeno": (20, 220),
    "azufre": (10, 350),
    "co2": (400, 2500)
}
```

---

## 📝 Resumen Final

✅ **Script completamente funcional con dual-mode**
✅ **MODO="pruebas"** → Aislado, fácil de testear
✅ **MODO="produccion"** → Estructura real de Firestore
✅ **Cambiar de modo es simple** → Solo 1 línea de código
✅ **Compatible con analizar_resultados.py**
✅ **Documentado y listo para usar**

---

**¿Listo para ejecutar? Elige tu modo y ¡adelante!** 🚀
