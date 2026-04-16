/**
 * COMPONENTE PRINCIPAL: App
 * ----------------------------------------------------------------------
 * Enrutador central de la aplicación FLUX.
 * Gestiona el estado de autenticación global mediante Supabase y define
 * las reglas de acceso a rutas públicas, privadas y exclusivas de invitados.
 */

// ─── 1. IMPORTACIONES DE LIBRERÍAS ──────────────────────────────────────
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

// ─── 2. IMPORTACIONES LOCALES (Configuración y Estilos) ─────────────────
import { supabase } from "./config/supabaseClient"; // Importamos Supabase
import "./App.css"; 
import "./estilos/flux.css"; // Importamos los estilos globales de FLUX

// ─── 3. IMPORTACIONES DE PÁGINAS (Vistas) ───────────────────────────────
// Autenticación
import Registro from "./pages/Auth/Registro";
import OlvideContrasena from "./pages/Auth/OlvideContrasena";
import ResetPassword from "./pages/Auth/ResetPassword";

// Principal y Grupos/Repositorios
import Home from "./pages/Home/Home";
import GrupoDetalle from "./pages/Grupos/GrupoDetalle";
import DetallesRepositorio from "./pages/Grupos/DetallesRepositorio";
import RepositorioPublicoDetalle from "./pages/Grupos/RepositorioPublicoDetalle";

// Perfiles y Herramientas Avanzadas
import EditarPerfil from "./pages/Perfil/EditarPerfil";
import MetricasFundador from "./pages/Perfil/MetricasFundador"; 
import AsistenteIA from "./pages/IA/AsistenteIA";

// ─── 4. GUARDIAS DE NAVEGACIÓN (ROUTE GUARDS) ───────────────────────────

/**
 * RequireAuth: Protege rutas privadas.
 * Si el usuario NO tiene sesión, lo envía al Login y guarda la ruta
 * que intentaba visitar para redirigirlo después de loguearse.
 */
function RequireAuth({ session, loading, children }) {
  const location = useLocation();

  // Espera a que Supabase resuelva la sesión inicial
  if (loading) {
    return (
      <div className="container">
        <div className="card">Cargando...</div>
      </div>
    );
  }

  // Usuario no autenticado: redirigir a login y guardar destino
  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return children;
}

/**
 * GuestOnly: Protege rutas exclusivas para visitantes (Login/Registro).
 * Si el usuario YA tiene sesión, lo saca de ahí y lo manda al Home.
 */
function GuestOnly({ session, loading, children }) {
  const location = useLocation();

  // Espera a que Supabase resuelva la sesión inicial
  if (loading) {
    return (
      <div className="container">
        <div className="card">Cargando...</div>
      </div>
    );
  }

  // Si ya hay sesión, regresamos al destino original o al home
  if (session) {
    const destino = location.state?.from?.pathname || "/grupos";
    return <Navigate to={destino} replace />;
  }

  return children;
}

// ─── 5. COMPONENTE PRINCIPAL (RUTAS) ────────────────────────────────────

export default function App() {
  
  // Estado global de autenticación
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Efecto: Manejo del ciclo de vida de la sesión de Supabase
  useEffect(() => {
    // 1) Revisar si ya había una sesión guardada al abrir la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    // 2) Escuchar cambios: login, logout, caducidad o refresh de token
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Árbol de Rutas
  return (
    <Routes>
      
      {/* ── Rutas de Autenticación (Solo Invitados) ── */}
      <Route
        path="/auth"
        element={
          <GuestOnly session={session} loading={loadingSession}>
            <Registro />
          </GuestOnly>
        }
      />
      <Route
        path="/auth/forgot"
        element={
          <GuestOnly session={session} loading={loadingSession}>
            <OlvideContrasena />
          </GuestOnly>
        }
      />
      
      {/* ── Ruta Pública/Mixta para reseteo ── */}
      <Route
        path="/auth/reset"
        element={<ResetPassword />}
      />

      {/* ── Rutas Principales (Mixtas/Públicas dependiendo de permisos internos) ── */}
      <Route
        path="/grupos"
        element={<Home />}
      />
      <Route
        path="/grupos/:codigo"
        element={<GrupoDetalle />}
      />
      <Route
        path="/repos/:codigo"
        element={<DetallesRepositorio />}
      />
      <Route
        path="/repos-publicos/:id"
        element={<RepositorioPublicoDetalle />}
      />

      {/* ── Rutas Privadas (Requieren Sesión Activa) ── */}
      <Route
        path="/perfil/editar"
        element={
          <RequireAuth session={session} loading={loadingSession}>
            <EditarPerfil />
          </RequireAuth>
        }
      />
      <Route
        path="/ia"
        element={
          <RequireAuth session={session} loading={loadingSession}>
            <AsistenteIA />
          </RequireAuth>
        }
      />
      <Route
        path="/metricas"
        element={
          <RequireAuth session={session} loading={loadingSession}>
            <MetricasFundador />
          </RequireAuth>
        }
      />

      {/* ── Redirecciones por defecto (Fallback) ── */}
      <Route path="/" element={<Navigate to="/grupos" replace />} />
      <Route path="*" element={<Navigate to="/grupos" replace />} />
      
    </Routes>
  );
}