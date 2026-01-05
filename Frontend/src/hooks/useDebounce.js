import { useState, useEffect } from 'react';

// Hook personalizado para "debouncing"
function useDebounce(value, delay) {
  // Estado para guardar el valor "debounced"
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Configura un temporizador para actualizar el valor debounced
    // después del delay especificado
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Función de limpieza: se ejecuta si el valor cambia antes de que
    // el temporizador termine. Cancela el temporizador anterior.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Solo se vuelve a ejecutar si el valor o el delay cambian

  return debouncedValue;
}

export default useDebounce;
