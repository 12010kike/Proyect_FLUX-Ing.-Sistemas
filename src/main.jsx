/**
 * PUNTO DE ENTRADA PRINCIPAL: main.jsx
 * ----------------------------------------------------------------------
 * Archivo raíz de la aplicación React (FLUX).
 * Se encarga de inyectar toda la aplicación en el DOM del navegador,
 * configurar el enrutador global (BrowserRouter) y montar utilidades 
 * globales como la invitación de instalación PWA.
 */

// ─── 1. IMPORTACIONES DE REACT Y LIBRERÍAS CORE ─────────────────────────
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// ─── 2. IMPORTACIONES DE COMPONENTES GLOBALES ───────────────────────────
import App from "./App.jsx";
import PWAInstallPrompt from "./components/PWAInstallPrompt.jsx";

// ─── 3. IMPORTACIONES DE ESTILOS GLOBALES ───────────────────────────────
import "./index.css";
import "./estilos/flux.css";

// ─── 4. INYECCIÓN Y RENDERIZADO EN EL DOM ───────────────────────────────
createRoot(document.getElementById('root')).render(
  
  // StrictMode advierte sobre prácticas obsoletas y ciclos de vida inseguros
  // (Ojo: causa un doble renderizado intencional solo en desarrollo)
  <StrictMode>
    
    {/* BrowserRouter habilita la navegación por URLs dinámicas sin recargar la página */}
    <BrowserRouter>
      
      {/* App contiene toda la lógica de rutas y guardias de seguridad */}
      <App />
      
      {/* Componente flotante que sugiere al usuario instalar la app como PWA */}
      <PWAInstallPrompt />
      
    </BrowserRouter>
    
  </StrictMode>,
)