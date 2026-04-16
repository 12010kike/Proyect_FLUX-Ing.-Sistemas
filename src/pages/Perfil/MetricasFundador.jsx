/**
 * COMPONENTE: MetricasFundador
 * ----------------------------------------------------------------------
 * Vista administrativa exclusiva para usuarios con rol "is_fundador".
 * Proporciona una visión global del crecimiento de la plataforma:
 * - Totales de Repositorios, Grupos y Usuarios.
 * - Gráfico de barras dinámico escalado automáticamente.
 * - Suscripción en tiempo real a cambios en cualquier tabla clave.
 * - Filtros temporales (semana, mes, año).
 */

// ─── 1. IMPORTACIONES ───────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../config/supabaseClient";
import { obtenerTotalesAdminHome } from "../../servicios/grupos.api";

// ─── 2. CONSTANTES DE CONFIGURACIÓN ─────────────────────────────────────
const FECHA_OPTIONS = [
  { value: "all", label: "Sin filtro de fecha" },
  { value: "1w", label: "Última semana" },
  { value: "1m", label: "Último mes" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "1y", label: "Último año" }
];

export default function MetricasFundador() {
  
  // ─── 3. ESTADOS Y HOOKS ────────────────────────────────────────────────
  const navigate = useNavigate();
  
  // -- Estados de Usuario y Permisos
  const [userId, setUserId] = useState(null);
  const [esFundadorVista, setEsFundadorVista] = useState(false);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  
  // -- Estados de Datos Administrativos
  const [totalesAdmin, setTotalesAdmin] = useState({
    totalGrupos: 0,
    totalRepositorios: 0,
    totalUsuarios: 0
  });
  const [filtroFechaMetricas, setFiltroFechaMetricas] = useState("all");
  const [cargandoTotalesAdmin, setCargandoTotalesAdmin] = useState(false);
  
  // -- Estado de Error
  const [error, setError] = useState("");

  // ─── 4. LÓGICA DE ESCALADO DEL GRÁFICO (MEMOS) ─────────────────────────
  
  const fechaMetricasLabel = useMemo(() => 
    FECHA_OPTIONS.find(o => o.value === filtroFechaMetricas)?.label || "Sin filtro de fecha",
    [filtroFechaMetricas]
  );

  /**
   * Calcula el valor máximo para establecer el tope de la escala Y del gráfico.
   */
  const maxTotalAdmin = useMemo(
    () => Math.max(totalesAdmin.totalGrupos, totalesAdmin.totalRepositorios, totalesAdmin.totalUsuarios, 1),
    [totalesAdmin]
  );

  const mitadEscalaAdmin = useMemo(() => Math.round(maxTotalAdmin / 2), [maxTotalAdmin]);

  /**
   * Calcula el porcentaje de altura de cada barra basándose en el máximo.
   * Se establece un mínimo de 10% por estética visual.
   */
  const altoBarraRepos = Math.max((totalesAdmin.totalRepositorios / maxTotalAdmin) * 100, 10);
  const altoBarraGrupos = Math.max((totalesAdmin.totalGrupos / maxTotalAdmin) * 100, 10);
  const altoBarraUsuarios = Math.max((totalesAdmin.totalUsuarios / maxTotalAdmin) * 100, 10);

  // ─── 5. FUNCIONES DE CARGA (FETCH) ─────────────────────────────────────

  /**
   * Valida que el usuario esté logueado y tenga permisos de fundador.
   */
  async function cargarPerfilFundador() {
    try {
      setCargandoPerfil(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;

      const user = session?.user;
      if (!user) {
        navigate("/auth", { replace: true });
        return;
      }
      setUserId(user.id);

      const { data: perfilData, error: perfilError } = await supabase
        .from("profiles")
        .select("is_fundador")
        .eq("id", user.id)
        .maybeSingle();

      if (perfilError) throw perfilError;
      setEsFundadorVista(Boolean(perfilData?.is_fundador));

    } catch (e) {
      setError(e.message || "No se pudo validar el perfil.");
      setEsFundadorVista(false);
    } finally {
      setCargandoPerfil(false);
    }
  }

  /**
   * Obtiene los conteos totales desde la API aplicándole el filtro temporal.
   */
  async function cargarTotalesAdminPanel() {
    try {
      setCargandoTotalesAdmin(true);
      const totales = await obtenerTotalesAdminHome({ fechaFiltro: filtroFechaMetricas });
      setTotalesAdmin(totales);
    } catch (e) {
      setError(e.message || "No se pudieron cargar las métricas.");
    } finally {
      setCargandoTotalesAdmin(false);
    }
  }

  // ─── 6. EFECTOS (LIFECYCLE & REALTIME) ─────────────────────────────────

  // Carga inicial de validación
  useEffect(() => {
    cargarPerfilFundador();
  }, []);

  // Recarga de métricas cuando cambia el filtro o el perfil está listo
  useEffect(() => {
    if (cargandoPerfil || !esFundadorVista) return;
    cargarTotalesAdminPanel();
  }, [cargandoPerfil, esFundadorVista, filtroFechaMetricas]);

  /**
   * Suscripción en Tiempo Real:
   * Si cualquier dato en grupos, repos públicos o perfiles cambia, 
   * el panel se refresca automáticamente.
   */
  useEffect(() => {
    if (cargandoPerfil || !esFundadorVista) return;

    const channel = supabase
      .channel(`fundador-metricas-${userId || "anon"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "grupos" }, () => {
        cargarTotalesAdminPanel();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "repositorios_publicos" }, () => {
        cargarTotalesAdminPanel();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        cargarTotalesAdminPanel();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargandoPerfil, esFundadorVista, userId]);

  // ─── 7. RENDERIZADO PRINCIPAL (JSX) ─────────────────────────────────────
  return (
    <div className="container home-container">
      
      {/* --- CABECERA --- */}
      <div className="home-header-strip">
        <button className="btn arrow-back" onClick={() => navigate("/grupos")} aria-label="Atras">
          <svg className="arrow-back-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="home-header-title-wrap">
          <div className="home-header-title">Métricas</div>
          <div className="logoDot home-header-dot" />
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {/* --- ESTADOS DE CARGA Y PERMISOS --- */}
      {cargandoPerfil ? (
        <div className="card">
          <div className="label" style={{ marginBottom: 0 }}>Cargando perfil...</div>
        </div>
      ) : !esFundadorVista ? (
        <div className="card">
          <strong>Acceso restringido</strong>
          <div className="label">Solo usuarios fundadores pueden ver métricas.</div>
          <button className="btn" onClick={() => navigate("/grupos")}>Volver</button>
        </div>
      ) : (
        <div className="card admin-stats-card" style={{ marginBottom: 12 }}>
          
          <div className="admin-stats-head">
            <strong>Panel administrativo</strong>
            <span className="admin-stats-caption">Estado general de la plataforma</span>
          </div>

          {/* Filtro de Tiempo */}
          <div className="admin-stats-filter-wrap">
            <label className="label admin-stats-filter-label">Rango de fechas</label>
            <select
              className="input admin-stats-filter-select"
              value={filtroFechaMetricas}
              onChange={e => setFiltroFechaMetricas(e.target.value)}
            >
              {FECHA_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {cargandoTotalesAdmin ? (
            <div className="label" style={{ marginBottom: 0 }}>Cargando métricas...</div>
          ) : (
            <>
              {/* Grid de Tiles (Resumen numérico) */}
              <div className="admin-stats-grid">
                <div className="admin-stat-tile">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Repositorios</span>
                    <span className="admin-stat-value">{totalesAdmin.totalRepositorios}</span>
                  </div>
                </div>

                <div className="admin-stat-tile">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Grupos</span>
                    <span className="admin-stat-value">{totalesAdmin.totalGrupos}</span>
                  </div>
                </div>

                <div className="admin-stat-tile">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Usuarios</span>
                    <span className="admin-stat-value">{totalesAdmin.totalUsuarios}</span>
                  </div>
                </div>
              </div>

              {/* Sección del Gráfico de Barras */}
              <div className="admin-bars-chart" role="img" aria-label={`Grafico de barras (${fechaMetricasLabel})`}>
                <div className="admin-bars-body">
                  
                  {/* Eje Y (Escala de números) */}
                  <div className="admin-y-axis" aria-hidden="true">
                    <span>{maxTotalAdmin}</span>
                    <span>{mitadEscalaAdmin}</span>
                    <span>0</span>
                  </div>

                  {/* Área de dibujo de barras */}
                  <div className="admin-bars-plot">
                    {/* Barra Repos */}
                    <div className="admin-bars-col">
                      <div className="admin-bars-bar-wrap">
                        <div
                          className="admin-bars-bar repos"
                          style={{ height: `${altoBarraRepos}%` }}
                        />
                      </div>
                      <div className="admin-bars-label">Repos</div>
                      <div className="admin-bars-value">{totalesAdmin.totalRepositorios}</div>
                    </div>

                    {/* Barra Grupos */}
                    <div className="admin-bars-col">
                      <div className="admin-bars-bar-wrap">
                        <div
                          className="admin-bars-bar grupos"
                          style={{ height: `${altoBarraGrupos}%` }}
                        />
                      </div>
                      <div className="admin-bars-label">Grupos</div>
                      <div className="admin-bars-value">{totalesAdmin.totalGrupos}</div>
                    </div>

                    {/* Barra Usuarios */}
                    <div className="admin-bars-col">
                      <div className="admin-bars-bar-wrap">
                        <div
                          className="admin-bars-bar usuarios"
                          style={{ height: `${altoBarraUsuarios}%` }}
                        />
                      </div>
                      <div className="admin-bars-label">Usuarios</div>
                      <div className="admin-bars-value">{totalesAdmin.totalUsuarios}</div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="label" style={{ marginBottom: 0 }}>
                Mostrando metricas: {fechaMetricasLabel}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}