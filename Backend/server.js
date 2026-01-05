require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Importar Rutas
const userRoutes = require('./src/routes/userRoutes');
const patientRoutes = require('./src/routes/patientRoutes');
const caseRoutes = require('./src/routes/caseRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

const app = express();
const port = process.env.PORT || 3001;

// --- MIDDLEWARE ---
app.use(helmet()); // Seguridad HTTP

// Configuración de CORS dinámica
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3001'];

app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (como apps móviles o curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por CORS policy'));
        }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    credentials: true
}));
app.use(express.json()); // Permite al servidor entender JSON

// --- RUTAS DE LA API ---
app.use('/api/users', userRoutes);
app.use('/api/pacientes', patientRoutes);
app.use('/api/casos', caseRoutes);
app.use('/api/reports', reportRoutes);

// Ruta base de prueba
app.get('/', (req, res) => {
    res.send('API de Radiodiagnóstico funcionando correctamente.');
});

// --- MIDDLEWARE DE MANEJO DE ERRORES GLOBAL ---
// Este middleware captura cualquier error que ocurra en las rutas
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';

    res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : {}
    });
});

// --- INICIAR SERVIDOR ---
app.listen(port, () => {
    console.log(`[BACKEND] Servidor iniciado y escuchando en http://localhost:${port}`);
});
