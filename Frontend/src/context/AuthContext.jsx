import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import apiClient from '../api/axiosConfig';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log("AuthContext: onAuthStateChanged triggered", firebaseUser ? "User logged in" : "User logged out");
            if (firebaseUser) {
                try {
                    // Obtener datos adicionales del backend usando apiClient
                    // apiClient ya tiene la baseURL y el token (si es posible obtenerlo sincrónicamente o esperando)
                    // NOTA: Para la primera carga, el interceptor maneja la espera del token.
                    const response = await apiClient.get(`/users/${firebaseUser.uid}`);
                    const appUser = response.data;
                    setUser({ ...firebaseUser, ...appUser });
                } catch (error) {
                    console.error("Error al recuperar datos del usuario:", error);
                    // Si falla la obtención de datos del usuario, ¿deberíamos desconectarlo? 
                    // Depende de la severidad. Por ahora, mantenemos null para evitar inconsistencias.
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const logout = async () => {
        console.log("AuthContext: logout called");
        try {
            await signOut(auth);
            console.log("AuthContext: signOut successful");
        } catch (error) {
            console.error("AuthContext: signOut error", error);
        } finally {
            // Asegurar que el usuario local se limpie independientemente del resultado de Firebase
            setUser(null);
            console.log("AuthContext: Local user state cleared");
        }
    };

    const value = {
        user,
        loading,
        logout,
        isAuthenticated: !!user,
        userRole: user?.rol
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
