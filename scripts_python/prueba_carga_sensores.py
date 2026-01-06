"""
@file prueba_carga_sensores.py
@brief Script de prueba de carga simulando 200 sensores emitiendo datos a Firebase.
@details
Simula N sensores enviando datos ficticios pero coherentes (siguiendo los rangos
de valores reales de contaminación) a Firestore en paralelo.

Mide:
- Tiempo total de escritura
- Tasa de éxito/error
- Latencia promedio
- Documentos por segundo
"""

import firebase_admin
from firebase_admin import credentials, firestore
import random
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from tqdm import tqdm
import json

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

NUM_SENSORES = 200  # Número de sensores a simular
NUM_THREADS = 20  # Threads concurrentes (sensores enviando en paralelo)
TIMEOUT_SEGUNDOS = 30  # Timeout por operación

# MODO DE OPERACIÓN
# "pruebas" = Colección "Sensores" (para pruebas de carga)
# "produccion" = Colección "sensores" (estructura real existente)
MODO = "pruebas"  # Cambiar a "produccion" para usar estructura real

# Centro de simulación (Gandía, España)
LAT_BASE = 38.9660
LNG_BASE = -0.1850
RADIO_VARIACION = 0.05  # 5km de dispersión

# IDs de administrador (para estructura real)
IDS_ADMIN = ["admin1", "admin2", "admin3", "admin4", "admin5"]

# Ubicaciones reales (para estructura real)
UBICACIONES = [
    "Plaça Polígono 20",
    "Calle Principal",
    "Parque Central",
    "Zona Industrial",
    "Centro Histórico",
    "Barrio Residencial",
    "Frente Marítimo"
]

# Rangos realistas de contaminación
RANGOS = {
    "ozono": (0.040, 0.130),    # O3
    "co2": (400, 2500)          # CO2 - ppm
}

# Índices de calidad del aire (AQI simplificado)
NIVELES_CALIDAD = ["Excelente", "Bueno", "Aceptable", "Pobre", "Muy Pobre"]

# ============================================================================
# INICIALIZACIÓN FIREBASE
# ============================================================================

def inicializar_firebase():
    """
    Inicializa Firebase Admin SDK.
    Carga credenciales desde serviceAccountKey.json
    """
    try:
        cred = credentials.Certificate("serviceAccountKey.json")
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase inicializado correctamente\n")
        return db
    except FileNotFoundError:
        print("❌ Error: No se encontró serviceAccountKey.json")
        print("   Descárgalo desde Firebase Console > Configuración del proyecto > Cuentas de servicio\n")
        exit(1)
    except Exception as e:
        print(f"❌ Error al inicializar Firebase: {e}\n")
        exit(1)

# ============================================================================
# GENERACIÓN DE DATOS
# ============================================================================

def generar_datos_sensor_pruebas(sensor_id):
    """
    Genera datos para MODO PRUEBAS (colección "Sensores").
    Usa EXACTAMENTE los campos que existen en estructura real.
    
    Args:
        sensor_id: ID único del sensor (ej: SENSOR_001)
    
    Returns:
        dict: Documento con estructura idéntica a sensores reales
    """
    ozono = round(random.uniform(0.040, 0.130), 3)
    co2 = random.randint(400, 2500)
    temperatura = random.randint(10, 35)
    bateria = random.randint(15, 100)
    
    estados = ["Desconectado", "Conectado", "En pausa", "Activo"]
    estado = random.choice(estados)
    
    ubicacion = random.choice(UBICACIONES)
    id_admin = random.choice(IDS_ADMIN)
    
    ahora = datetime.now().isoformat()
    
    return {
        "bateria": bateria,
        "co2": co2,
        "estado": estado,
        "id_admin": id_admin,
        "nombre": f"Sensor{random.randint(1, 999)}",
        "ozono": ozono,
        "temperatura": temperatura,
        "ubicacion": ubicacion,
        "ultima_conexion": ahora
    }

def generar_datos_sensor_produccion(sensor_id):
    """
    Genera datos para MODO PRODUCCIÓN (colección "sensores").
    Estructura similar a sensores reales existentes.
    
    Args:
        sensor_id: ID único del sensor (número)
    
    Returns:
        dict: Documento con estructura de sensor real
    """
    # Valor aleatorio para cada gas
    ozono = round(random.uniform(0.040, 0.130), 3)
    co2 = random.randint(400, 2500)
    
    temperatura = random.randint(10, 35)
    bateria = random.randint(15, 100)
    
    # Estados posibles
    estados = ["Desconectado", "Conectado", "En pausa", "Activo"]
    estado = random.choice(estados)
    
    # Ubicación con variación
    ubicacion = random.choice(UBICACIONES)
    id_admin = random.choice(IDS_ADMIN)
    
    # Timestamp actual
    ahora = datetime.now().isoformat()
    
    return {
        "bateria": bateria,
        "co2": co2,
        "estado": estado,
        "id_admin": id_admin,
        "nombre": f"Sensor{random.randint(1, 999)}",
        "ozono": ozono,
        "temperatura": temperatura,
        "ubicacion": ubicacion,
        "ultima_conexion": ahora
    }

# ============================================================================
# ESCRITURA A FIREBASE
# ============================================================================

def enviar_sensor_a_firebase(db, sensor_id, timestamp):
    """
    Envía datos de un sensor a Firestore según el MODO.
    
    Args:
        db: Referencia a Firestore
        sensor_id: ID del sensor (string o número según modo)
        timestamp: Timestamp del envío (para pruebas)
    
    Returns:
        tuple: (sensor_id, éxito: bool, latencia_ms: float, error: str|None)
    """
    tiempo_inicio = time.time()
    
    try:
        if MODO == "pruebas":
            # MODO PRUEBAS: Colección "Sensores" con subcollection "mediciones"
            # Escribir datos tanto en documento principal como en subcollection
            datos = generar_datos_sensor_pruebas(sensor_id)
            db.collection("Sensores").document(sensor_id).set(datos, merge=True)
            db.collection("Sensores").document(sensor_id).collection("mediciones").document(
                timestamp
            ).set(datos, merge=True)
            
        elif MODO == "produccion":
            # MODO PRODUCCIÓN: Colección "sensores" con subcollection "mediciones"
            # Escribir datos tanto en documento principal como en subcollection
            datos = generar_datos_sensor_pruebas(sensor_id)
            db.collection("sensores").document(str(sensor_id)).set(datos, merge=True)
            db.collection("sensores").document(str(sensor_id)).collection("mediciones").document(
                timestamp
            ).set(datos, merge=True)
        
        latencia_ms = (time.time() - tiempo_inicio) * 1000
        return (sensor_id, True, latencia_ms, None)
        
    except Exception as e:
        latencia_ms = (time.time() - tiempo_inicio) * 1000
        return (sensor_id, False, latencia_ms, str(e))

# ============================================================================
# VERIFICACIÓN DE COLECCIONES
# ============================================================================

def verificar_crear_colecciones(db):
    """
    Verifica y crea las colecciones necesarias si no existen.
    En Firestore, las colecciones se crean implícitamente al escribir,
    pero esta función asegura su existencia.
    
    Args:
        db: Referencia a Firestore
    """
    try:
        if MODO == "pruebas":
            coleccion = "Sensores"
        else:
            coleccion = "sensores"
        
        # Intentar obtener documentos de la colección
        docs = db.collection(coleccion).limit(1).stream()
        docs_list = list(docs)
        
        if not docs_list:
            # Colección vacía o no existe - crear documento metadata
            print(f"📝 Colección '{coleccion}' vacía. Creando estructura inicial...")
            db.collection(coleccion).document("_metadata").set({
                "creada_el": datetime.now().isoformat(),
                "proposito": "Colección para sensores IoT",
                "descripcion": "Metadata - Este documento marca que la colección fue inicializada"
            })
            print(f"✅ Colección '{coleccion}' inicializada\n")
        else:
            print(f"✅ Colección '{coleccion}' ya existe\n")
            
    except Exception as e:
        print(f"⚠️  Advertencia al verificar colecciones: {e}\n")

# ============================================================================
# EJECUCIÓN DE PRUEBA
# ============================================================================

def ejecutar_prueba_carga(db, num_sensores=NUM_SENSORES, num_threads=NUM_THREADS):
    """
    Ejecuta la prueba de carga con múltiples sensores en paralelo.
    
    Args:
        db: Referencia a Firestore
        num_sensores: Número de sensores a simular
        num_threads: Número de threads concurrentes
    """
    nombre_coleccion = "Sensores" if MODO == "pruebas" else "sensores"
    
    print("=" * 70)
    print("🔬 PRUEBA DE CARGA - SENSORES IoT")
    print("=" * 70)
    print(f"📊 Configuración:")
    print(f"   • Modo: {MODO.upper()}")
    print(f"   • Colección: '{nombre_coleccion}'")
    print(f"   • Sensores: {num_sensores}")
    print(f"   • Threads: {num_threads}")
    print(f"   • Timestamp: {datetime.now().isoformat()}")
    print("=" * 70)
    print()
    
    timestamp_base = datetime.now().isoformat()
    
    resultados = {
        "exitosos": 0,
        "fallos": 0,
        "latencias": [],
        "errores": []
    }
    
    print("📤 Enviando datos a Firestore...\n")
    
    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        if MODO == "pruebas":
            futures = {
                executor.submit(
                    enviar_sensor_a_firebase, 
                    db, 
                    f"{i:05d}", 
                    f"{timestamp_base}_sensor_{i:05d}"
                ): i 
                for i in range(1, num_sensores + 1)
            }
        else:  # produccion
            futures = {
                executor.submit(
                    enviar_sensor_a_firebase, 
                    db, 
                    i,  # ID numérico
                    None  # No se usa timestamp en modo producción
                ): i 
                for i in range(10000, 10000 + num_sensores)
            }
        
        with tqdm(total=num_sensores, desc="Progreso", unit="sensores") as pbar:
            for future in as_completed(futures):
                sensor_id, exito, latencia, error = future.result()
                
                if exito:
                    resultados["exitosos"] += 1
                    resultados["latencias"].append(latencia)
                else:
                    resultados["fallos"] += 1
                    resultados["errores"].append(f"{sensor_id}: {error}")
                
                pbar.update(1)
    
    # ========================================================================
    # MOSTRAR RESULTADOS
    # ========================================================================
    
    print("\n" + "=" * 70)
    print("📈 RESULTADOS DE LA PRUEBA")
    print("=" * 70)
    
    tasa_exito = (resultados["exitosos"] / num_sensores) * 100
    print(f"\n✅ Éxito: {resultados['exitosos']}/{num_sensores} ({tasa_exito:.1f}%)")
    print(f"❌ Fallos: {resultados['fallos']}/{num_sensores}")
    
    if resultados["latencias"]:
        latencias = resultados["latencias"]
        print(f"\n⏱️  Latencia:")
        print(f"   • Promedio: {sum(latencias)/len(latencias):.2f} ms")
        print(f"   • Mínima: {min(latencias):.2f} ms")
        print(f"   • Máxima: {max(latencias):.2f} ms")
    
    velocidad = resultados["exitosos"] / num_threads
    print(f"\n🚀 Velocidad: ~{velocidad:.1f} documentos/segundo")
    
    if resultados["errores"]:
        print(f"\n⚠️  Errores encontrados:")
        for error in resultados["errores"][:5]:
            print(f"   • {error}")
        if len(resultados["errores"]) > 5:
            print(f"   • ... y {len(resultados['errores']) - 5} más")
    
    print("\n" + "=" * 70)
    print("✨ Prueba completada")
    print("=" * 70)
    print(f"\n📍 Documentos escritos en: {nombre_coleccion}/")
    print(f"🔍 Verifica en Firebase Console > Firestore Database\n")
    
    return resultados

# ============================================================================
# PUNTO DE ENTRADA
# ============================================================================

if __name__ == "__main__":
    # Inicializar Firebase
    db = inicializar_firebase()
    
    # Verificar/crear colecciones necesarias
    verificar_crear_colecciones(db)
    
    # Ejecutar prueba
    try:
        resultados = ejecutar_prueba_carga(db, NUM_SENSORES, NUM_THREADS)
        
        # Guardar resultados en archivo
        with open("resultados_prueba_carga.json", "w") as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "config": {
                    "num_sensores": NUM_SENSORES,
                    "num_threads": NUM_THREADS
                },
                "resultados": {
                    "exitosos": resultados["exitosos"],
                    "fallos": resultados["fallos"],
                    "latencia_promedio": sum(resultados["latencias"]) / len(resultados["latencias"]) if resultados["latencias"] else 0,
                    "latencia_min": min(resultados["latencias"]) if resultados["latencias"] else 0,
                    "latencia_max": max(resultados["latencias"]) if resultados["latencias"] else 0
                }
            }, f, indent=2)
        
        print("💾 Resultados guardados en: resultados_prueba_carga.json\n")
        
    except KeyboardInterrupt:
        print("\n\n⛔ Prueba interrumpida por el usuario")
    except Exception as e:
        print(f"\n❌ Error durante la prueba: {e}")
