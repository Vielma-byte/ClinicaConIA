const { db, storageBucket } = require('../config/firebase');
const transporter = require('../config/mailer');

const axios = require('axios'); // Importar axios para llamadas al servicio de IA

// 5. CREAR UN NUEVO CASO
const createCase = async (req, res) => {
    try {
        const casoData = req.body;
        // Añadimos la fecha de creación y el estado inicial desde el backend
        const nuevoCaso = {
            ...casoData,
            fechaCreacion: new Date().toISOString(),
            estado: 'abierto'
        };

        const docRef = await db.collection('casos').add(nuevoCaso);

        // --- INTEGRACIÓN IA: Análisis Automático ---
        if (casoData.archivos && casoData.archivos.length > 0) {
            // Ejecutamos en "segundo plano" (no esperamos con await para no bloquear la respuesta al usuario)
            // Opcional: Podríamos esperar si queremos confirmar que se inició, pero mejor que sea asíncrono.
            (async () => {
                for (const archivo of casoData.archivos) {
                    try {
                        const extension = archivo.nombre.split('.').pop().toLowerCase();
                        // Enviamos a analizar todo lo que parezca imagen o dicom
                        if (['dcm', 'jpg', 'jpeg', 'png'].includes(extension)) {
                            console.log(`🤖 Solicitando análisis IA para: ${archivo.nombre}`);

                            // Llamada al microservicio de Python (URL configurable para producción)
                            let iaServiceUrl = process.env.IA_SERVICE_URL || 'http://localhost:8000';
                            if (!iaServiceUrl.startsWith('http')) {
                                iaServiceUrl = `https://${iaServiceUrl}`;
                            }
                            const iaResponse = await axios.post(`${iaServiceUrl}/analyze_firebase`, {
                                path: archivo.uploadPath
                            });

                            const resultado = iaResponse.data;

                            // Crear comentario automático con el diagnóstico
                            const comentarioIA = {
                                texto: `🤖 -Análisis de Fracturas con IA (${resultado.status})-:\n` +
                                    `- Predicción: ${resultado.prediction}\n` +
                                    `- Confianza: ${resultado.confidence_fracture}%\n` +
                                    `- Nota: ${resultado.analysis_note}`,
                                autorId: 'sistema_ia',
                                autorNombre: 'Asistente IA',
                                autorRol: 'sistema',
                                fechaCreacion: new Date().toISOString()
                            };

                            // Guardar comentario en la subcolección
                            await db.collection('casos').doc(docRef.id).collection('comentarios').add(comentarioIA);

                            // Actualizar el caso con el último comentario
                            await db.collection('casos').doc(docRef.id).update({
                                lastCommentTimestamp: comentarioIA.fechaCreacion,
                                lastCommentAutor: comentarioIA.autorNombre,
                                lastCommentText: `[IA] ${resultado.prediction}`
                            });

                            console.log(`✅ Diagnóstico IA guardado para ${archivo.nombre}`);
                        }
                    } catch (iaError) {
                        console.error(`❌ Error al analizar archivo ${archivo.nombre} con IA:`, iaError.message);
                        // Opcional: Guardar un comentario de error o simplemente loguear
                    }
                }
            })();
        }

        // --- LÓGICA DE ENVÍO DE CORREO ---
        try {
            // Obtener email del médico especialista
            const medicoDestinoDoc = await db.collection('users').doc(nuevoCaso.medicoEspecialistaId).get();
            const medicoGeneralDoc = await db.collection('users').doc(nuevoCaso.medicoGeneralId).get();

            if (medicoDestinoDoc.exists && medicoGeneralDoc.exists) {
                const emailDestino = medicoDestinoDoc.data().email;
                const emailOrigen = medicoGeneralDoc.data().email;
                const nombreGeneral = nuevoCaso.medicoGeneralNombre;
                const nombrePaciente = nuevoCaso.pacienteNombreCompleto;

                const mailOptions = {
                    from: `"Plataforma Clínica" <${process.env.EMAIL_USER}>`, // El correo se envía desde la cuenta del sistema.
                    to: emailDestino,
                    replyTo: emailOrigen, // ¡Esta es la clave! Las respuestas irán al médico general.
                    subject: `Nuevo caso clínico asignado: ${nombrePaciente}`,
                    html: `
                        <p>Hola Dr. ${nuevoCaso.medicoEspecialistaNombre},</p>
                        <p>Se le ha asignado un nuevo caso clínico para el paciente <strong>${nombrePaciente}</strong>.</p>
                        <p>Motivo de la consulta: ${nuevoCaso.motivoConsulta}</p>
                        <p>Por favor, inicie sesión en la plataforma para revisar los detalles y los archivos adjuntos.</p>
                        <br>
                        <p>Atentamente,</p>
                        <p>Dr. ${nombreGeneral}</p>
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log(`Correo de notificación enviado a ${emailDestino}`);
            }
        } catch (emailError) {
            // Si el correo falla, no detenemos la respuesta exitosa al usuario.
            console.error('Error al enviar el correo de notificación:', emailError);
        }

        // --- CREAR NOTIFICACIÓN EN FIRESTORE ---
        try {
            const notificacion = {
                usuarioId: casoData.medicoEspecialistaId, // El destinatario es el especialista
                tipo: 'nuevo_caso',
                mensaje: `Nuevo caso asignado: ${casoData.pacienteNombreCompleto}`,
                leido: false,
                fechaCreacion: new Date().toISOString(),
                casoId: docRef.id,
                link: `/app/casos/${docRef.id}`
            };
            await db.collection('notifications').add(notificacion);
        } catch (notifError) {
            console.error('Error al crear notificación de nuevo caso:', notifError);
        }

        res.status(201).json({ message: 'Caso enviado con éxito (IA procesando...)', id: docRef.id });
    } catch (error) {
        console.error('Error al crear caso:', error);
        res.status(500).json({ message: 'Error en el servidor al crear el caso.' });
    }
};

// 7. OBTENER DETALLES DE UN CASO ESPECÍFICO
const getCaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const casoRef = db.collection('casos').doc(id);
        const doc = await casoRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Caso no encontrado.' });
        }

        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Error al obtener detalle del caso:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener el caso.' });
    }
};

// 8. OBTENER COMENTARIOS DE UN CASO
const getCaseComments = async (req, res) => {
    try {
        const { id } = req.params;
        const comentariosRef = db.collection('casos').doc(id).collection('comentarios');
        const snapshot = await comentariosRef.orderBy('fechaCreacion', 'asc').get();

        const comentarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(comentarios);
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener comentarios.' });
    }
};

// 10. CERRAR UN CASO
const closeCase = async (req, res) => {
    try {
        const { id } = req.params;
        const casoRef = db.collection('casos').doc(id);
        const { uid: userId, rol: userRole } = req.user;

        const caseDoc = await casoRef.get();
        if (!caseDoc.exists) {
            return res.status(404).json({ message: 'Caso no encontrado.' });
        }
        const caseData = caseDoc.data();

        // Solo el médico especialista asignado o un admin puede cerrar el caso
        if (caseData.medicoEspecialistaId !== userId && userRole !== 'administrador') {
            return res.status(403).json({ message: 'No tienes permiso para cerrar este caso.' });
        }

        await casoRef.update({
            estado: 'cerrado',
            fechaCierre: new Date().toISOString()
        });

        res.status(200).json({ message: 'El caso ha sido cerrado con éxito.' });
    } catch (error) {
        console.error('Error al cerrar el caso:', error);
        res.status(500).json({ message: 'Error en el servidor al cerrar el caso.' });
    }
};

// 9. AÑADIR UN NUEVO COMENTARIO A UN CASO
const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { texto, autorId, autorNombre, autorRol } = req.body;

        if (!texto || !autorId || !autorNombre || !autorRol) {
            return res.status(400).json({ message: 'Faltan datos para añadir el comentario.' });
        }

        // Verificación: No permitir comentarios en casos cerrados
        const casoDoc = await db.collection('casos').doc(id).get();
        if (casoDoc.exists && casoDoc.data().estado === 'cerrado') {
            return res.status(403).json({ message: 'No se pueden añadir comentarios a un caso cerrado.' });
        }

        const comentario = {
            texto,
            autorId,
            autorNombre,
            autorRol,
            fechaCreacion: new Date().toISOString(),
        };

        const docRef = await db.collection('casos').doc(id).collection('comentarios').add(comentario);

        // --- ACTUALIZAR CASO PRINCIPAL CON INFO DEL ÚLTIMO COMENTARIO ---
        await db.collection('casos').doc(id).update({
            lastCommentTimestamp: comentario.fechaCreacion,
            lastCommentAutor: comentario.autorNombre,
            lastCommentText: comentario.texto.substring(0, 50) + (comentario.texto.length > 50 ? '...' : '')
        });

        // --- LÓGICA DE ENVÍO DE CORREO POR NUEVO COMENTARIO ---
        try {
            const caso = casoDoc.data();
            const autorDelComentario = comentario.autorNombre;
            const pacienteNombre = caso.pacienteNombreCompleto;

            let idDestinatario;
            let idRemitente;

            // Determinar quién es el destinatario de la notificación
            if (comentario.autorId === caso.medicoGeneralId) {
                idDestinatario = caso.medicoEspecialistaId;
                idRemitente = caso.medicoGeneralId;
            } else if (comentario.autorId === caso.medicoEspecialistaId) {
                idDestinatario = caso.medicoGeneralId;
                idRemitente = caso.medicoEspecialistaId;
            }

            if (idDestinatario && idRemitente) {
                const docDestinatario = await db.collection('users').doc(idDestinatario).get();
                const docRemitente = await db.collection('users').doc(idRemitente).get();

                if (docDestinatario.exists && docRemitente.exists) {
                    const emailDestino = docDestinatario.data().email;
                    const emailOrigen = docRemitente.data().email;

                    const mailOptions = {
                        from: `"Plataforma Clínica" <${process.env.EMAIL_USER}>`,
                        to: emailDestino,
                        replyTo: emailOrigen,
                        subject: `Nuevo comentario en el caso de: ${pacienteNombre}`,
                        html: `
                            <p>Hola,</p>
                            <p>El <strong>Dr. ${autorDelComentario}</strong> ha añadido un nuevo comentario en el caso del paciente <strong>${pacienteNombre}</strong>.</p>
                            <p><strong>Comentario:</strong> "${comentario.texto}"</p>
                            <p>Por favor, inicie sesión en la plataforma para ver el historial completo y responder.</p>
                        `
                    };
                    await transporter.sendMail(mailOptions);
                    console.log(`Correo de nuevo comentario enviado a ${emailDestino}`);
                }
            }
        } catch (emailError) {
            console.error('Error al enviar correo de notificación por comentario:', emailError);
        }

        // --- CREAR NOTIFICACIÓN EN FIRESTORE (COMENTARIO) ---
        try {
            const caso = casoDoc.data();
            let idDestinatarioNotif;

            if (comentario.autorId === caso.medicoGeneralId) {
                idDestinatarioNotif = caso.medicoEspecialistaId;
            } else if (comentario.autorId === caso.medicoEspecialistaId) {
                idDestinatarioNotif = caso.medicoGeneralId;
            }

            if (idDestinatarioNotif) {
                const notificacion = {
                    usuarioId: idDestinatarioNotif,
                    tipo: 'nuevo_comentario',
                    mensaje: `Nuevo comentario en caso de ${caso.pacienteNombreCompleto}: "${comentario.texto.substring(0, 30)}..."`,
                    leido: false,
                    fechaCreacion: new Date().toISOString(),
                    casoId: id,
                    link: `/app/casos/${id}`
                };
                await db.collection('notifications').add(notificacion);
            }
        } catch (notifError) {
            console.error('Error al crear notificación de comentario:', notifError);
        }

        res.status(201).json({ id: docRef.id, ...comentario });
    } catch (error) {
        console.error('Error al añadir comentario:', error);
        res.status(500).json({ message: 'Error en el servidor al añadir comentario.' });
    }
};

// 6. OBTENER CASOS (FILTRADOS POR ROL)
const getCases = async (req, res) => {
    const { estado } = req.query; // El estado todavía puede venir del query
    const { rol, uid: userId } = req.user; // Usamos el rol y uid del token verificado

    try {
        let query = db.collection('casos');

        if (rol === 'medico') {
            query = query.where('medicoEspecialistaId', '==', userId);
        } else if (rol === 'atencion') {
            query = query.where('medicoGeneralId', '==', userId);
        }
        // Si el rol es 'administrador', no se aplica ningún filtro de usuario, por lo que ve todos los casos.

        if (estado && estado !== 'todos') {
            query = query.where('estado', '==', estado);
        }

        const snapshot = await query.orderBy('fechaCreacion', 'desc').get();
        const casos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(casos);
    } catch (error) {
        console.error('Error detallado al obtener casos:', error);
        res.status(500).json({
            message: 'Error en el servidor al obtener los casos.',
            details: error.message
        });
    }
};

// 11. ACTUALIZAR UN CASO (GENÉRICO)
const updateCase = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const casoRef = db.collection('casos').doc(id);

        await casoRef.update(updates);
        res.status(200).json({ message: 'Caso actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar caso:', error);
        res.status(500).json({ message: 'Error al actualizar el caso' });
    }
};

// 12. ELIMINAR UN CASO
const deleteCase = async (req, res) => {
    const { id } = req.params;
    const { uid: userId, rol: userRole } = req.user;

    // 2. Verificar permisos del usuario
    const isMedicoGeneral = caseData.medicoGeneralId === userId;
    const isMedicoEspecialista = caseData.medicoEspecialistaId === userId;
    const isAdmin = userRole === 'administrador';
};


module.exports = {
    createCase,
    getCaseById,
    getCaseComments,
    closeCase,
    addComment,
    getCases,
    updateCase,
    deleteCase
};
