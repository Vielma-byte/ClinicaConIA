const admin = require('firebase-admin');
const path = require('path');

// Inicialización de credenciales: Prioridad a Variables de Entorno (Render), luego archivo local (Dev)
let credential;

if (process.env.FIREBASE_PRIVATE_KEY) {
    // Producción / Render
    console.log('[FIREBASE] Usando credenciales de variables de entorno');
    credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
} else {
    // Desarrollo Local
    try {
        console.log('[FIREBASE] Buscando serviceAccountKey.json localmente...');
        const serviceAccount = require('../../serviceAccountKey.json');
        credential = admin.credential.cert(serviceAccount);
    } catch (error) {
        console.error('[CRITICAL] No se encontraron credenciales de Firebase (ni Env Vars ni archivo JSON).');
        console.error('Asegúrate de configurar las variables FIREBASE_... en Render o tener serviceAccountKey.json en local.');
        process.exit(1);
    }
}

admin.initializeApp({
    credential: credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'radiodiagnosticoapp.firebasestorage.app'
});

const db = admin.firestore();
const storageBucket = admin.storage().bucket();

module.exports = { admin, db, storageBucket };
