const { db, storageBucket } = require('../config/firebase');

// 3. CREAR O ACTUALIZAR UN PACIENTE
const createOrUpdatePatient = async (req, res) => {
    try {
        const pacienteData = req.body;
        if (!pacienteData.nss) {
            return res.status(400).json({ message: 'El NSS es requerido.' });
        }
        // Usamos el NSS como ID del documento para evitar duplicados.
        const pacienteRef = db.collection('pacientes').doc(pacienteData.nss);
        await pacienteRef.set(pacienteData, { merge: true }); // merge: true actualiza sin sobrescribir todo

        res.status(200).json({ message: 'Paciente guardado con éxito', data: pacienteData });
    } catch (error) {
        console.error('Error al guardar paciente:', error);
        res.status(500).json({ message: 'Error en el servidor al guardar el paciente.' });
    }
};

// BUSCAR PACIENTES
const searchPatients = async (req, res) => {
    try {
        const { q } = req.query;

        // Primero, obtenemos todos los pacientes de la base de datos.
        // NOTA: Esto no es escalable para miles de pacientes. Se recomienda usar Algolia o ElasticSearch en producción.
        const snapshot = await db.collection('pacientes').get();
        let pacientes = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data
            };
        });

        // Si hay un término de búsqueda (q), filtramos los resultados en el servidor.
        if (q && typeof q === 'string' && q.trim() !== '') {
            const searchTerm = q.trim().toLowerCase();
            pacientes = pacientes.filter(p =>
                (p.nombre && p.nombre.toLowerCase().includes(searchTerm)) ||
                (p.apellidoP && p.apellidoP.toLowerCase().includes(searchTerm)) ||
                (p.apellidoM && p.apellidoM.toLowerCase().includes(searchTerm)) ||
                (p.nss && p.nss.includes(searchTerm))
            );
        }

        res.status(200).json(pacientes);
    } catch (error) {
        console.error('Error al buscar pacientes:', error);
        res.status(500).json({ message: 'Error en el servidor al buscar pacientes.' });
    }
};

// 4. OBTENER UN PACIENTE POR NSS
const getPatientByNss = async (req, res) => {
    try {
        const { nss } = req.params;
        const doc = await db.collection('pacientes').doc(nss).get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Paciente no encontrado.' });
        }
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Error al obtener paciente:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener el paciente.' });
    }
};

// ELIMINAR UN PACIENTE Y TODOS SUS DATOS ASOCIADOS
const deletePatient = async (req, res) => {
    const { nss } = req.params;

    if (!nss) {
        return res.status(400).json({ message: 'El NSS es requerido.' });
    }

    const batch = db.batch();

    try {
        // Paso 1: Encontrar todos los casos asociados al paciente
        const casosQuery = db.collection('casos').where('pacienteNSS', '==', nss);
        const casosSnapshot = await casosQuery.get();

        if (!casosSnapshot.empty) {
            console.log(`Encontrados ${casosSnapshot.size} casos para el paciente ${nss}. Procediendo a eliminar archivos y casos.`);

            for (const casoDoc of casosSnapshot.docs) {
                const casoData = casoDoc.data();

                // Paso 2: Eliminar archivos de Firebase Storage para cada caso
                if (casoData.archivos && casoData.archivos.length > 0) {
                    const deletePromises = casoData.archivos.map(archivo => {
                        if (archivo.uploadPath) {
                            console.log(`Eliminando archivo de Storage: ${archivo.uploadPath}`);
                            return storageBucket.file(archivo.uploadPath).delete().catch(err => {
                                // No detener el proceso si un archivo no se encuentra, solo registrarlo.
                                console.error(`Error al eliminar ${archivo.uploadPath}, puede que ya no exista:`, err.message);
                            });
                        }
                        return Promise.resolve();
                    });
                    await Promise.all(deletePromises);
                }

                // Paso 3: Añadir el caso al batch de eliminación
                batch.delete(casoDoc.ref);
            }
        }

        // Paso 4: Añadir el documento del paciente al batch de eliminación
        const pacienteRef = db.collection('pacientes').doc(nss);
        const pacienteDoc = await pacienteRef.get();
        if (pacienteDoc.exists) {
            batch.delete(pacienteRef);
        } else {
            console.log(`El documento del paciente con NSS ${nss} no fue encontrado, pero se limpiarán los datos asociados.`);
        }

        // Paso 5: Ejecutar todas las eliminaciones en una sola operación atómica
        await batch.commit();

        res.status(200).json({ message: `Paciente con NSS ${nss} y todos sus datos asociados han sido eliminados con éxito.` });
    } catch (error) {
        console.error(`Error en la eliminación en cascada para el paciente ${nss}:`, error);
        res.status(500).json({ message: 'Error en el servidor durante la eliminación en cascada.', details: error.message });
    }
};

module.exports = {
    createOrUpdatePatient,
    searchPatients,
    getPatientByNss,
    deletePatient
};
