import io
import os
import numpy as np
import tensorflow as tf
import pydicom
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, storage

# ==========================================
# ⚙️ CONFIGURACIÓN DEL PROYECTO
# ==========================================
# Nombre exacto de tu archivo de modelo (el .keras es el moderno)
MODEL_FILENAME = 'modelo_final_finetuned.keras' 

# Nombre de tu archivo de credenciales de Firebase
CREDENTIALS_FILE = 'credentials.json' 

# Nombre de tu Bucket (búscalo en Firebase Storage, suele ser "proyecto.appspot.com")
# ¡IMPORTANTE! No le pongas "gs://" al principio, solo el dominio.
BUCKET_NAME = 'radiodiagnosticoapp.firebasestorage.app' 

# Tamaño de imagen (DEBE SER IGUAL AL QUE USASTE AL ENTRENAR)
# Si no lo cambiaste en el entrenamiento, por defecto es (224, 224)
IMG_SIZE = (320, 320) 

# ==========================================
# 🚀 INICIALIZACIÓN
# ==========================================
app = FastAPI(title="API de Radiodiagnóstico (Soporte DICOM)")

# 1. Configurar CORS (Permitir peticiones desde tu Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Conectar a Firebase
if not firebase_admin._apps:
    try:
        # Prioridad 1: Variables de Entorno (Producción / Render)
        if os.environ.get('FIREBASE_PRIVATE_KEY'):
            print("🔐 Usando credenciales de ENV VARS...")
            cred_dict = {
                "type": "service_account",
                "project_id": os.environ.get('FIREBASE_PROJECT_ID'),
                "private_key_id": "iso-8859-1", # Opcional
                "private_key": os.environ.get('FIREBASE_PRIVATE_KEY').replace('\\n', '\n'),
                "client_email": os.environ.get('FIREBASE_CLIENT_EMAIL'),
                "client_id": "ignored",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": "ignored"
            }
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {
                'storageBucket': BUCKET_NAME
            })
            print(f"🔥 Firebase conectado (vía ENV) al bucket: {BUCKET_NAME}")
            
        # Prioridad 2: Archivo local json (Desarrollo)
        elif os.path.exists(CREDENTIALS_FILE):
            cred = credentials.Certificate(CREDENTIALS_FILE)
            firebase_admin.initialize_app(cred, {
                'storageBucket': BUCKET_NAME
            })
            print(f"🔥 Firebase conectado (vía JSON) al bucket: {BUCKET_NAME}")
        else:
            print("⚠️ ADVERTENCIA: No se encontraron credenciales (ni ENV ni JSON). La IA no podrá descargar imágenes.")
    except Exception as e:
        print(f"❌ Error conectando Firebase: {e}")

# 3. Cargar el Modelo de IA
print("🧠 Cargando cerebro digital...")
try:
    if os.path.exists(MODEL_FILENAME):
        MODEL = tf.keras.models.load_model(MODEL_FILENAME)
        print("✅ Modelo cargado exitosamente.")
    else:
        print(f"❌ ERROR CRÍTICO: No encuentro el archivo '{MODEL_FILENAME}'")
        MODEL = None
except Exception as e:
    print(f"❌ Error fatal cargando modelo: {e}")
    MODEL = None

# ==========================================
# 🛠️ FUNCIONES DE PROCESAMIENTO
# ==========================================

def process_dicom(dicom_bytes):
    """Convierte un archivo DICOM crudo a una imagen PIL procesable."""
    try:
        # Leer estructura DICOM
        ds = pydicom.dcmread(io.BytesIO(dicom_bytes))
        
        # Extraer matriz de píxeles
        img_array = ds.pixel_array.astype(float)
        
        # NORMALIZACIÓN DINÁMICA (Windowing automático)
        # Convierte los 16-bits del hospital a 8-bits para la IA
        scaled_img = (np.maximum(img_array, 0) / img_array.max()) * 255.0
        scaled_img = np.uint8(scaled_img)
        
        # Convertir a objeto de imagen
        img = Image.fromarray(scaled_img)
        
        # Asegurar RGB (por si viene en escala de grises simple)
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        return img
    except Exception as e:
        print(f"Error interno procesando DICOM: {e}")
        return None

def prepare_image(image_bytes, filename):
    """Prepara cualquier imagen (JPG, PNG, DICOM) para entrar a la IA."""
    
    # 1. Detectar si es DICOM
    if filename.lower().endswith('.dcm'):
        print(f"🩻 Procesando radiografía DICOM: {filename}")
        img = process_dicom(image_bytes)
        if img is None:
            raise ValueError("El archivo DICOM está corrupto o tiene compresión no soportada.")
    else:
        # 2. Procesar imagen estándar
        img = Image.open(io.BytesIO(image_bytes))
    
    # 3. Estandarizar formato
    if img.mode != "RGB":
        img = img.convert("RGB")
    
    # 4. Redimensionar
    img = img.resize(IMG_SIZE)
    
    # 5. Convertir a Array numérico (0 a 255)
    img_array = tf.keras.utils.img_to_array(img)
    img_array = tf.expand_dims(img_array, 0) # Crear batch de 1
    
    # ⚠️ NOTA CRÍTICA: NO aplicamos preprocess_input aquí porque 
    # el modelo .keras ya tiene esa capa integrada adentro.
    # Si lo hacemos aquí, la imagen se daña (doble proceso).
    
    return img_array

def get_prediction_logic(processed_image, filename_display):
    """Lógica matemática de la predicción e interpretación."""
    
    # Inferencia
    prediction = MODEL.predict(processed_image)
    score = float(prediction[0][0])
    
    # INTERPRETACIÓN:
    # Entrenamiento: 0=Fractura, 1=Sano
    # Score bajo (<0.5) -> Tiende a Fractura
    # Score alto (>0.5) -> Tiende a Sano
    
    probability_fracture = 1 - score 
    
    # UMBRALES DE DECISIÓN (Zona de seguridad médica)
    label = "REVISIÓN REQUERIDA" # Por defecto (zona gris 30%-70%)
    status_code = "WARNING"
    
    if probability_fracture > 0.70:
        label = "FRACTURA DETECTADA"
        status_code = "DANGER"
    elif probability_fracture < 0.30:
        label = "SANO"
        status_code = "SUCCESS"
        
    return {
        "filename": filename_display,
        "prediction": label,
        "status": status_code, # Útil para poner colores en tu Frontend (Rojo/Verde)
        "confidence_fracture": round(probability_fracture * 100, 2),
        "raw_score_model": score,
        "analysis_note": "IA sugiere revisión manual." if status_code == "WARNING" else "IA con alta confianza."
    }

# ==========================================
# 📡 ENDPOINTS (RUTAS DE LA API)
# ==========================================

@app.get("/")
def home():
    return {"status": "online", "model": MODEL_FILENAME, "support": "JPG, PNG, DICOM"}

# --- RUTA 1: Para pruebas rápidas desde tu PC ---
@app.post("/predict_local")
async def predict_local(file: UploadFile = File(...)):
    if MODEL is None: raise HTTPException(500, "Modelo no cargado.")
    
    try:
        contents = await file.read()
        processed_image = prepare_image(contents, file.filename)
        return get_prediction_logic(processed_image, file.filename)
    except Exception as e:
        raise HTTPException(500, f"Error analizando imagen: {str(e)}")

# --- RUTA 2: Para tu sistema real (Conexión Firebase) ---
@app.post("/analyze_firebase")
async def analyze_firebase(payload: dict = Body(...)):
    """
    Recibe un JSON: { "path": "pacientes/juan/radio_torax.dcm" }
    Descarga el archivo de Firebase y lo analiza.
    """
    if MODEL is None: raise HTTPException(500, "Modelo no cargado.")
    
    file_path = payload.get("path")
    if not file_path:
        raise HTTPException(400, "Falta el campo 'path' en el JSON.")

    print(f"📥 Solicitando a Firebase: {file_path}")
    
    try:
        # Acceder al Bucket
        bucket = storage.bucket()
        blob = bucket.blob(file_path)
        
        # Descargar a memoria RAM (sin guardar en disco)
        image_bytes = blob.download_as_bytes()
        
        # Procesar
        processed_image = prepare_image(image_bytes, file_path) # Pasamos path para detectar extensión
        
        # Predecir
        return get_prediction_logic(processed_image, file_path)
        
    except Exception as e:
        print(f"Error Firebase/Procesamiento: {e}")
        # Retornamos error 404 si no existe la imagen, o 500 si falló el análisis
        raise HTTPException(404, detail=f"No se pudo procesar la imagen: {str(e)}")