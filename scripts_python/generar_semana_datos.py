"""
@file generar_semana_datos.py
@brief Script de generación masiva de datos históricos para una semana completa.
@details
Versión optimizada con:
- Mayor densidad de puntos (40-60 por gas)
- Puntos más concentrados (radio reducido)
- Valores ajustados para mayor variedad visual
- Clusters de contaminación realistas
"""
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import random
from datetime import datetime, timedelta
import math

# --- 1. CONFIGURACIÓN ---
cred = credentials.Certificate("serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

# --- 2. PARÁMETROS GENERALES ---
FECHA_INICIO = datetime(2025, 12, 1)
NUM_DIAS = 7

# Centro aproximado de Gandía
LAT_BASE = 38.9660
LNG_BASE = -0.1850

# RADIO MÁS PEQUEÑO para puntos más cercanos (antes: 0.015, ahora: 0.008)
RADIO_VARIACION = 0.008  # ~800 metros en lugar de 1.5 km

# LISTA DE GASES
GASES = ["O3", "CO", "NO2", "SO2", "CO2"]

# RANGOS OPTIMIZADOS para mayor variedad visual
RANGOS = {
    "O3":  (0.015, 0.085),  # Más valores en zona verde/amarilla
    "CO":  (1.0, 25.0),     # Mayor dispersión
    "NO2": (10, 320),       # Rango amplio
    "SO2": (5, 420),        # Incluye todos los niveles
    "CO2": (250, 1800)      # Más variedad verde-amarillo
}

def generar_clusters(lat_centro, lng_centro, num_clusters=3):
    """
    @brief Genera centros de clusters de contaminación
    @param lat_centro Centro base latitud
    @param lng_centro Centro base longitud
    @param num_clusters Número de focos de contaminación
    @return Lista de tuplas (lat, lng) con los centros
    """
    clusters = []
    for _ in range(num_clusters):
        # Desplazamiento del cluster respecto al centro
        offset_lat = random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
        offset_lng = random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
        clusters.append((lat_centro + offset_lat, lng_centro + offset_lng))
    return clusters

def generar_puntos_alrededor_cluster(lat_cluster, lng_cluster, num_puntos, radio_cluster):
    """
    @brief Genera puntos concentrados alrededor de un cluster
    @param lat_cluster Centro del cluster
    @param lng_cluster Centro del cluster
    @param num_puntos Número de puntos a generar
    @param radio_cluster Radio de dispersión del cluster
    @return Lista de tuplas (lat, lng)
    """
    puntos = []
    for _ in range(num_puntos):
        # Distribución gaussiana para concentrar puntos en el centro
        angulo = random.uniform(0, 2 * math.pi)
        # Usar distribución normal para que los puntos estén más cerca del centro
        distancia = abs(random.gauss(0, radio_cluster / 2))
        distancia = min(distancia, radio_cluster)  # Limitar al radio máximo
        
        lat = lat_cluster + distancia * math.cos(angulo)
        lng = lng_cluster + distancia * math.sin(angulo)
        puntos.append((lat, lng))
    return puntos

def generar_semana():
    """
    @brief Ejecuta la simulación y carga de datos para el periodo definido.
    OPTIMIZADO para mayor densidad y continuidad visual.
    """
    print(f" Iniciando generación OPTIMIZADA para {NUM_DIAS} días...\n")
    
    for i in range(NUM_DIAS):
        fecha_actual_obj = FECHA_INICIO + timedelta(days=i)
        fecha_str = fecha_actual_obj.strftime("%d-%m-%Y")
        
        print(f" Procesando día: {fecha_str}...")
        
        # Factor climático del día (0.6 = muy limpio, 1.4 = muy contaminado)
        factor_clima = random.uniform(0.6, 1.4)
        
        # Desplazamiento diario de la nube (más sutil)
        move_lat = random.uniform(-0.004, 0.004)
        move_lng = random.uniform(-0.004, 0.004)
        
        for gas in GASES:
            val_min, val_max = RANGOS.get(gas, (0, 100))
            
            # GENERAR MÚLTIPLES CLUSTERS (focos de contaminación)
            num_clusters = random.randint(2, 4)  # 2-4 focos por gas
            clusters = generar_clusters(LAT_BASE + move_lat, LNG_BASE + move_lng, num_clusters)
            
            puntos = []
            
            # AUMENTAR NÚMERO TOTAL DE PUNTOS (40-60 en lugar de 18-25)
            num_puntos_total = random.randint(45, 65)
            puntos_por_cluster = num_puntos_total // num_clusters
            
            # Generar puntos para cada cluster
            for cluster_lat, cluster_lng in clusters:
                # Radio del cluster más pequeño para mayor densidad
                radio_cluster = RADIO_VARIACION * 0.6  # 60% del radio total
                
                coords = generar_puntos_alrededor_cluster(
                    cluster_lat, 
                    cluster_lng, 
                    puntos_por_cluster,
                    radio_cluster
                )
                
                # Generar valores para este cluster
                # Cada cluster tiene su propio rango de intensidad
                intensidad_cluster = random.uniform(0.7, 1.3)
                
                for lat, lng in coords:
                    # Valor base aleatorio
                    val_base = random.uniform(val_min, val_max)
                    
                    # Aplicar factores: clima global + intensidad local del cluster
                    val_final = val_base * factor_clima * intensidad_cluster
                    
                    # Evitar valores negativos
                    val_final = max(0.0, val_final)
                    
                    # Redondeo
                    decimales = 0 if gas == "CO2" else 3
                    
                    puntos.append({
                        "lat": round(lat, 4),
                        "lng": round(lng, 4),
                        "valor": round(val_final, decimales)
                    })
            
            # AÑADIR PUNTOS DE RELLENO para continuidad
            # Puntos adicionales distribuidos uniformemente para evitar huecos
            num_relleno = random.randint(10, 15)
            for _ in range(num_relleno):
                lat = (LAT_BASE + move_lat) + random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
                lng = (LNG_BASE + move_lng) + random.uniform(-RADIO_VARIACION, RADIO_VARIACION)
                
                # Valores más bajos para el relleno (fondo)
                val_base = random.uniform(val_min, val_min + (val_max - val_min) * 0.4)
                val_final = val_base * factor_clima * 0.7  # 70% de intensidad
                val_final = max(0.0, val_final)
                
                decimales = 0 if gas == "CO2" else 3
                puntos.append({
                    "lat": round(lat, 4),
                    "lng": round(lng, 4),
                    "valor": round(val_final, decimales)
                })
            
            # Subir a Firebase
            doc_id = f"{gas}_{fecha_str}"
            datos = {
                "Id_gas": gas,
                "Fecha": fecha_actual_obj,
                "Puntos_array": puntos
            }
            
            db.collection("Mapas_Diarios").document(doc_id).set(datos)
            print(f" {doc_id} - {len(puntos)} puntos generados")
    
    print("\n ¡Terminado! Datos optimizados del 1 al 7 de Diciembre.")
    print(f" Total de puntos por día/gas: ~55-80 puntos")
    print(f" Densidad: Alta (puntos separados ~400-800m)")

if __name__ == "__main__":
    generar_semana()