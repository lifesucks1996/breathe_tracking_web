# 🔄 DOS MODOS DE PRUEBA - Documentación

## 📋 Resumen

El script `prueba_carga_sensores.py` ahora tiene **dos modos**:

1. **MODO PRUEBAS** → Colección `Sensores` (simple, para pruebas de carga)
2. **MODO PRODUCCIÓN** → Colección `sensores` (estructura real existente)

---

## 🎯 Opción 1: MODO PRUEBAS (Default)

### Configuración
```python
MODO = "pruebas"
```

### Estructura en Firebase
```
Sensores/
├── SENSOR_001/
│   └── datos/
│       └── 2025-12-30T14:35:00Z_sensor_001
│           ├── sensor_id: "SENSOR_001"
│           ├── ubicacion: {lat, lng}
│           ├── timestamp: "..."
│           ├── gases: {ozono, monoxido, nitrogeno, azufre, co2}
│           ├── temperatura: 22.5
│           ├── humedad: 65.0
│           ├── bateria: 85.3
│           └── ...
├── SENSOR_002/
│   └── datos/...
└── SENSOR_200/
    └── datos/...
```

### Datos Generados
```json
{
  "sensor_id": "SENSOR_001",
  "ubicacion": {
    "lat": 38.9660,
    "lng": -0.1850
  },
  "timestamp": "2025-12-30T14:35:00.123456",
  "gases": {
    "ozono": 0.045,
    "monoxido": 3.5,
    "nitrogeno": 45.2,
    "azufre": 25.8,
    "co2": 450
  },
  "temperatura": 22.5,
  "humedad": 65.0,
  "presion": 1013.25,
  "aqi": 45,
  "nivel_calidad": "Aceptable",
  "bateria": 85.3,
  "estado": "activo"
}
```

### Cuándo usar
✅ Pruebas iniciales
✅ Pruebas de carga
✅ Desarrollo y testing
✅ Datos históricos por sensor

### Ventajas
- Estructura clara y simple
- Fácil de entender
- Ideal para análisis temporal (múltiples mediciones por sensor)
- Almacena histórico completo

---

## 🚀 Opción 2: MODO PRODUCCIÓN

### Configuración
```python
MODO = "produccion"
```

### Estructura en Firebase
```
sensores/
├── 10000
│   ├── bateria: 45
│   ├── co2: 1250
│   ├── estado: "Desconectado"
│   ├── id_admin: "admin1"
│   ├── nombre: "Sensor123"
│   ├── ozono: 0.0816...
│   ├── temperatura: 25
│   ├── ubicacion: "Plaça Polígono 20"
│   ├── ultima_conexion: "2025-12-30T14:35:00Z"
│   ├── humedad: 65.0
│   ├── monoxido: 5.3
│   ├── nitrogeno: 85.2
│   └── azufre: 30.1
├── 10001
│   └── {...}
├── 10002
│   └── {...}
└── 10199
    └── {...}
```

### Datos Generados
```json
{
  "bateria": 45,
  "co2": 1250,
  "estado": "Desconectado",
  "id_admin": "admin1",
  "nombre": "Sensor123",
  "ozono": 0.0816999971866077,
  "temperatura": 25,
  "ubicacion": "Plaça Polígono 20",
  "ultima_conexion": "2025-12-30T14:35:00Z",
  "humedad": 65.0,
  "monoxido": 5.3,
  "nitrogeno": 85.2,
  "azufre": 30.1
}
```

### Cuándo usar
✅ Simular datos reales existentes
✅ Testing con estructura real
✅ Compatibilidad con código existente
✅ Pruebas de la aplicación web

### Ventajas
- Usa estructura real de sensores
- Compatible con código existente
- Simula estado actual del sensor
- Campos como `estado`, `id_admin`, `ubicacion`

---

## ⚙️ CÓMO CAMBIAR DE MODO

### Paso 1: Edita el script
```bash
nano prueba_carga_sensores.py
# o abre en tu editor favorito
```

### Paso 2: Busca la línea
```python
MODO = "pruebas"  # Línea ~23
```

### Paso 3: Cambia a
```python
MODO = "produccion"  # Para modo producción
# O deja como
MODO = "pruebas"     # Para modo pruebas
```

### Paso 4: Ejecuta
```powershell
python prueba_carga_sensores.py
```

---

## 📊 COMPARATIVA

| Característica | Modo Pruebas | Modo Producción |
|---|---|---|
| **Colección** | `Sensores` | `sensores` |
| **Estructura ID** | `SENSOR_001` | `10000, 10001...` |
| **Subcollections** | Sí (datos/) | No |
| **Historial** | Múltiples documentos | Un solo documento |
| **Campos** | ~13 | ~13 |
| **Ubicación** | Coordenadas (lat, lng) | Texto descriptivo |
| **Batería** | Número (0-100) | Número (0-100) |
| **Estado** | "activo" | "Activo", "Desconectado", etc. |

---

## 🔍 VER DATOS EN FIREBASE

### Modo Pruebas
```
Firebase Console → Firestore Database
→ Colección "Sensores"
→ Documento "SENSOR_001"
→ Subcollection "datos"
→ Documento "2025-12-30T14:35:00Z_sensor_001"
```

### Modo Producción
```
Firebase Console → Firestore Database
→ Colección "sensores"
→ Documento "10000"
→ Ver todos los campos en el panel derecho
```

---

## 📈 EJEMPLOS DE USO

### Ejemplo 1: Prueba de Carga Simple (Modo Pruebas)
```python
MODO = "pruebas"
NUM_SENSORES = 200
NUM_THREADS = 20
```
→ Ejecutar: `python prueba_carga_sensores.py`
→ Resultado: 200 sensores en colección "Sensores"

### Ejemplo 2: Simular Sensores Reales (Modo Producción)
```python
MODO = "produccion"
NUM_SENSORES = 50
NUM_THREADS = 10
```
→ Ejecutar: `python prueba_carga_sensores.py`
→ Resultado: 50 sensores en colección "sensores" con estructura real

### Ejemplo 3: Comparar Ambos Modos
```python
# Primero ejecuta modo pruebas
MODO = "pruebas"
NUM_SENSORES = 100
# python prueba_carga_sensores.py

# Luego ejecuta modo producción
MODO = "produccion"
NUM_SENSORES = 100
# python prueba_carga_sensores.py
```
→ Resultado: 100 sensores en cada colección (Sensores vs sensores)

---

## 🧹 LIMPIAR DATOS

### Limpiar solo modo pruebas
```powershell
python analizar_resultados.py
# Opción 3: Limpiar datos
# Selecciona colección "Sensores"
```

### Limpiar solo modo producción
Manualmente en Firebase Console:
1. Ve a `sensores`
2. Selecciona documentos 10000-10199
3. Elimina uno por uno (o batch delete)

### Limpiar ambos
```powershell
python analizar_resultados.py
# Opción 3: Limpiar datos (ambas colecciones)
```

---

## 💡 RECOMENDACIONES

### Para Desarrollo
- Usa **MODO PRUEBAS**
- Crea muchos sensores (200+)
- Analiza estructura y rendimiento

### Para Testing de Aplicación
- Usa **MODO PRODUCCIÓN**
- Crea sensores con estructura real
- Prueba tu código web con datos reales

### Para Producción
- Considera usar **MODO PRODUCCIÓN**
- Integra con sensores reales
- Mantén estructura consistente

---

## 🔧 PERSONALIZACIÓN

### Cambiar ubicaciones (Modo Producción)
```python
UBICACIONES = [
    "Plaça Polígono 20",      # Edita estos
    "Calle Principal",
    "Parque Central",
    # Agrega más...
]
```

### Cambiar IDs de admin (Modo Producción)
```python
IDS_ADMIN = ["admin1", "admin2", "admin3"]  # Edita
```

### Cambiar rangos de gases
```python
RANGOS = {
    "ozono": (0.040, 0.130),     # Edita min, max
    "monoxido": (2.0, 15.0),
    # ...
}
```

---

## 📝 NOTAS IMPORTANTES

⚠️ **Los datos se acumulan** - No se borran automáticamente entre ejecuciones
- Cada ejecución crea nuevos documentos
- Usa `analizar_resultados.py` para limpiar

⚠️ **Costos de Firebase**
- Modo pruebas: 200 documentos × subcollections = más escrituras
- Modo producción: 200 documentos simples = menos escrituras
- Ambos consumen la misma cantidad de almacenamiento (~200KB)

✅ **Campos automáticos**
- `ultima_conexion`: Se genera automáticamente con timestamp actual
- `bateria`: Valor aleatorio (15-100)
- `estado`: Varía entre "Activo", "Desconectado", etc.

---

## 🎯 RESUMEN RÁPIDO

| Necesito... | Usa... |
|---|---|
| Hacer prueba de carga | Modo Pruebas |
| Simular sensores reales | Modo Producción |
| Comparar estructuras | Ambos modos |
| Testing de mi app web | Modo Producción |
| Desarrollo inicial | Modo Pruebas |

---

**¡Elige el modo que mejor se adapte a tus necesidades!** 🚀
