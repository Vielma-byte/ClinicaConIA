import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false, // No recargar al cambiar de ventana
            retry: 1, // Reintentar solo 1 vez si falla
            staleTime: 1000 * 60 * 5, // Los datos se consideran frescos por 5 minutos
        },
    },
});

export default queryClient;
