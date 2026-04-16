/**
 * COMPONENTE: ConfirmModal
 * ----------------------------------------------------------------------
 * Muestra un cuadro de diálogo (modal) genérico para confirmar o 
 * cancelar acciones. Está diseñado para ser reutilizable en cualquier 
 * parte de la aplicación.
 * * Props:
 * - isOpen (bool): Controla si el modal es visible o no.
 * - title (string): Título superior del modal.
 * - message (string): Mensaje explicativo de la acción.
 * - onCancel (function): Función que se ejecuta al cancelar/cerrar.
 * - onConfirm (function): Función que se ejecuta al aceptar.
 * - confirmLabel (string): Texto del botón de confirmación (Por defecto "Aceptar").
 * - cancelLabel (string): Texto del botón de cancelación (Por defecto "Cancelar").
 */

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onCancel, 
  onConfirm, 
  confirmLabel = "Aceptar", 
  cancelLabel = "Cancelar" 
}) {
  
  // ─── 1. CONDICIÓN DE RENDERIZADO ─────────────────────────────────────────
  // Si el componente recibe isOpen como false, no dibuja nada en la pantalla
  if (!isOpen) return null;

  // ─── 2. RENDER PRINCIPAL DEL MODAL ───────────────────────────────────────
  return (
    // Overlay: Fondo transparente que cubre toda la pantalla. Si el usuario hace clic afuera, se cancela.
    <div style={estilos.overlay} onClick={onCancel}>
      
      {/* Contenedor del Modal: Detiene la propagación del clic para no cerrar el modal accidentalmente */}
      <div style={estilos.modal} onClick={(e) => e.stopPropagation()}>
        
        {/* Botón de cerrar superior (la 'X') */}
        <button style={estilos.cerrar} onClick={onCancel}>
          &times;
        </button>
        
        {/* Encabezado y Mensaje */}
        {title && <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>{title}</h3>}
        {message && <p style={{ color: "#555", marginBottom: 18 }}>{message}</p>}

        {/* Zona de Botones (Acciones) */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn" onClick={onCancel} style={{ minWidth: 110 }}>
            {cancelLabel}
          </button>
          
          <button className="btn btnPrimary" onClick={onConfirm} style={{ minWidth: 110 }}>
            {confirmLabel}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── 3. ESTILOS LOCALES ──────────────────────────────────────────────────
// Se mantienen los estilos en este objeto para no depender de CSS externo 
// en la maquetación básica del modal.
const estilos = {
  overlay: { 
    position: "fixed", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: "transparent", 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    zIndex: 1200 
  },
  modal: { 
    backgroundColor: "white", 
    padding: "22px", 
    borderRadius: "12px", 
    position: "relative", 
    width: "92%", 
    maxWidth: "420px", 
    textAlign: "center", 
    boxShadow: "0 8px 18px rgba(0,0,0,0.08)" 
  },
  cerrar: { 
    position: "absolute", 
    top: "8px", 
    right: "12px", 
    background: "none", 
    border: "none", 
    fontSize: "20px", 
    cursor: "pointer", 
    color: "#666" 
  }
};