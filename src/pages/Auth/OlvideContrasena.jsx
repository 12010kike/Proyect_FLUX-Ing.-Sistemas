/**
 * COMPONENTE: OlvideContrasena
 * ----------------------------------------------------------------------
 * Vista de autenticación para solicitar la recuperación de contraseña.
 * Permite al usuario ingresar su correo electrónico y envía un enlace
 * de restablecimiento utilizando la API de Supabase Auth.
 */

// ─── IMPORTACIONES ──────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabaseClient'
import '../../estilos/flux.css'
import logoFlux from '../../assets/logo-flux.png'

export default function OlvideContrasena() {
  
  // ─── ESTADOS Y HOOKS ──────────────────────────────────────────────────
  const navigate = useNavigate() // Hook para la navegación entre rutas
  const [email, setEmail] = useState('') // Almacena el correo electrónico ingresado
  const [cargando, setCargando] = useState(false) // Controla si el formulario está en proceso de envío
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }) // Almacena y maneja las alertas de éxito o error

  // ─── FUNCIONES (HANDLERS) ─────────────────────────────────────────────
  
  /**
   * Maneja el evento de envío del formulario.
   * Se comunica con Supabase para mandar el correo con el link de reseteo.
   */
  const enviarReset = async (e) => {
    e.preventDefault() // Evita la recarga de la página por defecto del formulario
    setMensaje({ texto: '', tipo: '' }) // Limpia cualquier mensaje anterior
    setCargando(true) // Deshabilita el botón mientras se hace la petición

    try {
      // Se determina la URL base (funciona tanto en desarrollo local como en producción/Vercel)
      const siteUrl = import.meta.env.VITE_SITE_URL ?? window.location.origin
      
      // Petición a Supabase para enviar el correo
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: siteUrl + '/auth/reset' // URL a la que será enviado el usuario al abrir el correo
      })

      if (error) throw error

      // Si la petición es exitosa, informamos al usuario
      setMensaje({ texto: '✅ Revisa tu correo para resetear la contraseña.', tipo: 'exito' })
    } catch (err) {
      // Si hay un error (correo inválido, límite de peticiones, etc.), mostramos la alerta
      setMensaje({ texto: '⚠️ ' + err.message, tipo: 'error' })
    } finally {
      // Siempre detenemos el estado de carga al terminar, sin importar el resultado
      setCargando(false)
    }
  }

  // ─── RENDERIZADO (JSX) ────────────────────────────────────────────────
  return (
    <div className="auth-layout">
      
      {/* ── Encabezado y Logo ── */}
      <div className="auth-header">
        <div className="brand">
          <img src={logoFlux} alt="FLUX" className="brand-logo-img" />
        </div>
        <span className="brandSubtitle" style={{ fontSize: '15px' }}>Recuperar contraseña</span>
      </div>

      {/* ── Tarjeta Principal ── */}
      <div className="card auth-card-width">
        <h2 className="text-center" style={{ marginBottom: '24px' }}>Olvidé mi contraseña</h2>

        {/* ── Formulario ── */}
        <form onSubmit={enviarReset}>
          
          {/* Input: Correo Electrónico */}
          <div className="mb-4">
            <label className="label">Correo electrónico</label>
            <input
              className="input"
              type="email"
              placeholder="usuario@correo.unimet.edu.ve"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ marginTop: 0 }}
            />
          </div>

          {/* Botón de Enviar */}
          <button type="submit" className="btn btnPrimary" disabled={cargando}>
            {cargando ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>

        {/* ── Separador Visual ── */}
        <div style={{ margin: '24px 0', borderTop: '1px solid rgba(37, 52, 63, 0.12)'}}></div>

        {/* ── Botón Volver al Login ── */}
        <button
          type="button"
          className="btn"
          onClick={() => navigate('/auth')}
        >
          Volver al Login
        </button>

        {/* ── Alertas (Solo se muestran si hay un mensaje activo) ── */}
        {mensaje.texto && (
          <div className={mensaje.tipo === 'error' ? 'alert' : 'preview'} style={{ marginTop: '20px' }}>
            <span className="label" style={{ marginBottom: 0, color: 'var(--texto)', textAlign: 'center', display: 'block', fontWeight: 500 }}>
              {mensaje.texto}
            </span>
          </div>
        )}
        
      </div>
    </div>
  )
}