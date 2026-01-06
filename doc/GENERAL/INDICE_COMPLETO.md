# 📑 ÍNDICE COMPLETO - Prueba de Carga de 200 Sensores

## 📍 ¿DÓNDE EMPEZAR?

```
🟢 SI TIENES PRISA:           → Lee: INICIO_RAPIDO.md (5 min)
🟡 SI QUIERES DETALLES:        → Lee: GUIA_PRUEBA_CARGA.md (20 min)
🔴 SI QUIERES TODO:            → Lee: Todos los archivos (1 hora)
```

---

## 📚 DOCUMENTACIÓN (4 ARCHIVOS)

### 1. 🚀 **INICIO_RAPIDO.md** ← EMPIEZA AQUÍ
**Tiempo de lectura:** 5 minutos
**Contenido:**
- Resumen ejecutivo
- 3 pasos para empezar
- Qué esperar
- Errores comunes

**Ideal para:**
- Usuarios impacientes
- Solo quiero que funcione rápido

---

### 2. 📖 **GUIA_PRUEBA_CARGA.md** ← RECOMENDADO
**Tiempo de lectura:** 20 minutos
**Contenido:**
- Paso a paso detallado (6 fases)
- Requisitos previos
- Instalación paso a paso
- Monitoreo en Firebase
- Solución de problemas
- Ejemplo de output completo

**Ideal para:**
- Usuarios que quieren entender todo
- Primera vez usando esto

---

### 3. ✅ **CHECKLIST_PRUEBA.md**
**Tiempo de lectura:** 10 minutos (mientras ejecutas)
**Contenido:**
- Checklist interactivo
- 8 fases con checkboxes
- Métricas a registrar
- Solución rápida de problemas

**Ideal para:**
- Seguir paso a paso
- Registrar resultados
- No olvidar nada

---

### 4. 📊 **PRUEBA_CARGA.md**
**Tiempo de lectura:** 15 minutos
**Contenido:**
- Especificaciones técnicas
- Estructura de datos
- Límites de Firebase
- Recomendaciones de producción
- Best practices

**Ideal para:**
- Entender la arquitectura
- Optimizar para producción
- Resolver problemas avanzados

---

### 5. 📄 **PRUEBA_CARGA_README.md**
**Tiempo de lectura:** 10 minutos
**Contenido:**
- Resumen general
- Qué se ha creado
- Configuración avanzada
- Próximos pasos
- Casos de uso

**Ideal para:**
- Visión general
- Planificación futura
- Escalabilidad

---

## 🔧 SCRIPTS (5 ARCHIVOS)

### 1. 🔬 **prueba_carga_sensores.py** ← EJECUTA ESTO
**Tamaño:** ~7 KB
**Líneas:** ~350
**Tiempo de ejecución:** 
- Con 20 sensores: 5-10 segundos
- Con 200 sensores: 30-60 segundos
- Con 500 sensores: 1-2 minutos

**Qué hace:**
- Simula N sensores IoT
- Envía datos realistas a Firebase
- Mide latencia y velocidad
- Genera barra de progreso
- Guarda resultados en JSON

**Configuración:**
```python
NUM_SENSORES = 200      # Línea 23
NUM_THREADS = 20        # Línea 24
TIMEOUT_SEGUNDOS = 30   # Línea 25
```

**Output:**
- Consola: Barra de progreso + resultados
- Archivo: `resultados_prueba_carga.json`

---

### 2. 📊 **analizar_resultados.py**
**Tamaño:** ~4 KB
**Líneas:** ~200
**Tiempo de ejecución:** Instantáneo

**Qué hace:**
- Lee resultados de pruebas anteriores
- Obtiene estadísticas de Firestore
- Limpia datos de prueba
- Menú interactivo

**Menú:**
```
1. Ver resultados de la última prueba
2. Obtener estadísticas de Firestore
3. Limpiar datos de prueba (TODOS)
4. Salir
```

**Cuándo usar:**
- Después de ejecutar prueba
- Para ver estadísticas en Firestore
- Para limpiar datos

---

### 3. 🔧 **setup_prueba.py**
**Tamaño:** ~2 KB
**Líneas:** ~100
**Tiempo de ejecución:** 2-5 segundos

**Qué hace:**
- Verifica Python 3.8+
- Verifica firebase-admin instalado
- Verifica tqdm instalado
- Verifica serviceAccountKey.json existe
- Verifica scripts de prueba existen

**Cuándo usar:**
- Antes de la primera prueba (verificación)
- Si tienes errores de configuración

**Output esperado:**
```
✅ Python 3.10.x
✅ firebase-admin
✅ tqdm
✅ serviceAccountKey.json
✅ prueba_carga_sensores.py
✅ analizar_resultados.py

✨ ¡TODO LISTO PARA EJECUTAR LA PRUEBA!
```

---

### 4. 📁 **generar_datos_mapas.py** (EXISTENTE)
**Ubicación:** `scripts_python/`
**Nota:** Ya existe en tu proyecto
**Propósito:** Genera datos ficticios para mapas

---

### 5. 📁 **generar_semana_datos.py** (EXISTENTE)
**Ubicación:** `scripts_python/`
**Nota:** Ya existe en tu proyecto
**Propósito:** Genera datos históricos de una semana

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
breathe_tracking_web/
│
├── 📚 DOCUMENTACIÓN PRINCIPAL
│   ├── 🚀 INICIO_RAPIDO.md              ← EMPIEZA AQUÍ (5 min)
│   ├── 📖 GUIA_PRUEBA_CARGA.md          ← GUÍA DETALLADA (20 min)
│   ├── ✅ CHECKLIST_PRUEBA.md            ← CHECKLIST (interactivo)
│   ├── 📊 PRUEBA_CARGA.md               ← ESPECIFICACIONES
│   └── 📄 PRUEBA_CARGA_README.md        ← RESUMEN GENERAL
│
├── 🔧 SCRIPTS (scripts_python/)
│   ├── 🔬 prueba_carga_sensores.py      ← EJECUTA ESTO
│   ├── 📊 analizar_resultados.py
│   ├── 🔧 setup_prueba.py
│   ├── 📁 generar_datos_mapas.py        (ya existe)
│   └── 📁 generar_semana_datos.py       (ya existe)
│
├── 🔐 CREDENCIALES (descargables)
│   └── serviceAccountKey.json           ← Descarga desde Firebase
│
└── 📊 RESULTADOS (se genera automáticamente)
    └── resultados_prueba_carga.json     ← Después de ejecutar prueba
```

---

## 🎯 RUTAS RECOMENDADAS SEGÚN TU PERFIL

### 👤 Perfil: "Solo quiero que funcione"
```
1. Lee: INICIO_RAPIDO.md (5 min)
2. Descarga: serviceAccountKey.json
3. Ejecuta: python prueba_carga_sensores.py
4. Listo ✅
```
**Tiempo total: 10 minutos**

---

### 👤 Perfil: "Quiero entenderlo todo"
```
1. Lee: INICIO_RAPIDO.md (5 min)
2. Lee: GUIA_PRUEBA_CARGA.md (20 min)
3. Ejecuta: python setup_prueba.py (2 min)
4. Ejecuta: python prueba_carga_sensores.py (2 min)
5. Lee: CHECKLIST_PRUEBA.md mientras se ejecuta
6. Analiza: python analizar_resultados.py (5 min)
```
**Tiempo total: 35 minutos**

---

### 👤 Perfil: "Voy a producción"
```
1. Lee todo: Todos los archivos .md (1 hora)
2. Ejecuta pruebas: Con 20, 100, 200, 500 sensores
3. Analiza: Métricas y resultados
4. Lee: PRUEBA_CARGA.md > Sección producción
5. Implementa: Servicio de sensores reales
```
**Tiempo total: 2-3 horas**

---

## 📊 CONTENIDO DE CADA DOCUMENTACIÓN

### INICIO_RAPIDO.md
```
✅ Resumen ejecutivo
✅ 3 pasos para empezar
✅ Qué va a pasar
✅ Datos generados
✅ Resultados esperados
✅ Cómo verificar en Firebase
✅ Configuración fácil
✅ Casos de uso
✅ Errores comunes
```

### GUIA_PRUEBA_CARGA.md
```
✅ Requisitos previos
✅ 6 Fases completas
✅ Paso a paso detallado
✅ Instalación Python
✅ Instalación dependencias
✅ Ejecución de prueba
✅ Ver resultados
✅ Verificar en Firebase
✅ Análisis de resultados
✅ Solución de problemas
✅ Ejemplo de output completo
```

### CHECKLIST_PRUEBA.md
```
✅ 8 Fases con checkboxes
✅ Preparación (5 min)
✅ Verificación (2 min)
✅ Prueba rápida (5 min)
✅ Prueba completa (60 seg)
✅ Análisis (5 min)
✅ Verificación Firebase (5 min)
✅ Limpieza (1 min)
✅ Conclusiones
```

### PRUEBA_CARGA.md
```
✅ Objetivo
✅ Requisitos
✅ Estructura de datos
✅ Pasos de ejecución
✅ Métricas a analizar
✅ Configuración avanzada
✅ Errores y soluciones
✅ Escalabilidad
✅ Monitoreo
✅ Referencias
```

### PRUEBA_CARGA_README.md
```
✅ Qué se ha creado
✅ Archivos creados
✅ Inicio rápido (5 min)
✅ Qué hace cada script
✅ Datos generados
✅ Resultados esperados
✅ Estructura en Firestore
✅ Configuración
✅ Casos de uso
✅ Monitoreo Firebase
✅ Costo estimado
✅ Próximos pasos
```

---

## 🚀 FLUJO DE EJECUCIÓN

```
┌─────────────────────────────────────┐
│  LEE: INICIO_RAPIDO.md (5 min)      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  DESCARGA: serviceAccountKey.json   │
│  (Desde Firebase Console)           │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  INSTALA: pip install firebase...   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  VERIFICA: python setup_prueba.py   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  EJECUTA: python prueba_carga...    │
│  (30-60 segundos)                   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  ANALIZA: python analizar_result... │
│  (Ver resultados en tiempo real)    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  VERIFICA: Firebase Console         │
│  (Observar 200 sensores creados)    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  OPCIONAL: Limpiar datos            │
│  python analizar_resultados.py > 3  │
└────────────┬────────────────────────┘
             │
             ▼
        ✨ ¡LISTO! ✨
```

---

## 💾 ARCHIVOS QUE SE GENERARÁN

### Después de ejecutar `prueba_carga_sensores.py`

```
scripts_python/
├── resultados_prueba_carga.json  ← Se crea aquí
└── prueba_carga_sensores.py
```

**Contenido de resultados_prueba_carga.json:**
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
    "latencia_min": 95.23,
    "latencia_max": 234.67
  }
}
```

---

## 🎓 INFORMACIÓN ADICIONAL

### ¿Qué son los gases medidos?

| Gas | Rango | Unidad | Significado |
|-----|-------|--------|-------------|
| **O3** | 0.04-0.13 | ppm | Ozono (capa baja = malo) |
| **CO** | 2-15 | mg/m³ | Monóxido de carbono |
| **NO2** | 20-220 | μg/m³ | Dióxido de nitrógeno |
| **SO2** | 10-350 | μg/m³ | Dióxido de azufre |
| **CO2** | 400-2500 | ppm | Dióxido de carbono |

### ¿Qué es AQI (Air Quality Index)?

```
0-50    → Excelente  ✨
51-100  → Bueno      ✅
101-150 → Aceptable  ⚠️
151-200 → Pobre      ❌
>200    → Muy Pobre  🔴
```

---

## ✨ RESUMEN

### He creado para ti:

✅ **5 scripts Python** listos para usar
✅ **5 archivos de documentación** completa
✅ **0 dependencias complicadas** (solo firebase y tqdm)
✅ **Datos realistas** y coherentes
✅ **Menús interactivos** fáciles de usar
✅ **Informes automáticos** en JSON
✅ **Solución de problemas** incluida

### Tiempo de implementación:

- ⚡ Mínimo: **5 minutos** (solo ejecutar)
- 📚 Normal: **20 minutos** (leer + ejecutar)
- 🎓 Completo: **1 hora** (entender + optimizar)

---

## 🎯 PRÓXIMOS PASOS

### Inmediato
1. ✅ Lee INICIO_RAPIDO.md
2. ✅ Descarga serviceAccountKey.json
3. ✅ Ejecuta prueba_carga_sensores.py

### Corto plazo
4. ✅ Analiza resultados
5. ✅ Aumenta a 500 sensores
6. ✅ Visualiza en Firebase Console

### Mediano plazo
7. ✅ Integra en tu aplicación
8. ✅ Crea servicio de envío continuo
9. ✅ Implementa alertas

### Largo plazo
10. ✅ Usa con sensores reales
11. ✅ Escala a 1000+ sensores
12. ✅ Optimiza para producción

---

## 📞 PREGUNTAS FRECUENTES

**P: ¿Necesito cambiar algo para empezar?**
R: No, solo descarga serviceAccountKey.json y ejecuta

**P: ¿Cuánto cuesta?**
R: Firebase plan Spark = Gratis (hasta ciertos límites)

**P: ¿Puedo usar datos reales?**
R: Sí, adapta prueba_carga_sensores.py para leer de tu API

**P: ¿Puedo aumentar a 1000 sensores?**
R: Sí, solo cambia NUM_SENSORES = 1000

**P: ¿Qué pasa si me equivoco?**
R: Puedes limpiar todo con: python analizar_resultados.py > 3

---

## 🎉 ¡LISTO PARA EMPEZAR!

Tienes todo lo necesario. Ahora:

1. **Abre INICIO_RAPIDO.md**
2. **Sigue los 3 pasos**
3. **¡Observa cómo funcionan 200 sensores!**

**¡Mucho éxito! 🚀**

---

*Índice Completo*
*Fecha: 2025-12-30*
*Versión: 1.0*
