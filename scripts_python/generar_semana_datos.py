"""
@file generar_seman_datos.py
@brief Script de generación masiva de datos históricos para una semana completa.
@details
Este script extiende la funcionalidad de generación de datos simulando una semana entera (7 días).
Introduce variables de aleatoriedad avanzada para dar realismo a la simulación:
1. Variación temporal (Fechas consecutivas).
2. Factor Climático (Días limpios vs. días contaminados).
3. Desplazamiento Geoespacial (La nube de contaminación se mueve ligeramente cada día).
"""

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import random
from datetime import datetime, timedelta

# --- 1. CONFIGURACIÓN ---
# Carga de credenciales y conexión a Firestore
cred = credentials.Certificate("serviceAccountKey.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# --- 2. PARÁMETROS GENERALES ---

"""
@var FECHA_INICIO
@brief Fecha de inicio de la simulación.
"""
FECHA_INICIO = datetime(2025, 12, 1) # Empezamos el 1 de Diciembre

"""
@var NUM_DIAS
@brief Duración de la simulación en días.
"""
NUM_DIAS = 7 

# Centro aproximado de Gandía
LAT_BASE = 38.9660
LNG_BASE = -0.1850
RADIO_VARIACION = 0.015

# LISTA DE GASES
GASES = ["O3", "CO", "NO2", "SO2", "CO2"]

"""
@var RANGOS
@brief Diccionario de tuplas (min, max) para los valores base de cada gas.
"""
RANGOS = {
    "O3":  (0.040, 0.130), # Ozono (ppm)
    "CO":  (2.0, 15.0),    # Monóxido (mg/m3)
    "NO2": (20, 250),      # Dióxido Nitro (ug/m3)
    "SO2": (10, 350),      # Dióxido Azufre (ug/m3)
    "CO2": (400, 2000)     # Dióxido Carbono (ppm)
}

def generar_semana():
    """
    @brief Ejecuta la simulación y carga de datos para el periodo definido.
    void -> generar_semana() -> void
    
    @details
    Realiza un bucle principal de N días. En cada iteración:
    1. Calcula un 'factor_clima' aleatorio para simular viento o estancamiento del aire.
    2. Calcula un vector de desplazamiento (move_lat, move_lng) para que los puntos no sean estáticos.
    3. Itera por cada gas generando entre 18 y 25 puntos de medición.
    4. Sube el documento resultante a la colección 'Mapas_Diarios' con ID 'GAS_DD-MM-YYYY'.
    
    @note
    Los valores finales se ven afectados por el 'factor_clima' (multiplicador 0.7x a 1.3x).
    """
    print(f"🚀 Iniciando generación para {NUM_DIAS} días a partir del 1-12-2025...\n")

    for i in range(NUM_DIAS):
        # Calcular fecha del día actual en el bucle
        fecha_actual_obj = FECHA_INICIO + timedelta(days=i)
        # Formato string para el ID: "01-12-2025", "02-12-2025", etc.
        fecha_str = fecha_actual_obj.strftime("%d-%m-%Y")
        
        print(f"Procesando día: {fecha_str}...")

        # --- VARIACIÓN DIARIA (Simulación de clima) ---
        # Factor polución: 0.7 (día limpio/viento) a 1.3 (día sucio/tráfico)
        # Esto permite que haya días con niveles globalmente más altos o bajos
        factor_clima = random.uniform(0.7, 1.3)
        
        # Desplazamiento del centro: Mueve la "nube" un poco cada día para que no sea estático
        # Se mueve aprox unos 500-800 metros en direcciones aleatorias
        # Esto evita que el mapa de calor se vea siempre idéntico en la misma posición
        move_lat = random.uniform(-0.006, 0.006)
        move_lng = random.uniform(-0.006, 0.006)

        for gas in GASES:
            puntos = []
            val_min, val_max = RANGOS.get(gas, (0, 100))
            
            # Número de puntos variable (entre 18 y 25 puntos por gas) para variar la densidad
            num_puntos = random.randint(18, 25)

            for _ in range(num_puntos):
                # Coordenada = Base + MovimientoDelDía + DispersiónAleatoria
                lat = (LAT_BASE + move_lat) + random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
                lng = (LNG_BASE + move_lng) + random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
                
                # Valor = AleatorioBase * FactorClima
                val_base = random.uniform(val_min, val_max)
                val_final = val_base * factor_clima
                
                # Evitar negativos por la multiplicación del factor
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
            # Este ID facilita la lectura directa desde el frontend sin queries complejas
            doc_id = f"{gas}_{fecha_str}"

            datos = {
                "Id_gas": gas,
                "Fecha": fecha_actual_obj, # Se guarda como Timestamp nativo de Firestore
                "Puntos_array": puntos
            }

            # .set() sobrescribe si existe, o crea si no existe
            db.collection("Mapas_Diarios").document(doc_id).set(datos)
            
    print("\n¡Terminado! Datos generados del 1 al 7 de Diciembre.")

if __name__ == "__main__":
    generar_semana()