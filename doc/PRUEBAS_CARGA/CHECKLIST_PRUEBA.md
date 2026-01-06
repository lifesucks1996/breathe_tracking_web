# ✅ CHECKLIST - Prueba de Carga Paso a Paso

## 📋 FASE 1: PREPARACIÓN (5 minutos)

### A. Obtener Credenciales Firebase
- [ ] Abre https://console.firebase.google.com
- [ ] Selecciona proyecto `biometria-g3`
- [ ] Ve a ⚙️ **Configuración del proyecto**
- [ ] Abre pestaña **Cuentas de servicio**
- [ ] Haz clic en **"Generar nueva clave privada"**
- [ ] Archivo descargado: `(numero)-privateKey.json`

### B. Configurar Archivo de Credenciales
- [ ] Abre carpeta: `scripts_python/`
- [ ] Renombra archivo a: `serviceAccountKey.json`
- [ ] Verifica que la ruta es:
  ```
  breathe_tracking_web/scripts_python/serviceAccountKey.json
  ```

### C. Instalar Python (si no está instalado)
- [ ] Descarga Python 3.8+ desde python.org
- [ ] Instala seleccionando "Add Python to PATH"
- [ ] Verifica: `python --version` → `Python 3.x.x`

### D. Instalar Dependencias
- [ ] Abre PowerShell/Terminal en: `scripts_python/`
- [ ] Ejecuta: `pip install firebase-admin tqdm`
- [ ] Espera a que termine
- [ ] Verifica: `pip list | findstr firebase`

---

## 📊 FASE 2: VERIFICACIÓN (2 minutos)

### Ejecutar Script de Configuración
```powershell
python setup_prueba.py
```

Debería ver:
```
✅ Python 3.x.x
✅ firebase-admin
✅ tqdm
✅ serviceAccountKey.json
✅ prueba_carga_sensores.py
✅ analizar_resultados.py
```

✅ **Si todo sale verde:** Continúa a Fase 3
❌ **Si hay errores rojos:** Revisa la sección de Solución de Problemas

---

## 🧪 FASE 3: PRUEBA RÁPIDA (5 minutos - RECOMENDADO PRIMERO)

### Editar Configuración
Abre `prueba_carga_sensores.py` y cambia línea 23:
```python
NUM_SENSORES = 20  # Cambiar de 200 a 20 para prueba rápida
```

### Ejecutar Prueba
```powershell
python prueba_carga_sensores.py
```

### Resultados Esperados
- [ ] Barra de progreso: 20/20 [100%]
- [ ] Sin errores en consola
- [ ] Tiempo total: 5-15 segundos
- [ ] Salida: Éxito 20/20

✅ **Si todo sale bien:** Continúa a Fase 4
❌ **Si hay errores:** Revisa Solución de Problemas

---

## 🚀 FASE 4: PRUEBA COMPLETA (60 segundos)

### Restaurar Configuración Completa
Abre `prueba_carga_sensores.py` y restaura:
```python
NUM_SENSORES = 200  # Cambiar de 20 a 200
NUM_THREADS = 20
```

### Ejecutar Prueba Completa
```powershell
python prueba_carga_sensores.py
```

### Monitorear Progreso
- [ ] Barra de progreso en tiempo real
- [ ] Observar velocidad (docs/segundo)
- [ ] Ancho de banda de network

### Resultados Esperados
```
✅ Éxito: 200/200 (100.0%)
❌ Fallos: 0/200
⏱️  Latencia: ~145 ms
🚀 Velocidad: ~10 docs/segundo
```

- [ ] Tasa de éxito: >95%
- [ ] Latencia promedio: <200ms
- [ ] Cero crasheos o crashes

---

## 📈 FASE 5: ANÁLISIS DE RESULTADOS (5 minutos)

### Opción A: Ver Resultados en Archivo
```powershell
# Abre: resultados_prueba_carga.json
# Verifica estructura y valores
```

- [ ] Archivo `resultados_prueba_carga.json` creado
- [ ] JSON válido (sin errores de parseo)
- [ ] Contiene: timestamp, config, resultados

### Opción B: Usar Script de Análisis
```powershell
python analizar_resultados.py
```

Selecciona opción `1` del menú:
- [ ] Muestra resultados de prueba anterior
- [ ] Estadísticas correctas

### Opción C: Obtener Estadísticas de Firestore
```powershell
python analizar_resultados.py
```

Selecciona opción `2` del menú:
- [ ] Muestra sensores: 200
- [ ] Muestra documentos totales: 200
- [ ] Sin errores de conexión

---

## 🔍 FASE 6: VERIFICAR EN FIREBASE CONSOLE (5 minutos)

### Ver Colección de Sensores
1. [ ] Abre https://console.firebase.google.com
2. [ ] Selecciona proyecto `biometria-g3`
3. [ ] Ve a **Firestore Database**
4. [ ] Expande colección **Sensores**
5. [ ] Verifica que existen documentos:
   ```
   SENSOR_001/
   SENSOR_002/
   ...
   SENSOR_200/
   ```

- [ ] Conteo de sensores: 200
- [ ] Cada sensor tiene subcollection `datos`
- [ ] Cada dato tiene campos: sensor_id, ubicacion, gases, temperatura, etc.

### Monitorear Uso de Firebase
1. [ ] Ve a **Firestore Database**
2. [ ] Abre pestaña **Usage** (Uso)
3. [ ] Observa gráficos:
   - [ ] **Writes:** Mostrar pico de 200+ escrituras
   - [ ] **Data stored:** ~200 KB consumidos
   - [ ] **Network:** Datos enviados correctamente

---

## 🧹 FASE 7: LIMPIEZA (1 minuto - OPCIONAL)

### Limpiar Datos de Prueba
Si deseas eliminar los datos generados:

```powershell
python analizar_resultados.py
# Selecciona opción 3: Limpiar datos
# Confirma escribiendo "SÍ"
```

O manualmente desde Firebase:
1. [ ] Firebase Console → Firestore
2. [ ] Click derecho en colección `Sensores`
3. [ ] **Delete collection** → Confirma

- [ ] Colección `Sensores` eliminada completamente
- [ ] Almacenamiento vuelto a 0 KB

---

## 📊 FASE 8: ANÁLISIS FINAL

### Interpretación de Resultados

**✅ EXCELENTE (100% de éxito, <100ms latencia)**
- [ ] Servidor está bien configurado
- [ ] Firebase puede manejar 200+ sensores sin problemas
- [ ] Listo para producción

**⚠️ BUENO (95-99% éxito, 100-200ms latencia)**
- [ ] Funcionamiento aceptable
- [ ] Posible optimización en threads
- [ ] Verificar reglas de Firestore

**❌ PROBLEMAS (>5% fallos, >300ms latencia)**
- [ ] Revisa reglas de Firestore (permisos de escritura)
- [ ] Comprueba conexión a internet
- [ ] Intenta con menos sensores (NUM_SENSORES = 100)

### Métricas a Registrar
```
Fecha: _______________
Sensores: 200
Éxito: ____/200 (__%)
Latencia promedio: ____ ms
Latencia mínima: ____ ms
Latencia máxima: ____ ms
Docs/segundo: ____
Notas: _________________________________
```

---

## 🎯 CONCLUSIÓN

### Si Pasaste Todos los Checks ✅
Felicidades! Tu servidor puede:
- [ ] Manejar 200 sensores simultáneamente
- [ ] Escribir en Firestore sin problemas
- [ ] Mantener latencia aceptable (<200ms)

### Próximos Pasos Sugeridos
- [ ] Aumentar a 500 sensores (prueba de estrés)
- [ ] Implementar servicio de envío continuo
- [ ] Visualizar datos en tiempo real en el mapa
- [ ] Crear alertas automáticas
- [ ] Optimizar con batch writes

---

## 🚨 SOLUCIÓN RÁPIDA DE PROBLEMAS

### Problema: "serviceAccountKey.json no encontrado"
**Checklist:**
- [ ] Archivo existe en `scripts_python/`
- [ ] Se llama exactamente `serviceAccountKey.json`
- [ ] No tiene espacios en blanco

### Problema: "PERMISSION_DENIED"
**Checklist:**
- [ ] Firestore Rules permite escritura: `allow write: if true;`
- [ ] Proyecto está en plan compatible
- [ ] Usuario tiene permisos en Firebase

### Problema: "Timeout"
**Checklist:**
- [ ] Conexión a internet es estable
- [ ] No hay firewall bloqueando Firebase
- [ ] Servidor de Firebase está operacional

### Problema: "Muchos fallos"
**Checklist:**
- [ ] Revisa `.json` en Firebase Console > Usage
- [ ] Reduce NUM_SENSORES a 50
- [ ] Reduce NUM_THREADS a 5
- [ ] Intenta en otra conexión de red

---

## 📞 DUDAS O PROBLEMAS

Si tienes problemas:
1. Revisa **GUIA_PRUEBA_CARGA.md**
2. Revisa **PRUEBA_CARGA.md**
3. Verifica los logs en consola
4. Comprueba Firebase Console > Firestore > Logs

---

## ✨ ¡LISTO!

Has completado la prueba de carga. 

**Resumen:**
- ✅ 200 sensores simulados
- ✅ Datos coherentes y realistas
- ✅ Prueba de escalabilidad exitosa
- ✅ Servidor validado

**Tiempo total:** ~20 minutos

**¡Mucho éxito! 🎉**
