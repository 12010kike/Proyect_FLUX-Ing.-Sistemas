/**
 * COMPONENTE: Registro (Auth)
 * ----------------------------------------------------------------------
 * Componente principal para la autenticación de usuarios.
 * Maneja dos vistas alternables: Iniciar Sesión (Login) y Registro (Sign Up).
 * Incluye validaciones de seguridad (contraseñas seguras, correos institucionales)
 * y creación automática de perfil en Supabase al registrarse.
 */

// ─── IMPORTACIONES ──────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabaseClient'
import logoFlux from '../../assets/logo-flux.png'

function Registro() {
  // ─── ESTADOS Y HOOKS ──────────────────────────────────────────────────
  const navigate = useNavigate() // Hook para redirigir entre rutas
  
  // Control de vista: true = Modo Login | false = Modo Registro
  const [esLogin, setEsLogin] = useState(true) 
  
  // Estados para los campos del formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('') // Solo registro
  const [username, setUsername] = useState('') // Solo registro
  const [telefono, setTelefono] = useState('') // Solo registro
  const [nombre, setNombre] = useState('') // Solo registro
  const [apellido, setApellido] = useState('') // Solo registro
  
  // Estado para funcionalidad "mostrar/ocultar" contraseña
  const [mostrarPassword, setMostrarPassword] = useState(false)
  
  // Estados de control de UI (cargas y alertas)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }) // tipo: 'exito' | 'error'

  // ─── FUNCIONES (HANDLERS) ─────────────────────────────────────────────
  
  /**
   * Función principal que maneja el envío del formulario.
   * Dependiendo del estado 'esLogin', ejecuta SignIn o SignUp.
   */
  const manejarAuth = async (e) => {
    e.preventDefault()
    setMensaje({ texto: '', tipo: '' }) // Limpiar mensajes anteriores
    setCargando(true)

    try {
      if (esLogin) {
        // ==========================================
        // MODO INICIAR SESIÓN (LOGIN)
        // ==========================================
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) {
          // Manejo específico para credenciales incorrectas
          if (error.message.includes("Invalid login")) {
            setMensaje({ 
              texto: '❌ Usuario no encontrado o contraseña incorrecta. ¿Quieres crear una cuenta?', 
              tipo: 'error' 
            })
          } else {
            throw error
          }
        }

      } else {
        // ==========================================
        // MODO CREAR CUENTA (REGISTRO)
        // ==========================================

        // 1. Validaciones de campos obligatorios
        if (!username.trim()) {
          throw new Error('El username es obligatorio.')
        }
        if (!telefono.trim()) {
          throw new Error('El teléfono es obligatorio.')
        }
        if (!nombre.trim()) {
          throw new Error('El nombre es obligatorio.')
        }
        if (!apellido.trim()) {
          throw new Error('El apellido es obligatorio.')
        }

        // 2. Validación de dominio de correo (Seguridad Institucional)
        if (!email.endsWith('@correo.unimet.edu.ve')) {
          throw new Error('Solo se permiten correos @correo.unimet.edu.ve')
        }

        // 3. Validación de seguridad de contraseña
        const regex = /^(?=.*\d)(?=.*[A-Z]).{8,}$/
        if (!regex.test(password)) {
          throw new Error('La contraseña debe tener: 8 caracteres, 1 mayúscula y 1 número.')
        }

        // 4. Verificación de confirmación de contraseña
        if (password !== passwordConfirm) {
          throw new Error('Las contraseñas no coinciden.')
        }

        // 5. Petición de creación de usuario en Supabase Auth
        const displayName = `${nombre.trim()} ${apellido.trim()}`.trim()
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              username: username.trim(),
              phone: telefono.trim(),
              first_name: nombre.trim(),
              last_name: apellido.trim()
            }
          }
        })

        if (error) throw error

        // 6. Creación automática del perfil público (Tabla 'profiles')
        const userId = data?.user?.id
        if (userId) {
          const { error: perfilError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: userId,
                username: username.trim(),
                telefono: telefono.trim(),
                nombre: nombre.trim(),
                apellido: apellido.trim(),
                email: email.trim().toLowerCase(),
                career: ''
              },
              { onConflict: 'id' } // Actualiza si ya existe
            )
          if (perfilError) throw perfilError
        }

        // 7. Notificación de éxito y redirección al modo Login
        setMensaje({ 
          texto: '✅ ¡Cuenta creada! Hemos enviado un enlace de verificación a tu correo Unimet.', 
          tipo: 'exito' 
        })

        setTimeout(() => {
          setEsLogin(true)
          setMensaje({ texto: '', tipo: '' })
        }, 2000)
      }

    } catch (error) {
      // Captura y muestra cualquier error de validación o de red
      setMensaje({ texto: '⚠️ ' + error.message, tipo: 'error' })
    } finally {
      setCargando(false)
    }
  }

  // ─── RENDERIZADO (JSX) ────────────────────────────────────────────────
  return (
    <div className="auth-layout">
      
      {/* ── Encabezado: Marca y Subtítulo Dinámico ── */}
      <div className="auth-header">
        <div className="brand">
          <img src={logoFlux} alt="FLUX" className="brand-logo-img" />
        </div>
        <span className="brandSubtitle" style={{ fontSize: '15px' }}>
          {esLogin ? 'Bienvenido de nuevo' : 'Únete a la comunidad'}
        </span>
      </div>

      {/* ── Tarjeta de Formulario Centrada ── */}
      <div className="card auth-card-width">
        <h2 className="text-center" style={{ marginBottom: '24px' }}>
          {esLogin ? 'Iniciar Sesión' : 'Crear Usuario'}
        </h2>
        
        <form onSubmit={manejarAuth}>
          
          {/* Input: Correo Institucional (Común en ambos modos) */}
          <div className="mb-4">
            <label className="label">Correo Institucional</label>
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

          {/* Bloque: Campos adicionales (SOLO MODO REGISTRO) */}
          {!esLogin && (
            <>
              {/* Input: Username */}
              <div className="mb-4">
                <label className="label">Username</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ marginTop: 0 }}
                />
              </div>

              {/* Input: Teléfono */}
              <div className="mb-4">
                <label className="label">Teléfono</label>
                <input
                  className="input"
                  type="tel"
                  placeholder="Tu número de teléfono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  required
                  style={{ marginTop: 0 }}
                />
              </div>

              {/* Input: Nombre */}
              <div className="mb-4">
                <label className="label">Nombre</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  style={{ marginTop: 0 }}
                />
              </div>

              {/* Input: Apellido */}
              <div className="mb-4">
                <label className="label">Apellido</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Tu apellido"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  required
                  style={{ marginTop: 0 }}
                />
              </div>
            </>
          )}

          {/* Input: Contraseña (Común en ambos modos, con botón revelar) */}
          <div className="mb-4">
            <label className="label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input 
                className="input" 
                type={mostrarPassword ? "text" : "password"} 
                placeholder={esLogin ? "Tu contraseña" : "Mín. 8 caracteres, 1 Mayúscula, 1 Número"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ marginTop: 0 }}
              />
              
              {/* Botón (Ojo) para alternar visibilidad de contraseña */}
              <button
                type="button"
                className="password-eye"
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={mostrarPassword}
                onClick={() => setMostrarPassword(v => !v)}
              >
                {/* SVG del Ojo Abierto / Cerrado */}
                {mostrarPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-6 0-10-8-10-8a21.77 21.77 0 0 1 5.06-6.94" />
                    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6 0 10 8 10 8a21.79 21.79 0 0 1-3.17 4.26" />
                    <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                    <path d="M1 1l22 22" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Input: Confirmar Contraseña (SOLO MODO REGISTRO) */}
          {!esLogin && (
            <div className="mb-4">
              <label className="label">Confirmar contraseña</label>
              <input
                className="input"
                type={mostrarPassword ? "text" : "password"}
                placeholder="Repite tu contraseña"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                style={{ marginTop: 0 }}
              />
            </div>
          )}

          {/* Botón de Enviar Formulario */}
          <button 
            type="submit" 
            className="btn btnPrimary" 
            disabled={cargando}
          >
            {cargando ? 'Procesando...' : (esLogin ? 'Iniciar Sesión' : 'Registrarse')}
          </button>

        </form>

        {/* ── Zona Inferior: Navegación Alternativa y Alertas ── */}
        
        {/* Separador Visual */}
        <div style={{ margin: '24px 0', borderTop: '1px solid rgba(37, 52, 63, 0.12)' }}></div>

        {/* Alternador de Modo (Login / Registro) */}
        <p className="text-center label">
          {esLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
        </p>
        <button 
          type="button" 
          className="btn btn-secundario"
          onClick={() => {
            setEsLogin(!esLogin)
            setMensaje({ text: '', tipo: '' }) // Reseteamos errores al cambiar de modo
          }}
        >
          {esLogin ? 'Crear Usuario Nuevo' : 'Iniciar Sesión'}
        </button>

        {/* Botón de Recuperar Contraseña (Solo visible en Login) */}
        {esLogin && (
          <button
            type="button"
            className="btn"
            style={{ marginTop: '12px' }}
            onClick={() => navigate('/auth/forgot')}
          >
            Olvidé mi contraseña
          </button>
        )}

        {/* Botón genérico Volver al Home */}
        <button
          type="button"
          className="btn"
          style={{ marginTop: '12px' }}
          onClick={() => navigate('/grupos')}
        >
          Volver al Home
        </button>

        {/* Alertas y Notificaciones Dinámicas */}
        {mensaje.texto && (
          <div className={mensaje.tipo === 'error' ? 'alert' : 'preview'} style={{ marginTop: '20px' }}>
            <span className="label" style={{
              marginBottom: 0, 
              color: 'var(--texto)', 
              textAlign: 'center', 
              display: 'block',
              fontWeight: 500
            }}>
              {mensaje.texto}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Registro