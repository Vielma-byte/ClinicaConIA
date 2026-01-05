import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Link } from 'react-router-dom';
import logo from '../assets/logo-tecnm.png';
import toast from 'react-hot-toast';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        contraseña: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const { email, contraseña } = formData;

        try {
            // 1. Autenticar con Firebase
            await signInWithEmailAndPassword(auth, email, contraseña);
            // El AuthContext detectará el cambio y App.jsx redirigirá automáticamente
            toast.success('¡Bienvenido!');
        } catch (error) {
            console.error("Error de login:", error);
            toast.error('Email o contraseña incorrectos.');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-screen border border-black">
            {/* Pantalla de Carga (Overlay) */}
            {isLoading && (
                <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col justify-center items-center z-50">
                    <div className="flex items-center justify-center space-x-2">
                        <div
                            className="w-12 h-12 rounded-full animate-spin border-4 border-solid border-white border-t-transparent"
                            style={{ borderTopColor: 'transparent' }}
                        ></div>
                    </div>
                    <p className="text-white text-xl font-semibold mt-4">
                        Iniciando sesión...
                    </p>
                </div>
            )}

            {/* PANEL IZQUIERDO */}
            <div className="w-1/2 flex flex-col justify-center items-center p-5  bg-gray-50 border-l ">
                <img src={logo} alt="Tecnológico Nacional de México Logo" className="max-w-xs mb-8" />
                <h2 className="text-xl font-semibold text-gray-800">TECNOLÓGICO NACIONAL DE MÉXICO</h2>
                <h2 className="text-xl font-semibold text-gray-800">SISTEMA DE RADIODIASGNOSTICO</h2>
            </div>

            {/* PANEL DERECHO */}
            <div className="w-1/2 flex flex-col justify-center items-center bg-gray-50 border-l border-black">
                <h3 className="text-2xl font-bold mb-6">INICIO DE SESIÓN</h3>

                <form onSubmit={handleLogin} className="flex flex-col items-center w-full max-w-sm">
                    <div className="w-full mb-4">
                        <label className="block text-left font-bold text-blue-900 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                            required
                        />
                    </div>
                    <div className="w-full mb-4">
                        <label className="block text-left font-bold text-blue-900 uppercase mb-1">Contraseña</label>
                        <input
                            type="password"
                            name="contraseña"
                            value={formData.contraseña}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                            required
                        />
                    </div>

                    <div className="w-full mb-6 text-right">
                        <Link to="/recuperar-contrasena" className="text-sm text-blue-900 hover:underline">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    <button type="submit" className="w-full p-3 bg-blue-900 text-white font-bold rounded-md hover:bg-blue-700 transition duration-200 cursor-pointer">
                        INICIAR SESIÓN
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;