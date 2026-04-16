/**
 * COMPONENTE: ModalQR
 * ----------------------------------------------------------------------
 * Muestra un modal emergente que renderiza un código QR a partir de una URL.
 * Ideal para invitar usuarios, compartir repositorios o accesos rápidos.
 * * Props:
 * - isOpen (bool): Controla si el modal es visible en pantalla.
 * - onClose (function): Función que se dispara al cerrar el modal.
 * - url (string): La dirección web o texto que será codificado en el QR.
 * - titulo (string): Texto principal que aparecerá en la parte superior.
 */

import QRCode from "react-qr-code";

export default function ModalQR({ isOpen, onClose, url, titulo }) {
  
  // ─── 1. CONDICIÓN DE RENDERIZADO ─────────────────────────────────────────
  // Previene que el componente se dibuje si isOpen es falso
  if (!isOpen) return null;

  // ─── 2. RENDERIZADO (JSX) ────────────────────────────────────────────────
  return (
    // Overlay oscuro con efecto de desenfoque. Al hacer clic fuera, se cierra.
    <div style={estilos.overlay} onClick={onClose}>
      
      {/* Contenedor del Modal. Detenemos la propagación para no cerrar al hacer clic adentro */}
      <div style={estilos.modal} onClick={(e) => e.stopPropagation()}>
        
        {/* Botón de cierre en la esquina superior derecha */}
        <button style={estilos.cerrar} onClick={onClose}>
          &times;
        </button>
        
        {/* Textos informativos */}
        <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>{titulo}</h3>
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
          Escanea para unirte
        </p>
        
        {/* Contenedor del código QR (nivel H = Alta corrección de errores) */}
        <div style={estilos.qrContenedor}>
          <QRCode value={url} size={200} level={"H"} />
        </div>
        
        {/* Muestra la URL en texto plano por si no pueden escanear */}
        <p style={estilos.urlTexto}>
          {url}
        </p>
        
      </div>
    </div>
  );
}

// ─── 3. ESTILOS LOCALES ──────────────────────────────────────────────────
const estilos = {
  overlay: { 
    position: "fixed", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: "rgba(0,0,0,0.7)", 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    zIndex: 1000, 
    backdropFilter: "blur(3px)" 
  },
  modal: { 
    backgroundColor: "white", 
    padding: "30px", 
    borderRadius: "16px", 
    position: "relative", 
    width: "90%", 
    maxWidth: "350px", 
    textAlign: "center", 
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)" 
  },
  cerrar: { 
    position: "absolute", 
    top: "10px", 
    right: "15px", 
    background: "none", 
    border: "none", 
    fontSize: "24px", 
    cursor: "pointer", 
    color: "#666" 
  },
  qrContenedor: { 
    background: "white", 
    padding: "16px", 
    borderRadius: "8px", 
    border: "1px solid #eee", 
    display: "inline-block" 
  },
  urlTexto: { 
    marginTop: "20px", 
    fontSize: "12px", 
    color: "#999", 
    wordBreak: "break-all" 
  }
};