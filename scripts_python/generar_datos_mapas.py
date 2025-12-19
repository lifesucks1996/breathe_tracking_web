"""
@file generar_datos_mapas.py
@brief Script de generación (Seeding) de datos geográficos simulados para Firestore.
@details
Este script se ejecuta en el entorno local (backend/administración) para poblar
la base de datos con información visual.
Genera documentos en la colección 'Mapas_Diarios' con arrays de puntos
geoespaciales y valores aleatorios dentro de rangos realistas para cada gas.
"""

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import random
from datetime import datetime

# --- 1. CONFIGURACIÓN ---
# Carga de credenciales de cuenta de servicio (Admin SDK)
cred = credentials.Certificate("serviceAccountKey.json")

# Inicialización Singleton de la App
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# --- 2. PARÁMETROS ---

"""
@var FECHA_OBJETIVO
@brief Fecha datetime para el objeto timestamp de Firestore.
"""
FECHA_OBJETIVO = datetime(2025, 12, 1)

"""
@var FECHA_STR
@brief Representación en string de la fecha para formar IDs de documentos.
"""
FECHA_STR = "01-12-2025"

# Coordenadas base (Centro de Gandia aprox) y radio de dispersión
LAT_BASE = 38.9660
LNG_BASE = -0.1850
RADIO_VARIACION = 0.015

GASES = ["O3", "CO", "NO2", "SO2", "CO2"]

"""
@var RANGOS
@brief Diccionario de tuplas (min, max) para simular valores realistas.
"""
RANGOS = {
    "O3": (0.040, 0.130),
    "CO": (2.0, 15.0),
    "NO2": (20, 220),
    "SO2": (10, 350),
    "CO2": (400, 2500)
}

def generar_datos():
    """
    @brief Genera y sube los documentos de mapas diarios a Firestore.
    void -> generar_datos() -> void
    
    @details
    Itera sobre la lista de gases definidos en la constante GASES.
    Para cada gas:
    1. Genera 20 puntos aleatorios alrededor de LAT_BASE/LNG_BASE.
    2. Asigna un valor de contaminación aleatorio dentro de los RANGOS permitidos.
    3. Ajusta el redondeo de decimales (enteros para CO2, 3 decimales para el resto).
    4. Construye el ID del documento con formato 'GAS_FECHA' (ej: O3_01-12-2025).
    5. Realiza la escritura en la colección 'Mapas_Diarios'.
    
    @note
    Este proceso sobrescribe los datos si el documento ya existe (operación .set).
    """
    print(f"--- Generando datos para: {FECHA_STR} ---")

    for gas in GASES:
        puntos = []
        # Obtener rango o usar default (0, 100) si falla
        val_min, val_max = RANGOS.get(gas, (0, 100))
        
        # Generar 20 puntos simulados
        for _ in range(20):
            # Dispersión aleatoria en latitud y longitud
            lat = LAT_BASE + random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
            lng = LNG_BASE + random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
            val = random.uniform(val_min, val_max)
            
            # Lógica de formato: CO2 se mide en ppm altas, no necesita decimales
            decimales = 0 if gas == "CO2" else 3

            puntos.append({
                "lat": round(lat, 4),
                "lng": round(lng, 4),
                "valor": round(val, decimales)
            })

        # ID Compuesto: Optimizado para búsquedas directas sin queries
        # Formato: "GAS_FECHA" (ej: CO2_01-12-2025)
        doc_id = f"{gas}_{FECHA_STR}"

        # Estructura del Documento para Firestore
        datos = {
            "Id_gas": gas,
            "Fecha": FECHA_OBJETIVO,
            "Puntos_array": puntos
        }

        # Subir a la colección "Mapas_Diarios"
        db.collection("Mapas_Diarios").document(doc_id).set(datos)
        print(f" Subido: {doc_id}")

if __name__ == "__main__":
    generar_datos()