// src/pages/AltaPaciente.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

// Estructura inicial del paciente 
const initialPacienteState = {
    nombre: '',
    apellidoP: '',
    apellidoM: '',
    nss: '',
    tiposangre: '',
    estatura: 0.0,
    peso: 0.0,
    imc: 0.0, // Se calcula después
    edad: 0,
    diabetes: false,
    hipertension: false,
    enfcronica: false,
    antecedentes: '',
    sintomascla: '',
    medicamentos: '',
};

const AltaPaciente = ({ loggedInUser }) => {
    const { nss } = useParams(); // Obtenemos el NSS de la URL si existe
    const isEditMode = !!nss; // Si hay NSS, estamos editando

    const [pacienteData, setPacienteData] = useState(initialPacienteState);
    const [errors, setErrors] = useState({});
    const [statusMessage, setStatusMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Lógica de solo lectura: si es médico especialista y está en modo edición.
    const isReadOnly = loggedInUser?.rol === 'medico' && isEditMode;

    // Cargar datos si estamos en modo edición
    useEffect(() => {
        const fetchPaciente = async () => {
            if (isEditMode) {
                try {
                    const response = await apiClient.get(`/pacientes/${nss}`);
                    setPacienteData(response.data);
                    // Solo mostrar el mensaje de "Editando" si no estamos en modo de solo lectura.
                    if (!isReadOnly) {
                        setStatusMessage(`📝 Editando registro de ${response.data.nombre}.`);
                    }
                } catch (error) {
                    console.error("Error al cargar paciente:", error);
                    setStatusMessage('❌ No se pudieron cargar los datos del paciente.');
                }
            } else {
                // Si no hay nss, asegura que el formulario esté vacío para un nuevo registro
                setPacienteData(initialPacienteState);
                setStatusMessage('');
                setErrors({});
            }
        };
        fetchPaciente();
    }, [nss, isEditMode, isReadOnly]);

    // Función para validar campos individuales
    const validateField = (name, value) => {
        let error = null;
        if (name === 'estatura') {
            const val = parseFloat(value);
            if (isNaN(val) || val < 0.4 || val > 2.5) error = 'La estatura debe estar entre 0.40 y 2.50 metros.';
        } else if (name === 'peso') {
            const val = parseFloat(value);
            if (isNaN(val) || val < 1 || val > 400) error = 'El peso debe estar entre 1 y 400 kg.';
        } else if (name === 'edad') {
            const val = parseInt(value);
            if (isNaN(val) || val < 0 || val > 120) error = 'La edad debe estar entre 0 y 120 años.';
        }

        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        setPacienteData(prev => {
            const updated = { ...prev, [name]: val };

            // Recalcular IMC si cambia peso o estatura
            if ((name === 'peso' || name === 'estatura') && updated.estatura > 0) {
                const p = parseFloat(name === 'peso' ? val : prev.peso);
                const e = parseFloat(name === 'estatura' ? val : prev.estatura);
                if (p > 0 && e > 0) {
                    updated.imc = (p / (e * e)).toFixed(1);
                } else {
                    updated.imc = 0.0;
                }
            }
            return updated;
        });

        // Validar el campo que acaba de cambiar
        if (type === 'number') {
            validateField(name, value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMessage('');
        setIsSubmitting(true);

        // Validación final antes de enviar
        const finalErrors = {};
        Object.keys(pacienteData).forEach(key => {
            const error = validateField(key, pacienteData[key]);
            if (error) finalErrors[key] = error;
        });

        if (Object.values(errors).some(error => error !== null) || Object.keys(finalErrors).length > 0) {
            setStatusMessage('⚠️ Por favor, corrija los errores marcados en el formulario.');
            setIsSubmitting(false);
            return;
        }

        if (!pacienteData.nombre || !pacienteData.nss) {
            setStatusMessage('⚠️ Por favor, complete al menos Nombre y NSS.');
            setIsSubmitting(false);
            return;
        }

        try {
            // Llamada a la API para guardar o actualizar usando apiClient
            await apiClient.post('/pacientes', pacienteData);

            const successMessage = isEditMode
                ? `✅ Paciente ${pacienteData.nombre} actualizado con éxito.`
                : `✅ Nuevo paciente ${pacienteData.nombre} registrado con éxito.`;

            setStatusMessage(successMessage);
            if (!isEditMode) {
                setPacienteData(initialPacienteState); // Limpiar formulario solo en modo creación
            }
        } catch (error) {
            setStatusMessage(`❌ Error al guardar el paciente: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Función helper simplificada para actualizar estilo de inputs deshabilitados
    const inputStyle = (hasError) => `w-full p-3 mb-1 bg-gray-200 rounded-lg border ${hasError ? 'border-red-500' : 'border-transparent'} focus:ring-2 ${hasError ? 'focus:ring-red-500' : 'focus:ring-blue-500'} focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`;
    const cardStyle = "p-6 bg-gray-100 rounded-xl shadow-md";
    const titleStyle = "text-xl font-semibold mb-4 text-gray-800";
    const labelStyle = "block text-sm font-medium text-gray-700 mb-1";


    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">
                {isReadOnly
                    ? 'Expediente del Paciente (Solo Lectura)'
                    : isEditMode ? 'Editar Paciente' : 'Alta de Paciente'}
            </h1>

            {statusMessage && (
                <div className={`p-4 mb-6 rounded-md font-medium ${statusMessage.startsWith('✅') ? 'bg-green-100 text-green-700' :
                    statusMessage.startsWith('⚠️') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-700'
                    }`}>
                    {statusMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex space-x-8">

                {/* COLUMNA IZQUIERDA: Datos Personales (50% de ancho) */}
                <div className="w-1/2 space-y-6">

                    {/* Tarjeta 1: Información Básica */}
                    <div className={cardStyle}>
                        <h2 className={titleStyle}>Información Personal</h2>
                        <div className="mb-3">
                            <label className={labelStyle}>Nombre</label>
                            <input type="text" name="nombre" placeholder="Nombre" value={pacienteData.nombre} onChange={handleChange} className={inputStyle(errors.nombre)} required disabled={isReadOnly || isSubmitting} />
                        </div>
                        <div className="mb-3">
                            <label className={labelStyle}>Apellido Paterno</label>
                            <input type="text" name="apellidoP" placeholder="Apellido Paterno" value={pacienteData.apellidoP} onChange={handleChange} className={inputStyle(errors.apellidoP)} required disabled={isReadOnly || isSubmitting} />
                        </div>
                        <div className="mb-3">
                            <label className={labelStyle}>Apellido Materno</label>
                            <input type="text" name="apellidoM" placeholder="Apellido Materno" value={pacienteData.apellidoM} onChange={handleChange} className={inputStyle(errors.apellidoM)} disabled={isReadOnly || isSubmitting} />
                        </div>
                        <div className="mb-3">
                            <label className={labelStyle}>NSS (Número de Seguridad Social)</label>
                            <input type="text" name="nss" placeholder="NSS" value={pacienteData.nss} onChange={handleChange} className={inputStyle(errors.nss)} required disabled={isReadOnly || isSubmitting} />
                        </div>
                    </div>

                    {/* Tarjeta 2: Info Médica Básica */}
                    <div className={cardStyle}>
                        <h2 className={titleStyle}>Info Médica Básica</h2>

                        <div className="mb-4">
                            <label className={labelStyle}>Tipo de Sangre</label>
                            <select name="tiposangre" value={pacienteData.tiposangre} onChange={handleChange} className={inputStyle(errors.tiposangre)} disabled={isReadOnly || isSubmitting}>
                                <option value="">Seleccionar tipo</option>
                                <option value="A+">A+</option>
                                <option value="O-">O-</option>
                                <option value="A-">A-</option>
                                <option value="O+">O+</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                            </select>
                        </div>

                        {/* Campo de Edad con unidad visible */}
                        <div className="mb-4">
                            <label htmlFor="edad" className={labelStyle}>Edad</label>
                            <div className={`flex items-center bg-gray-200 rounded-lg focus-within:ring-2 ${errors.edad ? 'ring-2 ring-red-500' : 'focus-within:ring-blue-500'}`}>
                                <input id="edad" type="number" name="edad" placeholder="0" value={pacienteData.edad} onChange={handleChange} className="w-full p-3 bg-transparent border-none focus:outline-none disabled:bg-gray-200" required disabled={isReadOnly || isSubmitting} />
                                <span className="pr-3 text-gray-500">años</span>
                            </div>
                            {errors.edad && <p className="text-red-500 text-xs mt-1">{errors.edad}</p>}
                        </div>

                        {/* Campo de Estatura con unidad visible */}
                        <div className="mb-4">
                            <label htmlFor="estatura" className={labelStyle}>Estatura</label>
                            <div className={`flex items-center bg-gray-200 rounded-lg focus-within:ring-2 ${errors.estatura ? 'ring-2 ring-red-500' : 'focus-within:ring-blue-500'}`}>
                                <input id="estatura" type="number" name="estatura" placeholder="0.00" value={pacienteData.estatura} onChange={handleChange} className="w-full p-3 bg-transparent border-none focus:outline-none disabled:bg-gray-200" step="0.01" required disabled={isReadOnly || isSubmitting} />
                                <span className="pr-3 text-gray-500">m</span>
                            </div>
                            {errors.estatura && <p className="text-red-500 text-xs mt-1">{errors.estatura}</p>}
                        </div>

                        {/* Campo de Peso con unidad visible */}
                        <div className="mb-4">
                            <label htmlFor="peso" className={labelStyle}>Peso</label>
                            <div className={`flex items-center bg-gray-200 rounded-lg focus-within:ring-2 ${errors.peso ? 'ring-2 ring-red-500' : 'focus-within:ring-blue-500'}`}>
                                <input id="peso" type="number" name="peso" placeholder="0.0" value={pacienteData.peso} onChange={handleChange} className="w-full p-3 bg-transparent border-none focus:outline-none disabled:bg-gray-200" step="0.1" required disabled={isReadOnly || isSubmitting} />
                                <span className="pr-3 text-gray-500">kg</span>
                            </div>
                            {errors.peso && <p className="text-red-500 text-xs mt-1">{errors.peso}</p>}
                        </div>

                        <div className={`p-3 rounded-lg font-semibold text-center ${(pacienteData.imc < 18.5 || pacienteData.imc > 30) && pacienteData.imc > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                            }`}>
                            IMC Calculado: {pacienteData.imc}
                        </div>
                    </div>

                    {/* Botón de Registro */}
                    <button
                        type="submit"
                        className={`w-full p-4  text-white font-bold rounded-lg transition duration-200 shadow-md ${(isReadOnly || isSubmitting) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                        disabled={isReadOnly || isSubmitting}
                    >
                        {isReadOnly ? 'Solo Lectura' :
                            isSubmitting ? 'Guardando...' :
                                isEditMode ? 'Actualizar Paciente' : 'Registrar Paciente'}
                    </button>
                </div>

                {/* COLUMNA DERECHA: Padecimientos y Historial (50% de ancho) */}
                <div className="w-1/2 space-y-6">

                    {/* Tarjeta 3: Enfermedades y Condiciones */}
                    <div className={cardStyle}>
                        <h2 className={titleStyle}>Enfermedades y Condiciones</h2>

                        {/* Checkbox para Diabetes */}
                        <label className="flex items-center space-x-2 mb-3 cursor-pointer">
                            <input type="checkbox" name="diabetes" checked={pacienteData.diabetes} onChange={handleChange} className="form-checkbox h-5 w-5 text-blue-500 rounded disabled:opacity-70" disabled={isReadOnly || isSubmitting} />
                            <span className="text-gray-700">Diabetes</span>
                        </label>

                        {/* Checkbox para Hipertensión */}
                        <label className="flex items-center space-x-2 mb-3 cursor-pointer">
                            <input type="checkbox" name="hipertension" checked={pacienteData.hipertension} onChange={handleChange} className="form-checkbox h-5 w-5 text-blue-500 rounded disabled:opacity-70" disabled={isReadOnly || isSubmitting} />
                            <span className="text-gray-700">Hipertensión</span>
                        </label>

                        {/* Checkbox para Enfermedad Crónica Conocida */}
                        <label className="flex items-center space-x-2 mb-3 cursor-pointer">
                            <input type="checkbox" name="enfcronica" checked={pacienteData.enfcronica} onChange={handleChange} className="form-checkbox h-5 w-5 text-blue-500 rounded disabled:opacity-70" disabled={isReadOnly || isSubmitting} />
                            <span className="text-gray-700">Enfermedad Crónica Conocida</span>
                        </label>

                    </div>

                    {/* Tarjeta 4: Historial Clínico (Textareas) */}
                    <div className={cardStyle}>
                        <h2 className={titleStyle}>Historial Clínico</h2>

                        <div className="mb-4">
                            <label htmlFor="antecedentes" className={labelStyle}>Antecedentes Familiares/Personales</label>
                            <textarea id="antecedentes" name="antecedentes" placeholder="Ej: Padre con hipertensión..." value={pacienteData.antecedentes} onChange={handleChange} className={inputStyle(errors.antecedentes)} rows="3" disabled={isReadOnly || isSubmitting} />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="sintomascla" className={labelStyle}>Síntomas Clave</label>
                            <textarea id="sintomascla" name="sintomascla" placeholder="Ej: Dolor torácico persistente..." value={pacienteData.sintomascla} onChange={handleChange} className={inputStyle(errors.sintomascla)} rows="3" disabled={isReadOnly || isSubmitting} />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="medicamentos" className={labelStyle}>Medicamentos Actuales</label>
                            <textarea id="medicamentos" name="medicamentos" placeholder="Ej: Metformina 500mg/día..." value={pacienteData.medicamentos} onChange={handleChange} className={inputStyle(errors.medicamentos)} rows="3" disabled={isReadOnly || isSubmitting} />
                        </div>
                    </div>

                </div>
            </form>
        </div>
    );
};

export default AltaPaciente;