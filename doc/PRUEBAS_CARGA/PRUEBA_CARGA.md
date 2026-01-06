# 📊 Prueba de Carga - 200 Nodos Sensores

## 🎯 Objetivo
Simular 200 sensores emitiendo datos ficticios pero coherentes a Firestore para verificar:
- Capacidad de escritura del servidor
- Rendimiento bajo carga
- Latencia de respuesta
- Limite de documentos simultáneos
- Consumo de recursos

---

## 📋 Requisitos Previos

### 1. **Python 3.8+** instalado
```bash
python --version
```

### 2. **Dependencias necesarias**
```bash
pip install firebase-admin concurrent-futures tqdm
```

### 3. **Archivo de credenciales Firebase**
- Obtén `serviceAccountKey.json` desde Firebase Console
- Colócalo en la carpeta raíz del proyecto

---

## 🏗️ Estructura de Datos

### Documento de Sensor
```json
{
  "sensor_id": "SENSOR_001",
  "ubicacion": {
    "lat": 38.9660,
    "lng": -0.1850
  },
  "timestamp": "2025-12-30T14:35:00Z",
  "gases": {
    "O3": 0.045,
    "CO": 3.5,
    "NO2": 45.2,
    "SO2": 25.8,
    "CO2": 450
  },
  "temperatura": 22.5,
  "humedad": 65.0,
  "calidad_aire": "Aceptable"
}
```

---

## 🔧 Pasos para Ejecutar la Prueba

### **Paso 1: Preparar el Ambiente**
```bash
# Navega a la carpeta del proyecto
cd scripts_python

# Crea un entorno virtual (opcional pero recomendado)
python -m venv env
env\Scripts\activate  # Windows
source env/bin/activate  # Linux/Mac
```

### **Paso 2: Instalar Dependencias**
```bash
pip install firebase-admin tqdm
```

### **Paso 3: Crear el Script de Prueba**
Usa el archivo `prueba_carga_sensores.py` (se proporciona a continuación)

### **Paso 4: Ejecutar la Prueba**
```bash
python prueba_carga_sensores.py
```

### **Paso 5: Monitorear Resultados**
- **En tiempo real:**
  - Barra de progreso en consola
  - Estadísticas de envío

- **En Firebase Console:**
  - Firestore > Colección `Sensores`
  - Ver documentos creados
  - Monitorear uso de escrituras/lecturas

---

## 📊 Métricas a Analizar

### 1. **Velocidad de Escritura**
```
Documentos escritos: 200
Tiempo total: X segundos
Documentos/segundo: 200/X
```

### 2. **Tasa de Error**
```
Errores: X/200
Porcentaje de éxito: (200-X)/200 * 100%
```

### 3. **Latencia Promedio**
```
Tiempo promedio por documento: X ms
Min: X ms, Max: Y ms
```

### 4. **Consumo Firebase**
- Escrituras de Firestore: 200
- Almacenamiento: ~200 * ~1KB = ~200KB

---

## ⚙️ Configuración Avanzada

### Aumentar/Disminuir Sensores
Edita en `prueba_carga_sensores.py`:
```python
NUM_SENSORES = 200  # Cambiar este valor
```

### Variar Frecuencia de Envío
```python
INTERVALO_SEGUNDOS = 5  # Envía cada 5 segundos
```

### Configurar Número de Threads
```python
THREADS = 10  # Sensores enviando en paralelo
```

---

## 🚨 Posibles Errores y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `Module not found: firebase_admin` | Dependencia no instalada | `pip install firebase-admin` |
| `FileNotFoundError: serviceAccountKey.json` | Archivo no existe | Descarga desde Firebase Console |
| `PERMISSION_DENIED` | Reglas de Firestore muy restrictivas | Configura reglas: `allow write if true;` (solo testing) |
| `Timeout` | Conexión lenta o servidor saturado | Aumenta `TIMEOUT` en el script |

---

## 📈 Escalabilidad

### Límites de Firebase (Plan Spark/Pay-as-you-go)
- **Escrituras simultáneas:** Ilimitadas
- **Documentos por colección:** Ilimitados
- **Tamaño máximo documento:** 1 MB
- **Velocidad de escritura:** ~5,000 documentos/segundo

### Recomendaciones para Producción
1. **Batch writes:** Agrupa múltiples sensores en un solo documento
2. **Indexing:** Crea índices en campos que busques frecuentemente
3. **Sharding:** Distribuye datos en subcollections para mejor rendimiento
4. **Caché local:** Implementa caché en el cliente

---

## 🔍 Monitoreo en Firebase Console

1. Abre Firebase Console
2. Ve a **Firestore Database**
3. Observa:
   - **Lecturas/Escrituras en tiempo real**
   - **Almacenamiento usado**
   - **Latencia de operaciones**

---

## 📝 Notas Importantes

⚠️ **ADVERTENCIA:** Esta prueba consumirá:
- 200 escrituras en Firestore (costo según plan)
- Ancho de banda de red
- Recursos de CPU/memoria

✅ **RECOMENDACIONES:**
- Ejecuta primero con 10-20 sensores para probar
- Usa un proyecto Firebase de **testing/desarrollo**
- Limpia datos después de la prueba
- Monitorea costos en tiempo real

---

## 📚 Referencias

- [Firebase Admin SDK Python](https://firebase.google.com/docs/database/admin/start?hl=es)
- [Límites de Firestore](https://firebase.google.com/docs/firestore/quotas)
- [Best Practices Firestore](https://firebase.google.com/docs/firestore/best-practices)
