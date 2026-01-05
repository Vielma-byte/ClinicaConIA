import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Actualiza el estado para que el siguiente renderizado muestre la interfaz de repuesto.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // También puedes registrar el error en un servicio de reporte de errores como Sentry
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Puedes renderizar cualquier interfaz de repuesto personalizada
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6 text-center">
                    <div className="bg-red-600 w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold mb-4">¡Ups! Algo salió mal.</h1>
                    <p className="text-gray-400 max-w-md mb-8">
                        La aplicación ha encontrado un error inesperado. Por favor, intenta recargar la página o contacta a soporte si el problema persiste.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200 shadow-md"
                    >
                        Recargar Aplicación
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-10 p-4 bg-gray-800 rounded-lg text-left overflow-auto max-w-2xl border border-gray-700">
                            <p className="text-red-400 font-mono text-sm">{this.state.error && this.state.error.toString()}</p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
