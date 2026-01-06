const { admin, db } = require('../config/firebase');
const { z } = require('zod');

// Esquema de validación para registro
const registerSchema = z.object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
    email: z.string().email('Formato de email inválido'),
    contrasena: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    rol: z.enum(['medico', 'atencion', 'administrador'], 'Rol no válido')
});

// 1. REGISTRAR UN NUEVO USUARIO
const registerUser = async (req, res) => {
    try {
        // Validar datos con Zod
        const validationResult = registerSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).json({
                message: 'Datos inválidos',
                errors: validationResult.error.errors.map(e => e.message)
            });
        }

        const { nombre, apellido, email, contrasena, rol } = validationResult.data;

        // Crea el usuario en Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: contrasena,
            displayName: `${nombre} ${apellido}`,
        });

        // Guarda datos adicionales (como el rol) en Firestore
        await db.collection('users').doc(userRecord.uid).set({
            nombre,
            apellido,
            rol,
            email,
        });

        res.status(201).json({ uid: userRecord.uid, message: 'Usuario registrado con éxito' });
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });
        }
        res.status(500).json({ message: 'Error en el servidor al registrar el usuario.' });
    }
};

// 2.1 OBTENER TODOS LOS MÉDICOS ESPECIALISTAS
const getDoctors = async (req, res) => {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('rol', '==', 'medico').get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const doctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(doctors);
    } catch (error) {
        console.error('Error al obtener médicos:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener médicos.' });
    }
};

// 2. OBTENER DATOS DE UN USUARIO
const getUserById = async (req, res) => {
    try {
        const { uid } = req.params;
        console.log(`🔍 [GET USER] Buscando usuario con UID: ${uid}`);

        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            console.warn(`⚠️ [GET USER] Usuario NO encontrado en Firestore. UID buscado: ${uid}`);

            // DEBUG: Listar qué usuarios SÍ existen para comparar
            const allUsers = await db.collection('users').select().get();
            const existingIds = allUsers.docs.map(doc => doc.id);
            console.log(`📋 [DEBUG] IDs disponibles en 'users':`, existingIds);

            return res.status(404).json({ message: 'Datos de usuario no encontrados.', debug_ids: existingIds });
        }

        console.log(`✅ [GET USER] Usuario encontrado: ${userDoc.data().email} (${userDoc.data().rol})`);
        res.status(200).json({ id: userDoc.id, ...userDoc.data() });
    } catch (error) {
        console.error('Error al obtener datos de usuario:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener datos de usuario.' });
    }
};

module.exports = {
    registerUser,
    getDoctors,
    getUserById
};
