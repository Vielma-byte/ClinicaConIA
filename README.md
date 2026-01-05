# 🏥 Plataforma Inteligente de Radiodiagnóstico

Sistema web integral que combina gestión clínica avanzada con **Inteligencia Artificial** para asistir en el diagnóstico de radiografías.
Esta solución permite a médicos generales y especialistas gestionar pacientes, visualizar estudios DICOM y recibir **pre-diagnósticos automáticos** de fracturas mediante redes neuronales.

## 🚀 Tecnologías Clave

### 🧠 Inteligencia Artificial (Microservicio)
- **Python + FastAPI**: API de alto rendimiento para inferencia.
- **TensorFlow/Keras**: Modelo de Deep Learning (DenseNet) para detección de fracturas.
- **Firebase Admin SDK**: Descarga segura de imágenes médicas desde la nube.

### 💻 Frontend
- **React + Vite**: Interfaz moderna y ultra-rápida.
- **Tailwind CSS**: Diseño responsivo y accesible.
- **Cornerstone.js**: Visor DICOM profesional integrado.

### 🛡️ Backend & Seguridad API
- **Node.js + Express**: Orquestación de servicios y lógica de negocio.
- **Seguridad**:
    - **CORS Dinámico**: Protección de orígenes.
    - **Helmet**: Cabeceras seguras HTTP.
    - **Variables de Entorno**: Gestión estricta de secretos (`.env`).

---

## ✨ Características y Mejoras Recientes

Este proyecto ha evolucionado para cumplir estándares de producción:

1.  **Diagnóstico Asistido por IA**:
    - Integración de un microservicio Python que analiza automáticamente cada radiografía subida.
    - Generación autónoma de comentarios con probabilidad de fractura y alertas de revisión.

2.  **Arquitectura Híbrida**:
    - Comunicación asíncrona entre Node.js (Backend) y Python (IA).
    - Despliegue orquestado mediante `render.yaml`.

3.  **Seguridad y Resiliencia**:
    - Eliminación de credenciales hardcodeadas (migración a `.env`).
    - Implementación de **Error Boundaries** para proteger la UI de caídas.
    - Manejo global de errores y validación de tipos.

---

## 🛠️ Guía de Instalación

Sigue estos pasos para levantar el proyecto en tu entorno local.

### 1. Prerrequisitos
- Node.js (v18 o superior recomendado)
- npm o pnpm

### 2. Configuración del Backend

```bash
cd Backend
npm install
```

**Variables de Entorno (.env)**
Crea un archivo `.env` en la carpeta `Backend/` basándote en la configuración de Firebase (o copia el ejemplo si existe).
```env
PORT=3001
# Añadir otras claves necesarias según .env.example
```

### 3. Configuración del Frontend

```bash
cd Frontend
npm install
```

**Variables de Entorno (.env)**
Crea un archivo `.env` en la carpeta `Frontend/` copiando el ejemplo proporcionado:
```bash
cp .env.example .env
```
> **IMPORTANTE**: Debes rellenar el archivo `.env` con tus propias credenciales de Firebase (API Key, Project ID, etc.).

### 4. Configuración del Módulo de IA (Python)

Este microservicio procesa las radiografías para dar un pre-diagnóstico.

```bash
cd Backend/api-Test
# Crear entorno virtual (opcional pero recomendado)
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servicio
uvicorn main:app --reload --port 8000
```
> **NOTA**: Necesitas colocar el archivo `credentials.json` de Firebase Admin SDK en esta carpeta para que funcione la descarga de imágenes.

---

## ▶️ Ejecución (Desarrollo)

Para trabajar en el proyecto, necesitarás dos terminales abiertas:

**Terminal 1: Backend**
```bash
cd Backend
npm run dev
# Servidor corriendo en http://localhost:3001
```

**Terminal 2: Frontend**
```bash
cd Frontend
npm run dev
# Aplicación accesible en http://localhost:5173
```

---

## 🔒 Seguridad y Producción

Este proyecto ha sido auditado para producción:
- **Secretos**: No hay claves hardcodeadas. Todo se gestiona vía `.env`.
- **Manejo de Errores**:
    - **Back**: Middleware global para capturar excepciones.
    - **Front**: Error Boundary para evitar "pantallazos blancos" y notificaciones Toast automáticas.
- **CORS**: Configurado dinámicamente para permitir orígenes seguros.

## ☁️ Despliegue en Producción (Render.com)

El proyecto incluye un archivo `render.yaml` ("Blueprint") para desplegar automáticamente los 3 servicios:

1.  **Frontend**: Sitio estático.
2.  **Backend**: Servicio API (Node.js).
3.  **IA Microservicio**: Servicio Web (Python).

**Pasos:**
1.  En Render, selecciona "New" -> "Blueprint".
2.  Conecta tu repositorio de GitHub.
3.  Render detectará `render.yaml` y creará los servicios.
4.  **IMPORTANTE**: Deberás rellenar manualmente las variables de entorno (`.env`) y subir el archivo `credentials.json` en el servicio de IA.

## 📂 Estructura del Proyecto

```
/
├── Backend/          # API REST (Node.js)
│   ├── src/routes/   # Definición de endpoints
│   ├── ia-service/   # Microservicio de IA (Python/FastAPI)
│   │   ├── main.py   # Lógica de predicción
│   │   └── modelo.keras # Modelo de red neuronal
│   └── server.js     # Punto de entrada Backend
│
└── Frontend/         # Aplicación React
    ├── src/
    │   ├── api/      # Configuración de Axios
    │   ├── context/  # Estados globales
    │   └── pages/    # Vistas principales
```
