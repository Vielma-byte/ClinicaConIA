import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Link } from 'react-router-dom';
import logo from '../assets/logo-tecnm.png';
import toast from 'react-hot-toast';

const RecuperarContrasena = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            toast.success('Correo de recuperación enviado. Revisa tu bandeja de entrada.');
            setEmail(''); // Limpiar el campo
        } catch (error) {
            console.error("Error al enviar correo de recuperación:", error);
            if (error.code === 'auth/user-not-found') {
                toast.error('No existe una cuenta con este correo electrónico.');
            } else {
                toast.error('Error al enviar el correo. Inténtalo de nuevo.');
            }
        } finally {
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
                        Enviando correo...
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
                <h3 className="text-2xl font-bold mb-6">RECUPERAR CONTRASEÑA</h3>
                <p className="mb-6 text-gray-600 text-center max-w-sm">
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col items-center w-full max-w-sm">
                    <div className="w-full mb-4">
                        <label className="block text-left font-bold text-blue-900 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                            required
                        />
                    </div>

                    <button type="submit" className="w-full p-3 bg-blue-900 text-white font-bold rounded-md hover:bg-blue-700 transition duration-200 cursor-pointer mb-4">
                        ENVIAR ENLACE
                    </button>

                    <Link to="/" className="text-blue-900 hover:underline font-semibold">
                        Volver al Inicio de Sesión
                    </Link>
                </form>
            </div>
        </div>
    );
};

export default RecuperarContrasena;
