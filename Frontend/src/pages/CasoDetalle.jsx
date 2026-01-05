import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { db } from '../firebaseConfig'; // Importamos la instancia de la DB
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';

const CasoDetalle = ({ loggedInUser }) => {
    const { id } = useParams(); // Obtiene el ID del caso desde la URL
    const [caso, setCaso] = useState(null);
    const [paciente, setPaciente] = useState(null); // Nuevo estado para los detalles del paciente
    const [comentarios, setComentarios] = useState([]);
    const [nuevoComentario, setNuevoComentario] = useState('');
    const [diagnostico, setDiagnostico] = useState('');
    const [isSavingDiagnosis, setIsSavingDiagnosis] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [isEditingDiagnosis, setIsEditingDiagnosis] = useState(false);

    useEffect(() => {
        if (!id) return;

        setLoading(true);

        // --- Listener para el documento del CASO ---
        const unsubCaso = onSnapshot(doc(db, 'casos', id), async (docSnap) => {
            if (docSnap.exists()) {
                const casoData = { id: docSnap.id, ...docSnap.data() };
                setCaso(casoData);
                if (casoData.diagnostico) setDiagnostico(casoData.diagnostico);

                // Una vez que tenemos el caso, obtenemos los detalles del paciente
                if (casoData.pacienteNSS) {
                    // Para el paciente no necesitamos un listener, una sola petición es suficiente.
                    const pacienteRes = await apiClient.get(`/pacientes/${casoData.pacienteNSS}`);
                    setPaciente(pacienteRes.data);
                }
                setError('');
            } else {
                setError('El caso no fue encontrado.');
            }
            setLoading(false);
        }, (err) => {
            setError('No se pudo cargar la información del caso.');
            console.error(err);
            setLoading(false);
        });

        // --- Listener para la subcolección de COMENTARIOS ---
        const q = query(collection(db, 'casos', id, 'comentarios'), orderBy('fechaCreacion', 'asc'));
        const unsubComentarios = onSnapshot(q, (querySnapshot) => {
            const comentariosData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setComentarios(comentariosData);
        }, (err) => {
            console.error("Error al obtener comentarios en tiempo real:", err);
        });

        // --- Función de limpieza ---
        // Se ejecuta cuando el componente se desmonta para detener los listeners
        return () => {
            unsubCaso();
            unsubComentarios();
        };
    }, [id]);

    const handleAddComentario = async (e) => {
        e.preventDefault();
        if (!nuevoComentario.trim()) return;

        try {
            const comentarioData = {
                texto: nuevoComentario,
                autorId: loggedInUser.uid,
                autorNombre: `${loggedInUser.nombre} ${loggedInUser.apellido}`,
                autorRol: loggedInUser.rol,
            };

            const response = await apiClient.post(`/casos/${id}/comentarios`, comentarioData);

            // Añadimos el nuevo comentario a la lista localmente para una UI más rápida
            // NOTA: Esto es opcional, ya que el listener onSnapshot hará lo mismo.
            // Lo mantenemos para que la UI se sienta más instantánea para el que escribe.
            // setComentarios(prevComentarios => [...prevComentarios, response.data]);

            setNuevoComentario(''); // Limpiamos el input
        } catch (error) {
            console.error("Error al añadir comentario:", error);
            alert("No se pudo añadir el comentario.");
        }
    };

    const handleSaveDiagnosis = async () => {
        setIsSavingDiagnosis(true);
        try {
            await apiClient.patch(`/casos/${id}`, { diagnostico });
            setStatusMessage('✅ Diagnóstico guardado correctamente.');
            setIsEditingDiagnosis(false);
            // Opcional: Limpiar el mensaje después de 5 segundos
            setTimeout(() => setStatusMessage(''), 5000);
        } catch (error) {
            console.error('Error al guardar diagnóstico:', error);
            setStatusMessage('❌ Error al guardar el diagnóstico.');
        } finally {
            setIsSavingDiagnosis(false);
        }
    };

    const handleGenerateReport = async () => {
        try {
            // Primero guardamos el diagnóstico actual para asegurar que salga en el PDF
            await apiClient.patch(`/casos/${id}`, { diagnostico });

            const response = await apiClient.post(`/reports/${id}/generate`, {}, {
                responseType: 'blob' // Importante para descargar archivos
            });

            // Crear URL del blob y descargar
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Reporte_${caso.pacienteNSS}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error('Error al generar el reporte:', error);
            alert('No se pudo generar el reporte PDF.');
        }
    };

    const handleCerrarCaso = async () => {
        setShowConfirmModal(false); // Cerramos el modal
        try {
            await apiClient.patch(`/casos/${id}/cerrar`);
            // El listener onSnapshot se encargará de actualizar el estado del caso.
            // setCaso(prevCaso => ({ ...prevCaso, estado: 'cerrado' }));
            // alert('El caso ha sido cerrado con éxito.'); // Reemplazado por la actualización automática
        } catch (error) {
            console.error("Error al cerrar el caso:", error);
            alert('No se pudo cerrar el caso.');
        }
    };


    if (loading) {
        return <div className="p-8 text-center">Cargando detalles del caso...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-blue-500">{error}</div>;
    }

    if (!caso) {
        return <div className="p-8 text-center">Caso no encontrado.</div>;
    }

    // Estilos para reutilizar
    const cardStyle = "bg-white p-6 rounded-lg shadow-md";
    const titleStyle = "text-xl font-bold text-gray-800 mb-4 border-b pb-2";

    const isCasoAbierto = caso.estado === 'abierto';
    const puedeCerrarCaso = loggedInUser && loggedInUser.rol === 'medico' && loggedInUser.uid === caso.medicoEspecialistaId;
    const esMedicoAsignado = loggedInUser && loggedInUser.uid === caso.medicoEspecialistaId;

    return (
        <div className="p-8 bg-gray-50 min-h-full">
            {/* Modal de Confirmación */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirmar Cierre</h2>
                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de que deseas cerrar esta cita? Esta acción es irreversible.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCerrarCaso}
                                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition"
                            >
                                Sí, cerrar caso
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-bold text-gray-800">Detalle del Caso</h1>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${isCasoAbierto ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                    {isCasoAbierto ? 'Abierto' : 'Cerrado'}
                </span>
            </div>

            {statusMessage && (
                <div className={`p-4 mb-6 rounded-lg font-medium shadow-sm transition-all animate-pulse ${statusMessage.startsWith('✅') ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                    }`}>
                    {statusMessage}
                </div>
            )}

            <p className="text-gray-600 mb-6">Paciente: <span className="font-semibold">{caso.pacienteNombreCompleto}</span> (NSS: {caso.pacienteNSS})</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda: Información y Comentarios */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Archivos Adjuntos */}
                    <div className={cardStyle}>
                        <h2 className={titleStyle}>Archivos Adjuntos</h2>
                        <ul className="space-y-2">
                            {caso.archivos && caso.archivos.length > 0 ? (
                                caso.archivos.map((archivo, index) => (
                                    <li key={index} className="flex items-center text-gray-700">
                                        <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                        <Link
                                            to={`/app/viewer?url=${encodeURIComponent(archivo.url)}&nss=${caso.pacienteNSS}`}
                                            target="_self"
                                            className="hover:text-blue-500 hover:underline"
                                        >
                                            {archivo.nombre}
                                        </Link>
                                    </li>
                                ))
                            ) : (
                                <p className="text-gray-500 italic">No hay archivos adjuntos.</p>
                            )}
                        </ul>
                    </div>

                    {/* Sección de Comentarios */}
                    <div className={cardStyle}>
                        <h2 className={titleStyle}>Comentarios y Discusión</h2>
                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
                            {comentarios.length > 0 ? (
                                comentarios.map((com, index) => (
                                    <div key={com.id || index} className={`p-3 rounded-lg ${com.autorId === loggedInUser.uid ? 'bg-blue-50 ml-8' : 'bg-gray-100 mr-8'}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-xs text-gray-700">{com.autorNombre} <span className="font-normal text-gray-500">({com.autorRol})</span></span>
                                            <span className="text-[10px] text-gray-400">
                                                {com.fechaCreacion?.seconds ? new Date(com.fechaCreacion.seconds * 1000).toLocaleString() : 'Recién enviado'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{com.texto}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 italic text-center py-4">No hay comentarios en este caso yet.</p>
                            )}
                        </div>

                        {isCasoAbierto && (
                            <form onSubmit={handleAddComentario} className="mt-4">
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                                    rows="3"
                                    placeholder="Escribe un comentario o nota médica..."
                                    value={nuevoComentario}
                                    onChange={(e) => setNuevoComentario(e.target.value)}
                                ></textarea>
                                <div className="flex justify-end mt-2">
                                    <button
                                        type="submit"
                                        disabled={!nuevoComentario.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                    >
                                        Enviar Comentario
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Columna Derecha: Información y Diagnóstico */}
                <div className="space-y-8">
                    <div className={cardStyle}>
                        <h2 className={titleStyle}>Médicos Involucrados</h2>
                        <div className="space-y-2">
                            <p className="text-sm"><strong className="font-medium text-gray-600">Médico General:</strong><br /> {caso.medicoGeneralNombre}</p>
                            <p className="text-sm"><strong className="font-medium text-gray-600">Médico Especialista:</strong><br /> {caso.medicoEspecialistaNombre}</p>
                        </div>
                    </div>

                    {/* Tarjeta de Información del Paciente */}
                    {paciente && (
                        <div className={cardStyle}>
                            <h2 className={titleStyle}>Información del Paciente</h2>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <p><strong className="font-medium">Sangre:</strong> {paciente.tiposangre || '?'}</p>
                                <p><strong className="font-medium">Edad:</strong> {paciente.edad || '?'} años</p>
                                <p><strong className="font-medium">Estatura:</strong> {paciente.estatura || '?'} m</p>
                                <p><strong className="font-medium">Peso:</strong> {paciente.peso || '?'} kg</p>
                                <p className="col-span-2"><strong className="font-medium">IMC:</strong> {paciente.imc || '?'}</p>
                                <p><strong className="font-medium">Diabetes:</strong> {paciente.diabetes ? 'Sí' : 'No'}</p>
                                <p><strong className="font-medium">Hipertensión:</strong> {paciente.hipertension ? 'Sí' : 'No'}</p>
                            </div>
                            <div className="mt-3 pt-3 border-t">
                                <p className="text-xs font-bold text-gray-500 uppercase">Antecedentes:</p>
                                <p className="text-sm text-gray-700">{paciente.antecedentes || 'Sin antecedentes registrados.'}</p>
                            </div>
                        </div>
                    )}

                    {/* Sección de Diagnóstico */}
                    <div className={cardStyle}>
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h2 className="text-xl font-bold text-gray-800">Diagnóstico Final</h2>
                            {isCasoAbierto && esMedicoAsignado && !isEditingDiagnosis && (
                                <button
                                    onClick={() => setIsEditingDiagnosis(true)}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center"
                                >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Editar
                                </button>
                            )}
                        </div>
                        {isCasoAbierto && esMedicoAsignado && isEditingDiagnosis ? (
                            <div className="space-y-4">
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                                    rows="6"
                                    placeholder="Ingrese el diagnóstico final aquí..."
                                    value={diagnostico}
                                    onChange={(e) => setDiagnostico(e.target.value)}
                                ></textarea>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setIsEditingDiagnosis(false);
                                            setDiagnostico(caso.diagnostico || '');
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveDiagnosis}
                                        disabled={isSavingDiagnosis}
                                        className="flex-[2] px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                                    >
                                        {isSavingDiagnosis ? 'Guardando...' : 'Guardar Diagnóstico'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[100px]">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap italic">
                                    {diagnostico || 'Aún no se ha emitido un diagnóstico final.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Acciones Adicionales */}
                    <div className={cardStyle}>
                        <h2 className={titleStyle}>Acciones</h2>
                        <div className="space-y-3">
                            <button
                                onClick={handleGenerateReport}
                                className="w-full px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-black transition"
                            >
                                Descargar Reporte PDF
                            </button>
                            {isCasoAbierto && puedeCerrarCaso && (
                                <button
                                    onClick={() => setShowConfirmModal(true)}
                                    className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                                >
                                    Cerrar Caso
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CasoDetalle;