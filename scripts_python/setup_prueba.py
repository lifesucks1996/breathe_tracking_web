"""
@file setup_prueba.py
@brief Script de configuración rápida para la prueba de carga.
@details
Verifica que todo esté listo antes de ejecutar la prueba.
"""

import os
import sys
import subprocess

def verificar_python():
    """Verifica que Python 3.8+ está instalado"""
    print(" Verificando Python...")
    version = sys.version_info
    if version.major == 3 and version.minor >= 8:
        print(f" Python {version.major}.{version.minor}.{version.micro}\n")
        return True
    else:
        print(f" Python {version.major}.{version.minor} detectado")
        print("   Se requiere Python 3.8 o superior\n")
        return False

def verificar_dependencias():
    """Verifica que las dependencias están instaladas"""
    print(" Verificando dependencias...")
    dependencias = {
        "firebase_admin": "firebase-admin",
        "tqdm": "tqdm"
    }
    
    faltantes = []
    
    for modulo, paquete in dependencias.items():
        try:
            __import__(modulo)
            print(f" {paquete}")
        except ImportError:
            print(f" {paquete} NO instalado")
            faltantes.append(paquete)
    
    if faltantes:
        print(f"\n  Instala las dependencias faltantes:")
        print(f"   pip install {' '.join(faltantes)}\n")
        return False
    
    print()
    return True

def verificar_serviceaccount():
    """Verifica que serviceAccountKey.json existe"""
    print(" Verificando credenciales Firebase...")
    
    ruta = "serviceAccountKey.json"
    
    if os.path.exists(ruta):
        tamaño = os.path.getsize(ruta)
        print(f" {ruta} ({tamaño} bytes)\n")
        return True
    else:
        print(f" {ruta} NO encontrado\n")
        print("   Instrucciones:")
        print("   1. Ve a Firebase Console > Tu Proyecto")
        print("   2. Configuración > Cuentas de Servicio")
        print("   3. Descarga 'Generar nueva clave privada'")
        print("   4. Coloca el archivo en: scripts_python/serviceAccountKey.json\n")
        return False

def verificar_archivos_prueba():
    """Verifica que los scripts de prueba existen"""
    print(" Verificando archivos de prueba...")
    
    archivos = {
        "prueba_carga_sensores.py": "Script principal",
        "analizar_resultados.py": "Análisis de resultados"
    }
    
    todos_existen = True
    
    for archivo, descripcion in archivos.items():
        if os.path.exists(archivo):
            print(f" {archivo} - {descripcion}")
        else:
            print(f" {archivo} NO encontrado - {descripcion}")
            todos_existen = False
    
    print()
    return todos_existen

def main():
    """Ejecución principal"""
    print("\n" + "=" * 70)
    print(" CONFIGURACIÓN RÁPIDA - PRUEBA DE CARGA")
    print("=" * 70 + "\n")
    
    checks = [
        verificar_python(),
        verificar_dependencias(),
        verificar_serviceaccount(),
        verificar_archivos_prueba()
    ]
    
    print("=" * 70)
    
    if all(checks):
        print(" ¡TODO LISTO PARA EJECUTAR LA PRUEBA!")
        print("=" * 70)
        print("\nPróximo paso:")
        print("   python prueba_carga_sensores.py\n")
        return 0
    else:
        print("  FALTAN CONFIGURACIONES")
        print("=" * 70)
        print("\nRevisa los errores arriba y ejecuta setup_prueba.py de nuevo.\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
