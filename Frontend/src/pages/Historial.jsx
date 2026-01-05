// src/pages/Historial.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Importar useMutation y useQueryClient
import apiClient from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

/**
 * Página de Historial de Casos.
 * Muestra una lista de casos clínicos filtrados por rol de usuario y estado del caso.
 */
const Historial = () => {
    const { user: loggedInUser } = useAuth();
    const [filtroEstado, setFiltroEstado] = useState('abierto');
    const queryClient = useQueryClient(); // Obtener el cliente de query

    /**
     * Función para eliminar un caso.
     */
    const deleteCaseMutation = useMutation({
        mutationFn: (caseId) => apiClient.delete(`/casos/${caseId}`),
        onSuccess: () => {
            toast.success('Caso eliminado con éxito.');
            // Invalidar la query para que se vuelva a cargar la lista de casos
            queryClient.invalidateQueries(['casos', loggedInUser?.uid, filtroEstado]);
        },
        onError: (error) => {
            toast.error(`Error al eliminar el caso: ${error.response?.data?.message || error.message}`);
        }
    });

    /**
     * Manejador para el botón de eliminar.
     * @param {Event} e - Evento del click.
     * @param {string} caseId - ID del caso a eliminar.
     */
    const handleDelete = (e, caseId) => {
        e.preventDefault(); // Prevenir la navegación del Link
        e.stopPropagation(); // Detener la propagación del evento

        // Pedir confirmación al usuario
        toast((t) => (
            <div className="flex flex-col items-center gap-4">
                <p className="text-center font-semibold">¿Seguro que quieres eliminar este caso?</p>
                <div className='flex gap-2'>
                    <button
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                        onClick={() => {
                            deleteCaseMutation.mutate(caseId);
                            toast.dismiss(t.id);
                        }}
                    >
                        Eliminar
                    </button>
                    <button
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                        onClick={() => toast.dismiss(t.id)}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        ), {
            duration: 6000,
        });
    };

    /**
     * Función de obtención de datos para React Query.
     * @returns {Promise<Array>} Lista de casos
     */
    const fetchCasos = async () => {
        if (!loggedInUser) return [];

        const params = {
            estado: filtroEstado,
        };

        const response = await apiClient.get('/casos', { params });
        return response.data;
    };

    // Configuración de React Query
    const { data: casos = [], isLoading, isError, error } = useQuery({
        queryKey: ['casos', loggedInUser?.uid, filtroEstado],
        queryFn: fetchCasos,
        enabled: !!loggedInUser,
        refetchInterval: 30000,
        staleTime: 10000,
    });

    if (isError && !toast.isActive('error-toast')) {
        toast.error(`Error al cargar casos: ${error.response?.data?.message || error.message}`, { id: 'error-toast' });
    }

    // Estilos estandarizados
    const cardStyle = "bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer";
    const badgeStyle = (estado) => `px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${estado === 'abierto' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`;
    const filterBtnStyle = (isActive) => `px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`;
        
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Historial de Casos</h1>
                    <p className="text-gray-500 mt-1">
                        {
                            loggedInUser && {
                                'atencion': 'Casos creados y gestionados por ti.',
                                'medico': `Casos asignados a Dr. ${loggedInUser?.nombre} ${loggedInUser?.apellido}.`,
                                'administrador': 'Vista global de todos los casos del sistema.'
                            }[loggedInUser.rol]
                        }
                    </p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setFiltroEstado('abierto')} className={filterBtnStyle(filtroEstado === 'abierto')}>Abiertos</button>
                    <button onClick={() => setFiltroEstado('cerrado')} className={filterBtnStyle(filtroEstado === 'cerrado')}>Cerrados</button>
                    <button onClick={() => setFiltroEstado('todos')} className={filterBtnStyle(filtroEstado === 'todos')}>Todos</button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col justify-center items-center py-20 text-gray-400">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p>Cargando casos...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {casos.length > 0 ? (
                        casos.map((caso) => (
                            <div key={caso.id} className="relative group">
                                <Link
                                    to={`/app/casos/${caso.id}`}
                                    className={`${cardStyle} ${caso.estado === 'cerrado' ? 'opacity-75 hover:opacity-100' : ''}`}
                                >
                                    <div className="flex items-start space-x-4">
                                        <div className={`p-3 rounded-lg ${caso.estado === 'abierto' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{caso.pacienteNombreCompleto}</h3>
                                            <div className="text-sm text-gray-500 mt-1 space-y-1">
                                                <p className="flex items-center"><span className="font-medium mr-2">NSS:</span> {caso.pacienteNSS}</p>
                                                <p className="flex items-center"><span className="font-medium mr-2">Especialista:</span> {caso.medicoEspecialistaNombre}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 md:mt-0 flex flex-col items-end space-y-2">
                                        <span className={badgeStyle(caso.estado)}>
                                            {caso.estado}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            Actualizado: {new Date(caso.fechaCreacion).toLocaleDateString()}
                                        </span>
                                    </div>
                                </Link>
                                {caso.estado === 'cerrado' && (
                                    <button
                                        onClick={(e) => handleDelete(e, caso.id)}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                                        title="Eliminar caso"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            <p className="mt-2 text-gray-500 font-medium">No hay casos para mostrar en esta categoría.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Historial;