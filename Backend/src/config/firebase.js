const admin = require('firebase-admin');
const path = require('path');

// Asegúrate de que la ruta al archivo sea correcta desde donde se ejecuta el servidor
// O usa una variable de entorno para la ruta absoluta si es posible
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'radiodiagnosticoapp.firebasestorage.app'
});

const db = admin.firestore();
const storageBucket = admin.storage().bucket();

module.exports = { admin, db, storageBucket };
