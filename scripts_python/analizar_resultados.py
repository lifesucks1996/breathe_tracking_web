"""
@file analizar_resultados.py
@brief Script para analizar y visualizar resultados de la prueba de carga.
@details
Lee los resultados almacenados y genera estadísticas detalladas.
También permite limpiar datos de prueba de Firestore.
"""

import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os

# ============================================================================
# UTILIDADES
# ============================================================================

def cargar_resultados(archivo="resultados_prueba_carga.json"):
    """Carga los resultados de la prueba desde archivo JSON"""
    try:
        with open(archivo, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f" No se encontró {archivo}")
        print("   Ejecuta primero: python prueba_carga_sensores.py")
        return None

def mostrar_resultados(resultados):
    """Muestra un resumen formateado de los resultados"""
    if not resultados:
        return
    
    r = resultados["resultados"]
    c = resultados["config"]
    
    print("\n" + "=" * 70)
    print(" ANÁLISIS DE RESULTADOS")
    print("=" * 70)
    print(f"\n  Fecha de prueba: {resultados['timestamp']}")
    print(f" Configuración:")
    print(f"   • Sensores: {c['num_sensores']}")
    print(f"   • Threads: {c['num_threads']}")
    
    print(f"\n Estadísticas:")
    total = c['num_sensores']
    print(f"   • Éxitos: {r['exitosos']}/{total} ({(r['exitosos']/total)*100:.1f}%)")
    print(f"   • Fallos: {r['fallos']}/{total} ({(r['fallos']/total)*100:.1f}%)")
    
    print(f"\n  Latencia:")
    print(f"   • Promedio: {r['latencia_promedio']:.2f} ms")
    print(f"   • Mínima: {r['latencia_min']:.2f} ms")
    print(f"   • Máxima: {r['latencia_max']:.2f} ms")
    
    print(f"\n Rendimiento:")
    velocidad = r['exitosos'] / c['num_threads'] if c['num_threads'] > 0 else 0
    print(f"   • Velocidad aproximada: {velocidad:.2f} docs/segundo")
    print(f"   • Documentos por thread: {r['exitosos'] // c['num_threads']:.0f}")
    
    print("\n" + "=" * 70 + "\n")

def inicializar_firebase():
    """Inicializa Firebase Admin SDK"""
    try:
        cred = credentials.Certificate("serviceAccountKey.json")
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        return firestore.client()
    except FileNotFoundError:
        print(" No se encontró serviceAccountKey.json")
        return None

def contar_documentos_sensores(db):
    """Cuenta cuántos sensores hay en Firestore"""
    try:
        sensores = db.collection("Sensores").list_documents()
        count = sum(1 for _ in sensores)
        return count
    except Exception as e:
        print(f" Error al contar sensores: {e}")
        return 0

def obtener_estadisticas_firestore(db):
    """Obtiene estadísticas de los datos en Firestore"""
    print(" Obteniendo estadísticas de Firestore...\n")
    
    try:
        sensores_ref = db.collection("Sensores")
        sensores = sensores_ref.list_documents()
        
        total_sensores = 0
        total_documentos = 0
        
        for sensor_doc in sensores:
            total_sensores += 1
            datos = sensor_doc.collection("datos").list_documents()
            total_documentos += sum(1 for _ in datos)
        
        print("=" * 70)
        print(" ESTADÍSTICAS DE FIRESTORE")
        print("=" * 70)
        print(f"\n Sensores: {total_sensores}")
        print(f" Documentos de datos: {total_documentos}")
        print(f" Promedio docs/sensor: {total_documentos/total_sensores:.1f}" if total_sensores > 0 else "0")
        print("\n" + "=" * 70 + "\n")
        
        return total_sensores, total_documentos
        
    except Exception as e:
        print(f" Error: {e}")
        return 0, 0

def limpiar_datos_sensores(db, sensor_id=None):
    """
    Limpia los datos de sensores de la prueba.
    
    Si sensor_id es None, limpia TODOS los sensores.
    Si sensor_id es una lista de IDs, limpia solo esos.
    """
    print("  Iniciando limpieza de datos...\n")
    
    try:
        if sensor_id is None:
            # Limpiar TODO
            print("  ADVERTENCIA: Se eliminarán TODOS los sensores")
            confirmacion = input("¿Estás seguro? (escribe 'SÍ' para confirmar): ")
            if confirmacion.upper() != "SÍ":
                print(" Limpieza cancelada")
                return
            
            sensores = db.collection("Sensores").list_documents()
            sensores_ids = [doc.id for doc in sensores]
        else:
            sensores_ids = sensor_id if isinstance(sensor_id, list) else [sensor_id]
        
        # Eliminar cada sensor y sus datos
        eliminados = 0
        for s_id in sensores_ids:
            try:
                # Eliminar documentos de datos
                datos = db.collection("Sensores").document(s_id).collection("datos").list_documents()
                for dato_doc in datos:
                    dato_doc.reference.delete()
                
                # Eliminar el sensor
                db.collection("Sensores").document(s_id).delete()
                eliminados += 1
                
            except Exception as e:
                print(f"  Error al eliminar {s_id}: {e}")
        
        print(f"\n Se eliminaron {eliminados} sensor(es)")
        print("=" * 70 + "\n")
        
    except Exception as e:
        print(f" Error durante la limpieza: {e}")

# ============================================================================
# MENÚ INTERACTIVO
# ============================================================================

def main():
    """Menú principal"""
    print("\n" + "=" * 70)
    print(" ANÁLISIS DE PRUEBA DE CARGA")
    print("=" * 70)
    
    while True:
        print("\n Opciones:")
        print("1. Ver resultados de la última prueba")
        print("2. Obtener estadísticas de Firestore")
        print("3. Limpiar datos de prueba (TODOS los sensores)")
        print("4. Salir")
        
        opcion = input("\n¿Qué deseas hacer? (1-4): ").strip()
        
        if opcion == "1":
            resultados = cargar_resultados()
            mostrar_resultados(resultados)
        
        elif opcion == "2":
            db = inicializar_firebase()
            if db:
                contar_documentos_sensores(db)
                obtener_estadisticas_firestore(db)
        
        elif opcion == "3":
            confirmacion = input("\n  ADVERTENCIA: Esto eliminará TODOS los sensores.\n¿Continuar? (s/n): ")
            if confirmacion.lower() == "s":
                db = inicializar_firebase()
                if db:
                    limpiar_datos_sensores(db)
        
        elif opcion == "4":
            print("\n ¡Hasta luego!")
            break
        
        else:
            print(" Opción inválida")

if __name__ == "__main__":
    main()
