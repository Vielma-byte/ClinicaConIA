import React from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Login from "./components/Login.jsx";
import RecuperarContrasena from "./components/RecuperarContrasena.jsx";
import Historial from "./pages/Historial.jsx";
import MainLayout from "./components/MainLayout.jsx";
import AltaUsuario from "./pages/AltaUsuario.jsx";
import AltaPaciente from "./pages/AltaPaciente.jsx";
import EnvioArchivos from "./pages/EnvioArchivos.jsx";
import CasoDetalle from "./pages/CasoDetalle.jsx";
import GestionPacientes from "./pages/GestionPacientes.jsx";
import DicomViewer from "./pages/DicomViewer.jsx";

const App = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return <div className="flex h-screen w-screen items-center justify-center"><h1>Cargando...</h1></div>;
  }

  return (
    <div className="App">
      <Routes>
        {/* 1. RUTA DE LOGIN */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/app/historial" replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/recuperar-contrasena"
          element={
            isAuthenticated ? (
              <Navigate to="/app/historial" replace />
            ) : (
              <RecuperarContrasena />
            )
          }
        />

        {/* 2. LAYOUT PROTEGIDO */}
        <Route
          path="/app"
          element={
            isAuthenticated ? (
              <MainLayout userRole={user.rol} onLogout={logout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          <Route
            path="historial"
            element={<Historial loggedInUser={user} />}
          />

          {user?.rol === 'administrador' && (
            <Route path="alta-usuario" element={<AltaUsuario />} />
          )}

          <Route
            path="envio-archivos"
            element={<EnvioArchivos loggedInUser={user} />}
          />

          {(user?.rol === 'atencion' || user?.rol === 'administrador') && (
            <Route path="gestion-pacientes" element={<GestionPacientes />} />
          )}

          <Route
            path="alta-paciente/:nss?"
            element={<AltaPaciente loggedInUser={user} />}
          />

          <Route
            path="casos/:id"
            element={<CasoDetalle loggedInUser={user} />}
          />

          <Route
            path="viewer"
            element={<DicomViewer />}
          />
        </Route>

        <Route path="*" element={<h1>404 | Página no encontrada</h1>} />
      </Routes>
    </div>
  );
};

export default App;
