/**
 * COMPONENTE: PWAInstallPrompt
 * ----------------------------------------------------------------------
 * Gestiona los avisos relacionados con la Progressive Web App (PWA).
 * Muestra dos tipos de notificaciones flotantes (banners):
 * 1. Banner de Actualización: Cuando hay una nueva versión de la app.
 * 2. Banner de Instalación: Invita al usuario a instalar la app en su móvil/PC.
 */

import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWAInstallPrompt() {
  
  // ─── 1. ESTADOS LOCALES ──────────────────────────────────────────────────
  const [installPrompt, setInstallPrompt] = useState(null); // Guarda el evento nativo de instalación
  const [showInstallBanner, setShowInstallBanner] = useState(false); // Controla la visibilidad del banner

  // ─── 2. HOOKS DE PWA (Service Worker) ────────────────────────────────────
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW();

  // ─── 3. EFECTOS (LIFECYCLE) ──────────────────────────────────────────────
  useEffect(() => {
    // Intercepta el evento nativo del navegador que pide instalar la app
    const handler = (e) => {
      e.preventDefault(); // Evita que el navegador muestre su prompt feo por defecto
      setInstallPrompt(e); // Guardamos el evento para dispararlo cuando queramos
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ─── 4. MANEJADORES DE EVENTOS (HANDLERS) ────────────────────────────────
  
  /**
   * Dispara el prompt de instalación nativo usando el evento que guardamos.
   */
  const handleInstall = async () => {
    if (!installPrompt) return;
    
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice; // Espera a ver si el usuario aceptó
    
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  };

  /**
   * Actualiza el Service Worker para aplicar la nueva versión de la app.
   */
  const handleUpdate = () => {
    updateServiceWorker(true);
    setNeedRefresh(false);
  };

  // ─── 5. CONDICIÓN DE RENDERIZADO ─────────────────────────────────────────
  // Si no hay nada que mostrar (ni actualizar ni instalar), no dibujamos nada
  if (!showInstallBanner && !needRefresh) return null;

  // ─── 6. RENDERIZADO (JSX) ────────────────────────────────────────────────
  return (
    <div style={estilos.contenedor}>
      
      {/* BANNER 1: Nueva versión disponible */}
      {needRefresh && (
        <div style={estilos.bannerActualizacion}>
          <span style={estilos.textoBanner}>
            Nueva versión disponible
          </span>
          <div style={estilos.grupoBotones}>
            <button onClick={() => setNeedRefresh(false)} style={estilos.btnSecundarioOscuro}>
              Ahora no
            </button>
            <button onClick={handleUpdate} style={estilos.btnPrimarioNaranja}>
              Actualizar
            </button>
          </div>
        </div>
      )}

      {/* BANNER 2: Invitación de Instalación (PWA) */}
      {showInstallBanner && !needRefresh && (
        <div style={estilos.bannerInstalacion}>
          <span style={estilos.textoBanner}>
            Instala FLUX en tu dispositivo
          </span>
          <div style={estilos.grupoBotones}>
            <button onClick={() => setShowInstallBanner(false)} style={estilos.btnSecundarioClaro}>
              No
            </button>
            <button onClick={handleInstall} style={estilos.btnPrimarioBlanco}>
              Instalar
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}

// ─── 7. ESTILOS LOCALES ──────────────────────────────────────────────────
// Extraídos para mantener el componente limpio y legible
const estilos = {
  contenedor: {
    position: 'fixed',
    bottom: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 32px)',
    maxWidth: '420px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    pointerEvents: 'none' // Permite hacer clic "a través" del contenedor vacío
  },
  textoBanner: {
    fontSize: '14px',
    flex: 1
  },
  grupoBotones: {
    display: 'flex',
    gap: '8px'
  },
  // --- Estilos Banner Actualización ---
  bannerActualizacion: {
    background: '#25343F',
    color: '#EAEFEF',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    pointerEvents: 'all' // Reactiva los clics dentro del banner
  },
  btnSecundarioOscuro: {
    background: 'transparent',
    border: '1px solid rgba(234,239,239,0.3)',
    color: '#EAEFEF',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  btnPrimarioNaranja: {
    background: '#FF9B51',
    border: 'none',
    color: '#fff',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  // --- Estilos Banner Instalación ---
  bannerInstalacion: {
    background: '#FF9B51',
    color: '#fff',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    boxShadow: '0 4px 20px rgba(255,155,81,0.4)',
    pointerEvents: 'all'
  },
  btnSecundarioClaro: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.5)',
    color: '#fff',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  btnPrimarioBlanco: {
    background: '#fff',
    border: 'none',
    color: '#FF9B51',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer'
  }
};