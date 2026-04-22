/**
 * COMPONENTE: ResetPassword (Auth)
 * ----------------------------------------------------------------------
 * Vista que captura el enlace de recuperación de contraseña enviado por correo.
 * Extrae los tokens de seguridad de la URL para autenticar temporalmente
 * al usuario y le permite establecer una nueva contraseña.
 */

// ─── IMPORTACIONES ──────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../config/supabaseClient";
import logoFlux from "../../assets/logo-flux.png";

export default function ResetPassword() {
  // ─── ESTADOS Y HOOKS ──────────────────────────────────────────────────
  const navigate = useNavigate()
  
  // Estado para saber si ya terminamos de procesar la URL y buscar los tokens
  const [ready, setReady] = useState(false)
  
  // Estado para guardar la sesión temporal recuperada del enlace
  const [session, setSession] = useState(null)
  
  // Estados para los campos del formulario
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  
  // Estados de control de UI (cargas y alertas)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // ─── EFECTOS (LIFECYCLE) ──────────────────────────────────────────────
  
  /**
   * Efecto de inicialización:
   * Se ejecuta una sola vez al cargar la vista.
   * Su objetivo es buscar los tokens ('access_token' y 'refresh_token') en la URL,
   * establecer una sesión temporal en Supabase y limpiar la URL por seguridad.
   */
  useEffect(() => {
    ;(async () => {
      try {
        // Parsear manualmente tokens en hash o query (compatible con cualquier versión de supabase-js)
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const searchParams = new URLSearchParams(window.location.search)
        
        const access_token = hashParams.get('access_token') || searchParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token')

        console.debug('ResetPassword: parsed tokens', { access_token: !!access_token, refresh_token: !!refresh_token })

        if (access_token) {
          // Establecer la sesión manualmente para que el cliente de Supabase tenga la sesión activa
          const { data: setData, error: setError } = await supabase.auth.setSession({ access_token, refresh_token })
          
          if (setError) {
            console.error('setSession error', setError)
          } else {
            setSession(setData.session ?? null)
          }
        } else {
          // Si no hay tokens en la URL, comprobar si por casualidad ya hay una sesión activa localmente
          const { data: current } = await supabase.auth.getSession()
          setSession(current?.session ?? null)
        }
      } catch (err) {
        console.error('reset: manual session handling', err)
      } finally {
        setReady(true) // Indicamos que ya terminamos de verificar
        
        // Limpiar tokens de la URL por seguridad para que el usuario no los comparta por error
        try {
          const cleanUrl = window.location.pathname + window.location.search
          window.history.replaceState({}, document.title, cleanUrl)
        } catch (e) {
          // Si falla la limpieza no es crítico, ignorar
        }
      }
    })()
  }, [])

  // ─── FUNCIONES (HANDLERS) ─────────────────────────────────────────────
  
  /**
   * Función para procesar el formulario de nueva contraseña.
   * Valida la longitud, coincidencia y luego actualiza la contraseña en Supabase.
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage({ text: '', type: '' }) // Limpia mensajes anteriores

    // Validaciones locales básicas
    if (password.length < 8) {
      setMessage({ text: 'La contraseña debe tener al menos 8 caracteres.', type: 'error' })
      return
    }
    if (password !== passwordConfirm) {
      setMessage({ text: 'Las contraseñas no coinciden.', type: 'error' })
      return
    }

    setLoading(true)
    
    try {
      // Petición a Supabase para actualizar la contraseña del usuario logueado (sesión temporal)
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setMessage({ text: '✅ Contraseña actualizada. Redirigiendo al login...', type: 'success' })
      
      // Tras actualizar, cerramos la sesión temporal local por seguridad
      try {
        await supabase.auth.signOut()
      } catch (signOutErr) {
        console.error('signOut error', signOutErr)
      }
      
      // Redirigir al login limpiando el historial para que no pueda hacer "Atrás"
      navigate('/auth', { replace: true })
      
    } catch (err) {
      setMessage({ text: '⚠️ ' + err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // ─── RENDERIZADO (JSX) ────────────────────────────────────────────────

  // CASO 1: Cargando y procesando la URL
  if (!ready) return <div className="container"><div className="card">Cargando...</div></div>

  // CASO 2: Error. El enlace no tiene token o ya expiró (no se pudo crear la sesión temporal)
  if (!session) {
    return (
      <div className="auth-layout">
        
        {/* Header de Error */}
        <div className="auth-header">
          <div className="brand">
            <img src={logoFlux} alt="FLUX" className="brand-logo-img" />
          </div>
          <span className="brandSubtitle" style={{ fontSize: '15px' }}>Recuperar contraseña</span>
        </div>

        {/* Tarjeta de Error */}
        <div className="card auth-card-width">
          <h2 className="text-center">Enlace inválido o expirado</h2>
          <p className="label">
            El enlace de recuperación parece inválido o ya expiró. Solicita nuevamente el enlace de recuperación.
          </p>
          <div style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => navigate('/auth/forgot')}>
              Solicitar nuevo enlace
            </button>
            <button className="btn" style={{ marginLeft: 8 }} onClick={() => navigate('/auth')}>
              Volver al login
            </button>
          </div>
        </div>

      </div>
    )
  }

  // CASO 3: Éxito. Token válido, mostrar formulario de nueva contraseña
  return (
    <div className="auth-layout">
      
      {/* Header Formulario */}
      <div className="auth-header">
        <div className="brand">
          <div className="logoDot"></div>
          <span className="brandTitle" style={{ fontSize: '32px' }}>FLUX</span>
        </div>
        <span className="brandSubtitle" style={{ fontSize: '15px' }}>Actualizar contraseña</span>
      </div>

      {/* Tarjeta Formulario */}
      <div className="card auth-card-width">
        <h2 className="text-center" style={{ marginBottom: 24 }}>Elige una nueva contraseña</h2>

        <form onSubmit={handleSubmit}>
          
          {/* Input: Nueva Contraseña */}
          <div className="mb-4">
            <label className="label">Nueva contraseña</label>
            <input 
              className="input" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          {/* Input: Confirmar Nueva Contraseña */}
          <div className="mb-4">
            <label className="label">Confirmar nueva contraseña</label>
            <input 
              className="input" 
              type="password" 
              value={passwordConfirm} 
              onChange={(e) => setPasswordConfirm(e.target.value)} 
              required 
            />
          </div>

          {/* Botón Guardar */}
          <button type="submit" className="btn btnPrimary" disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>

        {/* Alertas y Notificaciones Dinámicas */}
        {message.text && (
          <div className={message.type === 'error' ? 'alert' : 'preview'} style={{ marginTop: 20 }}>
            <span className="label" style={{ marginBottom: 0, color: 'var(--texto)', textAlign: 'center', display: 'block', fontWeight: 500 }}>
              {message.text}
            </span>
          </div>
        )}

      </div>
    </div>
  )
}