import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import random
from datetime import datetime, timedelta

# --- 1. CONFIGURACIÓN ---
# Asegúrate de tener tu archivo json en la misma carpeta
cred = credentials.Certificate("serviceAccountKey.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# --- 2. PARÁMETROS GENERALES ---
FECHA_INICIO = datetime(2025, 12, 1) # Empezamos el 1 de Diciembre
NUM_DIAS = 7                         # Generamos una semana completa

# Centro aproximado de Gandía
LAT_BASE = 38.9660
LNG_BASE = -0.1850
RADIO_VARIACION = 0.015

# LISTA DE GASES
# IMPORTANTE: Revisa si en tu base de datos el documento se llama "03" (cero) o "O3" (letra).
# Según tus fotos anteriores era "03". Si lo cambiaste a "O", edita esta lista.
GASES = ["O3", "CO", "NO2", "SO2", "CO2"]

# Rangos de valores realistas
RANGOS = {
    "O3":  (0.040, 0.130), # Ozono (ppm)
    "O3":  (0.040, 0.130), # Por si usas la letra O
    "CO":  (2.0, 15.0),    # Monóxido (mg/m3)
    "NO2": (20, 250),      # Dióxido Nitro (ug/m3)
    "SO2": (10, 350),      # Dióxido Azufre (ug/m3)
    "CO2": (400, 2000)     # Dióxido Carbono (ppm)
}

def generar_semana():
    print(f"🚀 Iniciando generación para {NUM_DIAS} días a partir del 1-12-2025...\n")

    for i in range(NUM_DIAS):
        # Calcular fecha del día actual en el bucle
        fecha_actual_obj = FECHA_INICIO + timedelta(days=i)
        # Formato string para el ID: "01-12-2025", "02-12-2025", etc.
        fecha_str = fecha_actual_obj.strftime("%d-%m-%Y")
        
        print(f"📅 Procesando día: {fecha_str}...")

        # --- VARIACIÓN DIARIA (Simulación de clima) ---
        # Factor polución: 0.7 (día limpio/viento) a 1.3 (día sucio/tráfico)
        factor_clima = random.uniform(0.7, 1.3)
        
        # Desplazamiento del centro: Mueve la "nube" un poco cada día para que no sea estático
        # Se mueve aprox unos 500-800 metros en direcciones aleatorias
        move_lat = random.uniform(-0.006, 0.006)
        move_lng = random.uniform(-0.006, 0.006)

        for gas in GASES:
            puntos = []
            val_min, val_max = RANGOS.get(gas, (0, 100))
            
            # Número de puntos variable (entre 18 y 25 puntos por gas)
            num_puntos = random.randint(18, 25)

            for _ in range(num_puntos):
                # Coordenada = Base + MovimientoDelDía + DispersiónAleatoria
                lat = (LAT_BASE + move_lat) + random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
                lng = (LNG_BASE + move_lng) + random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
                
                # Valor = AleatorioBase * FactorClima
                val_base = random.uniform(val_min, val_max)
                val_final = val_base * factor_clima
                
                # Evitar negativos
                if val_final < 0: val_final = 0.0
                
                # Redondeo: CO2 enteros, el resto 3 decimales
                decimales = 0 if gas == "CO2" else 3

                puntos.append({
                    "lat": round(lat, 4),
                    "lng": round(lng, 4),
                    "valor": round(val_final, decimales)
                })

            # --- ESTRUCTURA DE SUBIDA ---
            # ID Documento: Ej "CO2_05-12-2025"
            doc_id = f"{gas}_{fecha_str}"

            datos = {
                "Id_gas": gas,
                "Fecha": fecha_actual_obj, # Se guarda como Timestamp en Firebase
                "Puntos_array": puntos
            }

            # .set() sobrescribe si existe, o crea si no existe
            db.collection("Mapas_Diarios").document(doc_id).set(datos)
            
    print("\n✅ ¡Terminado! Datos generados del 1 al 7 de Diciembre.")

if __name__ == "__main__":
    generar_semana()