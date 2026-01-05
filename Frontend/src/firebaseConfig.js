// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validación de depuración (Solo se ejecuta si alguna clave falta)
if (!firebaseConfig.apiKey) {
  console.error("❌ ERROR CRÍTICO: Firebase config no se cargó. Verifica tu archivo .env");
  console.log("Debug Config:", firebaseConfig);
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios que necesitas para usarlos en tus componentes
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
