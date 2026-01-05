import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import useDebounce from '../hooks/useDebounce';

const API_URL = 'http://localhost:3001/api';

const ConfirmationModal = ({ paciente, onConfirm, onCancel }) => {
    const [confirmNSS, setConfirmNSS] = useState('');
    const isMatch = confirmNSS === paciente.nss;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-md shadow-lg rounded-xl bg-white">
                <h3 className="text-2xl font-bold text-red-700">Confirmación de Eliminación</h3>
                <div className="mt-4 space-y-4 text-gray-700">
                    <p>Estás a punto de eliminar permanentemente al paciente:</p>
                    <p className="font-semibold text-lg">{paciente.nombre} {paciente.apellidoP} (NSS: {paciente.nss})</p>
                    <p className="font-bold text-red-600">¡Esta acción es irreversible!</p>
                    <p>Se borrarán todos los datos del paciente, incluyendo su historial de casos clínicos y todos los archivos de imagen asociados.</p>
                    <hr/>
                    <label htmlFor="confirmNSS" className="font-semibold">Para confirmar, por favor escribe el NSS del paciente:</label>
                    <input
                        id="confirmNSS"
                        type="text"
                        value={confirmNSS}
                        onChange={(e) => setConfirmNSS(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder={paciente.nss}
                    />
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!isMatch}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                    >
                        Eliminar Definitivamente
                    </button>
                </div>
            </div>
        </div>
    );
};

const GestionPacientes = () => {
    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pacienteToDelete, setPacienteToDelete] = useState(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // La función ahora puede recibir un término de búsqueda
    const fetchPacientes = async (searchQuery = '') => {
        setLoading(true);
        const requestUrl = `${API_URL}/pacientes/search?q=${searchQuery}`;

        try {
            const response = await axios.get(requestUrl);
            setPacientes(response.data);
            setError('');
        } catch (err) {
            setError('No se pudieron cargar los pacientes.');
            setPacientes([]); // En caso de error, vaciamos la lista para evitar mostrar datos viejos
        } finally {
            setLoading(false);
        }
    };

    // Este efecto se ejecuta cuando el término de búsqueda (con debounce) cambia
    // y también en la carga inicial.
    useEffect(() => {
        fetchPacientes(debouncedSearchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchTerm]); // La dependencia es correcta, deshabilitamos el lint para esta línea.


    const handleDelete = async () => {
        if (!pacienteToDelete) return;

        try {
            setStatusMessage(`⏳ Eliminando a ${pacienteToDelete.nombre}...`);
            await axios.delete(`${API_URL}/pacientes/${pacienteToDelete.nss}`);
            setStatusMessage(`✅ Paciente ${pacienteToDelete.nombre} y todos sus datos han sido eliminados.`);
            setPacienteToDelete(null);
            fetchPacientes(searchTerm); // Recargar la lista de pacientes manteniendo el filtro actual
        } catch (err) {
            setStatusMessage(`❌ Error al eliminar al paciente: ${err.response?.data?.message || err.message}`);
            console.error(err);
            setPacienteToDelete(null);
        }
    };

    if (loading) return <div className="p-8">Cargando pacientes...</div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;

    return (
        <div className="p-8">
            {pacienteToDelete && (
                <ConfirmationModal
                    paciente={pacienteToDelete}
                    onConfirm={handleDelete}
                    onCancel={() => setPacienteToDelete(null)}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Pacientes</h1>
                <Link to="/app/alta-paciente" className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition">
                    + Registrar Nuevo Paciente
                </Link>
            </div>

            {statusMessage && (
                <div className={`p-4 mb-6 rounded-md font-medium ${statusMessage.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {statusMessage}
                </div>
            )}

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Buscar por nombre, apellido o NSS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Completo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NSS</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edad</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {pacientes.map((paciente) => (
                            <tr key={paciente.nss} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{paciente.nombre} {paciente.apellidoP} {paciente.apellidoM}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{paciente.nss}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{paciente.edad}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <Link to={`/app/alta-paciente/${paciente.nss}`} className="text-blue-600 hover:text-blue-900">Editar</Link>
                                    <button onClick={() => setPacienteToDelete(paciente)} className="text-red-600 hover:text-red-900">
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {pacientes.length === 0 && !loading && (
                    <p className="text-center py-8 text-gray-500">No se encontraron pacientes.</p>
                )}
            </div>
        </div>
    );
};

export default GestionPacientes;