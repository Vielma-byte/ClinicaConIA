import React, { useState } from 'react';
import apiClient from '../api/axiosConfig';

const initialUserState = {
    nombre: '',
    apellido: '',
    contrasena: '',
    email: '', // Añadimos el campo email
    rol: '', // 'medico', 'atencion', 'administrador'
};

const userRoles = [
    { value: 'medico', label: 'Médico (Especialista)' },
    { value: 'atencion', label: 'Personal de Atención' },
    { value: 'administrador', label: 'Administrador de Sistema' },
];

const AltaUsuario = () => {
    const [userData, setUserData] = useState(initialUserState);
    const [statusMessage, setStatusMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMessage('');
        setIsSubmitting(true);

        if (!userData.nombre || !userData.apellido || !userData.email || !userData.contrasena || !userData.rol) {
            setStatusMessage('⚠️ Por favor, complete todos los campos.');
            setIsSubmitting(false);
            return;
        }

        try {
            // Llama al endpoint de registro del backend usando apiClient
            const response = await apiClient.post('/users/register', userData);

            // Muestra el mensaje de éxito
            setStatusMessage(`✅ Usuario ${userData.nombre} ${userData.apellido} registrado con éxito. UID: ${response.data.uid.substring(0, 8)}...`);

            // Limpia el formulario
            setUserData(initialUserState);
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error al registrar el usuario.';
            setStatusMessage(`❌ ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyle = "w-full p-3 bg-gray-200 rounded-lg border-none focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
    const cardStyle = "p-8 bg-white rounded-xl shadow-lg border border-gray-100";
    const labelStyle = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <div className="p-8 font-sans min-h-screen bg-gray-50 flex items-start justify-center">
            <div className="w-full max-w-4xl flex flex-col md:flex-row space-y-8 md:space-y-0 md:space-x-8">

                {/* Columna de Formulario (Izquierda) */}
                <div className="w-full md:w-1/2">
                    <div className={cardStyle}>
                        <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
                            Registro de nuevo usuario
                        </h1>

                        {statusMessage && (
                            <div className={`p-3 mb-4 rounded-md font-medium ${statusMessage.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {statusMessage}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">

                            <div>
                                <label htmlFor="nombre" className={labelStyle}>Nombre</label>
                                <input
                                    type="text"
                                    id="nombre"
                                    name="nombre"
                                    value={userData.nombre}
                                    onChange={handleChange}
                                    placeholder="Nombre del usuario"
                                    className={inputStyle}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <label htmlFor="apellido" className={labelStyle}>Apellido</label>
                                <input
                                    type="text"
                                    id="apellido"
                                    name="apellido"
                                    value={userData.apellido}
                                    onChange={handleChange}
                                    placeholder="Apellido del usuario"
                                    className={inputStyle}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className={labelStyle}>Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={userData.email}
                                    onChange={handleChange}
                                    placeholder="correo@ejemplo.com"
                                    className={inputStyle}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <label htmlFor="contrasena" className={labelStyle}>Contraseña</label>
                                <input
                                    type="password"
                                    id="contrasena"
                                    name="contrasena"
                                    value={userData.contrasena}
                                    onChange={handleChange}
                                    placeholder="Contraseña temporal"
                                    className={inputStyle}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <label htmlFor="rol" className={labelStyle}>Rol o especialidad</label>
                                <select
                                    id="rol"
                                    name="rol"
                                    value={userData.rol}
                                    onChange={handleChange}
                                    className={`${inputStyle} appearance-none`}
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="" disabled>-- Seleccionar rol --</option>
                                    {userRoles.map(role => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full p-4 mt-6 text-white font-bold rounded-lg transition duration-200 shadow-md text-lg ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                                    }`}
                            >
                                {isSubmitting ? 'Registrando...' : 'Registrar nuevo usuario'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Columna de Imagen (Derecha) */}
                <div className="w-full md:w-1/2 flex items-center justify-center p-4">
                    <div className="relative w-full h-80 rounded-xl overflow-hidden shadow-2xl">
                        <img
                            src="https://placehold.co/600x400/FEE2E2/991B1B?text=Registro+de+M%C3%A9dico"
                            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/600x400/FEE2E2/991B1B?text=Registro+de+M%C3%A9dico" }}
                            alt="Médico dando de alta a un paciente"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-blue-500 opacity-20"></div>
                        <div className="absolute bottom-0 w-full p-4 bg-white bg-opacity-90 text-center">
                            <p className="text-gray-800 font-semibold">Plataforma de Alta de Personal</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AltaUsuario;
