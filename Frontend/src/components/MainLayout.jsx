import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import logo from '../assets/logo-tecnm.png';
import NotificationBox from './NotificationBox';
import { useAuth } from '../context/AuthContext';

// Iconos para la barra lateral
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const UserPlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>;
const PatientPlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 003 15" /></svg>;
const PatientListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.28-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-.1.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const FileUploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H13a4 4 0 014 4v1.586a1 1 0 01-.293.707l-1.414 1.414a1 1 0 00-.293.707V16a4 4 0 01-4 4H7z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

const MainLayout = ({ userRole, onLogout }) => {
    const { user } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const navigate = useNavigate();
    const linkStyle = "flex items-center p-3 my-1 text-gray-700 rounded-lg hover:bg-blue-100 transition-colors duration-200";
    const activeLinkStyle = "bg-blue-900 text-white shadow-md";

    const handleLogout = () => {
        setIsLoggingOut(true);
        setTimeout(async () => {
            await onLogout();
            navigate('/', { replace: true });
        }, 2000); // Esperar 2 segundos antes de cerrar sesión real
    };

    return (
        <div className="flex h-screen bg-gray-50 relative">
            {/* Overlay de Cierre de Sesión */}
            {isLoggingOut && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex flex-col justify-center items-center z-50 transition-opacity duration-300">
                    <div className="flex items-center justify-center space-x-2">
                        <div
                            className="w-12 h-12 rounded-full animate-spin border-4 border-solid border-white border-t-transparent"
                            style={{ borderTopColor: 'transparent' }}
                        ></div>
                    </div>
                    <p className="text-white text-xl font-semibold mt-4 animate-pulse">
                        Cerrando sesión...
                    </p>
                </div>
            )}

            {/* Barra Lateral */}
            <aside className="w-64 bg-white shadow-lg flex flex-col">
                <div className="p-4 border-b flex flex-col items-center">
                    <img src={logo} alt="Logo" className="w-32 mx-auto" />
                    <p className="text-center text-sm text-gray-500 mt-2 capitalize">Rol: {userRole}</p>
                    <div className="mt-4 w-full flex justify-center">
                        <NotificationBox userId={user?.uid} />
                    </div>
                </div>

                <nav className="flex-grow p-4">
                    <NavLink
                        to="/app/historial"
                        className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : ''}`}
                    >
                        <HomeIcon />
                        <span className="ml-3 font-medium">Historial</span>
                    </NavLink>

                    {/* Enlace condicional para Administradores */}
                    {userRole === 'administrador' && (
                        <NavLink
                            to="/app/alta-usuario"
                            className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : ''}`}
                        >
                            <UserPlusIcon />
                            <span className="ml-3 font-medium">Alta de Usuario</span>
                        </NavLink>
                    )}

                    {/* Enlaces para Personal de Atención */}
                    {userRole === 'atencion' && (
                        <>
                            <NavLink
                                to="/app/gestion-pacientes"
                                className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : ''}`}
                            >
                                <PatientListIcon />
                                <span className="ml-3 font-medium">Gestión de Pacientes</span>
                            </NavLink>
                            <NavLink
                                to="/app/envio-archivos"
                                className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : ''}`}
                            >
                                <FileUploadIcon />
                                <span className="ml-3 font-medium">Envío de Archivos</span>
                            </NavLink>
                        </>
                    )}
                </nav>

                {/* Botón de Cerrar Sesión */}
                <div className="p-4 border-t">
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center p-3 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <LogoutIcon />
                        <span className="ml-3 font-bold">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Contenido Principal */}
            <main className="flex-1 p-4 overflow-y-auto">
                <Outlet /> {/* Aquí se renderizarán las rutas anidadas */}
            </main>
        </div>
    );
};

export default MainLayout;