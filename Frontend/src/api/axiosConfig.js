import axios from 'axios';
import { auth } from '../firebaseConfig';

// Crear una instancia de axios con la URL base de tu API
// Determinar la URL base. Si viene de Render (property: host), puede venir sin protocolo.
const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

    // 1. Asegurar protocolo HTTPS si falta (Render da solo el host)
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }

    // 2. Asegurar sufijo /api (Render no lo incluye automáticamente)
    if (!url.endsWith('/api')) {
        url = `${url}/api`;
        // Evitar doble slash //api si el usuario puso / al final
        url = url.replace('//api', '/api');
    }

    return url;
};

const apiClient = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    }
});

import toast from 'react-hot-toast';

// Interceptor para añadir el token de autenticación a cada solicitud
apiClient.interceptors.request.use(
    async (config) => {
        let user = auth.currentUser;

        // Si no hay usuario sincrónico, esperamos un momento por si Firebase se está inicializando
        if (!user) {
            user = await new Promise((resolve) => {
                const unsubscribe = auth.onAuthStateChanged((u) => {
                    unsubscribe();
                    resolve(u);
                });
            });
        }

        if (user) {
            try {
                const token = await user.getIdToken();
                config.headers.Authorization = `Bearer ${token}`;
            } catch (error) {
                console.error("No se pudo obtener el token de autenticación", error);
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor de respuesta para manejo global de errores
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error;

        if (response) {
            // Manejo de errores específicos según el status code
            if (response.status === 500) {
                toast.error('🔥 Error interno del servidor. Inténtalo más tarde.');
            } else if (response.status === 401) {
                toast.error('🔑 Sesión expirada. Por favor, vuelve a ingresar.');
            } else if (response.status === 403) {
                toast.error('🚫 No tienes permisos para realizar esta acción.');
            }
        } else if (error.request) {
            // La petición se hizo pero no hubo respuesta (Error de red)
            toast.error('🌐 Error de conexión. Revisa tu internet.');
        } else {
            // Error al configurar la petición
            toast.error('❌ Ocurrió un error inesperado.');
        }

        return Promise.reject(error);
    }
);

export default apiClient;
