import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../api/axiosConfig';
import { storage } from '../firebaseConfig';
import useDebounce from '../hooks/useDebounce.js'; // CORRECCIÓN: Usar ruta absoluta desde la raíz del proyecto
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const initialEnvioState = {
    pacienteSeleccionado: null, // Estado unificado para el paciente
    motivoConsulta: '',
    archivosDICOM: [],
    medicoDestinoId: '',
    medicoDestinoNombre: '',
};



const EnvioArchivos = ({ loggedInUser }) => {
    const [envioData, setEnvioData] = useState({ ...initialEnvioState, nssBusqueda: '' });
    const [doctors, setDoctors] = useState([]);
    const [statusMessage, setStatusMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false); // Nuevo estado para el foco
    const fileInputRef = useRef(null); // 1. Creamos una referencia para el input de archivos

    // Usamos el hook useDebounce para el término de búsqueda
    const debouncedSearchTerm = useDebounce(envioData.nssBusqueda, 300);

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const response = await apiClient.get('/users/doctors');
                setDoctors(response.data);
            } catch (error) {
                setStatusMessage('❌ Error al cargar los médicos especialistas.');
            }
        };
        fetchDoctors();
    }, []);

    // useEffect que reacciona al valor "debounced"
    useEffect(() => {
        // CORRECCIÓN: Simplificamos la lógica. Si no hay término de búsqueda, simplemente limpiamos los resultados.
        if (!debouncedSearchTerm) {
            setSearchResults([]);
            return;
        }

        const searchPaciente = async () => {
            setIsSearching(true);
            try {
                const response = await apiClient.get('/pacientes/search', { params: { q: debouncedSearchTerm } });
                setSearchResults(response.data);
            } catch (error) {
                console.error("Error en la búsqueda de pacientes:", error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        searchPaciente();
    }, [debouncedSearchTerm]); // Se ejecuta solo cuando el valor "debounced" cambia

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'medicoDestinoId') {
            const selectedDoctor = doctors.find(doc => doc.id === value); // Encuentra el médico seleccionado
            setEnvioData(prev => ({
                ...prev,
                medicoDestinoId: value,
                medicoDestinoNombre: selectedDoctor ? `${selectedDoctor.nombre} ${selectedDoctor.apellido}` : '', // Guarda nombre y apellido
            }));
        } else if (name === 'nssBusqueda') {
            setEnvioData(prev => ({ ...prev, nssBusqueda: value, pacienteSeleccionado: null })); // Solo actualiza el estado, el useEffect hará la búsqueda
        } else {
            setEnvioData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Al seleccionar un paciente de la lista, se cargan sus datos completos.
    const handleSelectPaciente = async (paciente) => {
        // CORRECCIÓN: Limpiamos el término de búsqueda para que el `useEffect` oculte la lista.
        // El NSS del paciente seleccionado ya se cargará con `handleSearchClick`.
        setEnvioData(prev => ({ ...prev, nssBusqueda: '' }));
        setSearchResults([]); // Oculta la lista de resultados
        await handleSearchClick(paciente.nss); // Llama a la función que busca y carga los datos
    };

    // El botón "Buscar" es el que carga los datos del paciente.
    const handleSearchClick = async (nssToSearch) => {
        setStatusMessage('');
        const nss = nssToSearch || envioData.nssBusqueda;
        if (!nss) {
            setStatusMessage('⚠️ Ingrese un NSS para buscar.');
            return;
        }

        try {
            const response = await apiClient.get(`/pacientes/${nss}`);
            // CORRECCIÓN: Al cargar el paciente, también actualizamos el input `nssBusqueda` para que muestre el NSS completo.
            setEnvioData(prev => ({ ...prev, pacienteSeleccionado: response.data, nssBusqueda: response.data.nss }));
            setStatusMessage(`✅ Paciente ${response.data.nombre} cargado.`);
        } catch (error) {
            setEnvioData(prev => ({ ...prev, pacienteSeleccionado: null }));
            setStatusMessage(`❌ Paciente con NSS ${nss} no encontrado.`);
        }
    };

    const handleSearchBlur = () => {
        // Añadimos un pequeño retardo para permitir que el evento de clic en un resultado se registre
        // antes de que la lista de resultados desaparezca.
        setTimeout(() => {
            setIsSearchFocused(false);
        }, 200);
    };

    const handleFileChange = (e) => {
        const files = e.target.files;

        const filesArray = Array.from(files).map(file => ({
            fileObject: file,
            name: file.name,
            size: file.size,
            type: file.type,
            // Solo crear URL de previsualización para imágenes no-DICOM
            url: file.name.toLowerCase().endsWith('.dcm') ? null : URL.createObjectURL(file)
        }));

        setEnvioData(prev => ({
            ...prev,
            archivosDICOM: filesArray
        }));

        setStatusMessage(`📂 ${filesArray.length} archivos listos para enviar.`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!envioData.pacienteSeleccionado || !envioData.medicoDestinoId || !envioData.motivoConsulta) {
            setStatusMessage('⚠️ Complete todos los campos requeridos (Paciente, Motivo y Médico).');
            return;
        }

        if (envioData.archivosDICOM.length === 0) {
            setStatusMessage('⚠️ Debe cargar al menos un archivo.');
            return;
        }

        setIsUploading(true);
        setStatusMessage('⏳ Subiendo archivos, por favor espera...');

        try {
            // Subir archivos a Firebase Storage
            const uploadPromises = envioData.archivosDICOM.map(async (fileWrapper) => {
                const file = fileWrapper.fileObject;

                const originalExtension = file.name.slice(file.name.lastIndexOf('.'));
                const patientName = `${envioData.pacienteSeleccionado.nombre} ${envioData.pacienteSeleccionado.apellidoP}`.replace(/\s+/g, '_');
                const uploadDate = new Date().toISOString().slice(0, 10).split('-').reverse().join('-');
                const newFileName = `${patientName}-${envioData.pacienteSeleccionado.nss}-${uploadDate}${originalExtension}`;

                const filePath = `casos/${loggedInUser.uid}/${envioData.pacienteSeleccionado.nss}/${newFileName}`;
                const fileRef = ref(storage, filePath);

                const metadata = {
                    contentType: file.type || 'application/octet-stream',
                    customMetadata: {
                        originalName: file.name,
                        uploadedBy: loggedInUser.uid,
                        pacienteNSS: envioData.pacienteSeleccionado.nss
                    }
                };

                const snapshot = await uploadBytes(fileRef, file, metadata);
                const downloadURL = await getDownloadURL(fileRef);

                return {
                    nombre: newFileName,
                    url: downloadURL,
                    size: file.size,
                    type: file.type || 'application/octet-stream',
                    uploadPath: filePath
                };
            });

            const archivosParaGuardar = await Promise.all(uploadPromises);

            setIsUploading(false);
            setStatusMessage('✅ Archivos subidos. Guardando caso...');

            const nuevoCaso = {
                pacienteNSS: envioData.pacienteSeleccionado.nss,
                pacienteNombreCompleto: `${envioData.pacienteSeleccionado.nombre} ${envioData.pacienteSeleccionado.apellidoP}`,
                motivoConsulta: envioData.motivoConsulta,
                archivos: archivosParaGuardar,
                medicoEspecialistaId: envioData.medicoDestinoId,
                medicoEspecialistaNombre: envioData.medicoDestinoNombre,
                medicoGeneralId: loggedInUser.uid,
                medicoGeneralNombre: `${loggedInUser.nombre} ${loggedInUser.apellido}`,
            };

            await apiClient.post('/casos', nuevoCaso);

            envioData.archivosDICOM.forEach(file => {
                if (file.url) {
                    URL.revokeObjectURL(file.url);
                }
            });

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            setEnvioData({ ...initialEnvioState, nssBusqueda: '' });
            setStatusMessage(`🚀 Caso enviado a Dr. ${nuevoCaso.medicoEspecialistaNombre} completado.`);
        } catch (error) {
            setIsUploading(false);
            console.error('Error completo:', error);
            setStatusMessage(`❌ Error al enviar el caso: ${error.response?.data?.message || error.message}`);
        }
    };

    const inputStyle = "w-full p-3 bg-gray-200 rounded-lg border-none focus:ring-2 focus:ring-blue-500 focus:outline-none";
    const cardStyle = "p-6 bg-gray-100 rounded-xl shadow-md";
    const titleStyle = "text-lg font-semibold mb-2 text-gray-800";

    const paciente = envioData.pacienteSeleccionado;

    return (
        <div className="p-8 font-sans">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">Envío de Archivos Clínicos</h1>

            {statusMessage && (
                <div className={`p-4 mb-6 rounded-md font-medium ${statusMessage.startsWith('✅') || statusMessage.startsWith('🚀') ? 'bg-green-100 text-green-700' :
                        statusMessage.startsWith('⏳') ? 'bg-blue-100 text-blue-700' :
                            'bg-blue-100 text-blue-700'
                    }`}>
                    {statusMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8">

                <div className="w-full md:w-2/3 space-y-6">

                    <div className="flex items-start space-x-4">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                name="nssBusqueda"
                                placeholder="NSS del paciente"
                                value={envioData.nssBusqueda}
                                onChange={handleChange}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={handleSearchBlur}
                                className={inputStyle}
                                autoComplete="off"
                                required
                            />

                            {/* --- LISTA DE RESULTADOS DE BÚSQUEDA --- */}
                            {/* Ahora solo se muestra si el input tiene foco Y hay texto */}
                            {isSearchFocused && debouncedSearchTerm.length > 0 && (
                                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 shadow-lg max-h-60 overflow-y-auto" role="listbox">
                                    {isSearching ? (
                                        <li className="px-4 py-3 text-gray-500 italic">Buscando...</li>
                                    ) : searchResults.length === 0 && debouncedSearchTerm.length > 0 ? (
                                        <li className="px-4 py-3 text-gray-500 italic">No se encontraron coincidencias.</li>
                                    ) : (
                                        searchResults.map(p => (
                                            <li
                                                key={p.id}
                                                onClick={() => handleSelectPaciente(p)}
                                                className="px-4 py-3 cursor-pointer hover:bg-blue-100"
                                                role="option"
                                            >
                                                <p className="font-semibold text-gray-800">{p.nss}</p>
                                                <p className="text-sm text-gray-600">{p.nombre} {p.apellidoP}</p>
                                            </li>
                                        )))}
                                </ul>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleSearchClick()}
                            className="p-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition duration-200 shadow-md"
                        >
                            Buscar
                        </button>
                    </div>

                    <div className={cardStyle}>
                        <h2 className={titleStyle}>Motivo de la consulta</h2>
                        <textarea
                            name="motivoConsulta"
                            placeholder="El paciente llegó con malestar por dolor..."
                            value={envioData.motivoConsulta}
                            onChange={handleChange}
                            // CORRECCIÓN 1: Deshabilitar si no hay paciente
                            disabled={!paciente}
                            className={`${inputStyle} h-32 resize-none disabled:bg-gray-200 disabled:cursor-not-allowed`}
                            required
                        />
                    </div>

                    <div className={cardStyle}>
                        <h2 className={titleStyle}>Carga de Imágenes (DICOM/JPG/PNG)</h2>
                        <input
                            ref={fileInputRef} // 3. Asignamos la referencia al input
                            type="file"
                            name="archivosDICOM"
                            onChange={handleFileChange}
                            multiple
                            accept=".dcm,image/*"
                            // CORRECCIÓN 1: Deshabilitar si no hay paciente
                            disabled={!paciente}
                            className="w-full p-2 bg-white rounded-lg border border-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        />

                        <p className="text-sm text-gray-500 mt-3">
                            Archivos cargados: {envioData.archivosDICOM.length}
                            {envioData.archivosDICOM.length > 0 && (
                                <span className="ml-2 text-xs">
                                    ({(envioData.archivosDICOM.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB total)
                                </span>
                            )}
                        </p>

                        <div className="flex space-x-2 mt-2 overflow-x-auto pb-2">
                            {envioData.archivosDICOM.slice(0, 5).map((file, index) => (
                                <div key={index} className="flex-shrink-0">
                                    {file.url ? (
                                        <img
                                            src={file.url}
                                            alt={`Preview ${file.name}`}
                                            className="w-24 h-24 object-cover rounded-md border border-gray-300 shadow-sm"
                                            onLoad={() => URL.revokeObjectURL(file.url)}
                                        />
                                    ) : (
                                        <div className="w-24 h-24 flex items-center justify-center bg-gray-300 rounded-md border border-gray-400">
                                            <div className="text-center">
                                                <div className="text-2xl">📄</div>
                                                <div className="text-xs mt-1">.dcm</div>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-xs text-center mt-1 truncate w-24" title={file.name}>
                                        {file.name}
                                    </p>
                                </div>
                            ))}
                            {envioData.archivosDICOM.length > 5 && (
                                <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-600">
                                        +{envioData.archivosDICOM.length - 5} más
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={cardStyle}>
                        <h2 className={titleStyle}>Seleccionar Médico Destino</h2>
                        <select
                            name="medicoDestinoId"
                            value={envioData.medicoDestinoId}
                            onChange={handleChange}
                            // CORRECCIÓN 1: Deshabilitar si no hay paciente
                            disabled={!paciente}
                            className={`${inputStyle} disabled:bg-gray-200 disabled:cursor-not-allowed`} required
                        >
                            <option value="">-- Seleccionar Médico --</option>
                            {doctors.map(doc => (
                                <option key={doc.id} value={doc.id}>
                                    Dr. {doc.nombre} {doc.apellido}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full p-4 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition duration-200 shadow-lg disabled:bg-gray-400"
                        disabled={!paciente || isUploading}
                    >
                        {isUploading ? 'Subiendo archivos...' : 'Enviar Información'}
                    </button>
                </div>

                <div className="w-full md:w-1/3 space-y-6">

                    {paciente ? (
                        <>
                            <div className={cardStyle}>
                                <h2 className={titleStyle}>Información Básica del Paciente</h2>
                                <p className="text-sm"><strong className="font-medium">Nombre:</strong> {paciente.nombre || 'N/A'}</p>
                                <p className="text-sm"><strong className="font-medium">Apellido:</strong> {paciente.apellidoP} {paciente.apellidoM || 'N/A'}</p>
                                <p className="text-sm"><strong className="font-medium">Tipo de sangre:</strong> {paciente.tiposangre || 'N/A'}</p>
                                <p className="text-sm"><strong className="font-medium">Estatura:</strong> {paciente.estatura || 'N/A'} m</p>
                                <p className="text-sm"><strong className="font-medium">Peso:</strong> {paciente.peso || 'N/A'} kg</p>
                                <p className="text-sm"><strong className="font-medium">Edad:</strong> {paciente.edad || 'N/A'} años</p>
                                <p className="text-sm"><strong className="font-medium">Diabetes:</strong> {paciente.diabetes ? 'Sí' : 'No'}</p>
                                <p className="text-sm"><strong className="font-medium">Hipertensión:</strong> {paciente.hipertension ? 'Sí' : 'No'}</p>
                            </div>

                            <div className={cardStyle}>
                                <h2 className={titleStyle}>Historia Clínica</h2>
                                <p className="text-sm"><strong className="font-medium">Antecedentes:</strong> {paciente.antecedentes || 'N/A'}</p>
                                <p className="text-sm"><strong className="font-medium">Síntomas:</strong> {paciente.sintomascla || 'N/A'}</p>
                                <p className="text-sm"><strong className="font-medium">Medicamentos:</strong> {paciente.medicamentos || 'N/A'}</p>
                            </div>
                        </>
                    ) : (
                        <div className={`${cardStyle} text-gray-500 italic`}>
                            Busque un paciente por NSS para ver su información aquí.
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};

export default EnvioArchivos;