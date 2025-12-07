import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import random
from datetime import datetime

# --- 1. CONFIGURACIÓN ---
cred = credentials.Certificate("serviceAccountKey.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# --- 2. PARÁMETROS ---
FECHA_OBJETIVO = datetime(2025, 12, 1)
FECHA_STR = "01-12-2025"

LAT_BASE = 38.9660
LNG_BASE = -0.1850
RADIO_VARIACION = 0.015


GASES = ["O3", "CO", "NO2", "SO2", "CO2"]

# Rangos para dar realismo a los valores
RANGOS = {
    "O3": (0.040, 0.130),
    "CO": (2.0, 15.0),
    "NO2": (20, 220),
    "SO2": (10, 350),
    "CO2": (400, 2500)
}

def generar_datos():
    print(f"--- Generando datos para: {FECHA_STR} ---")

    for gas in GASES:
        puntos = []
        val_min, val_max = RANGOS.get(gas, (0, 100))
        
        # Generar 20 puntos
        for _ in range(20):
            lat = LAT_BASE + random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
            lng = LNG_BASE + random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
            val = random.uniform(val_min, val_max)
            
            # Decimales: CO2 sin decimales, el resto con 3
            decimales = 0 if gas == "CO2" else 3

            puntos.append({
                "lat": round(lat, 4),
                "lng": round(lng, 4),
                "valor": round(val, decimales)
            })

        # ID: "GAS_FECHA" (ej: CO2_01-12-2025)
        doc_id = f"{gas}_{FECHA_STR}"

        # Estructura del Documento
        datos = {
            "Id_gas": gas,
            "Fecha": FECHA_OBJETIVO,
            "Puntos_array": puntos
        }

        # Subir a la colección "Mapas_Diarios"
        db.collection("Mapas_Diarios").document(doc_id).set(datos)
        print(f"✅ Subido: {doc_id}")

if __name__ == "__main__":
    generar_datos()