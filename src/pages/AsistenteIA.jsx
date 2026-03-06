import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient";
import {
  listarGruposDelUsuario,
  listarTareasGrupo,
  listarRepositoriosCreados,
  listarArchivosGrupoPorId,
  listarArchivosRepositorioPublico,
  guardarMensajeChat,
  listarHistorialChat
} from "../servicios/grupos.api";
import { generarPlanEstudio, generarResumenRepositorio, chatConIA } from "../servicios/ia.api";
import "../estilos/flux.css";

const DIAS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mie" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sab" }
];

const DIAS_CAL = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mie" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sab" },
  { value: 0, label: "Dom" }
];

export default function AsistenteIA() {
  const navigate = useNavigate();
  const [tabActiva, setTabActiva] = useState("planificador");

  // ── Sesión ──────────────────────────────────────────────
  const [userId, setUserId] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [cargandoSesion, setCargandoSesion] = useState(true);

  // ── Tab Planificador ────────────────────────────────────
  const [tareasPendientes, setTareasPendientes] = useState([]);
  const [horario, setHorario] = useState([]);
  const [reposGrupos, setReposGrupos] = useState([]);
  const [cargandoContexto, setCargandoContexto] = useState(false);
  const [generandoPlan, setGenerandoPlan] = useState(false);
  const [planResultado, setPlanResultado] = useState("");
  const [errorPlan, setErrorPlan] = useState("");

  // ── Tab Resumidor ───────────────────────────────────────
  const reposPublicosRef = useRef([]);
  const [reposPublicos, setReposPublicos] = useState([]);
  const [repoSeleccionado, setRepoSeleccionado] = useState("");
  const [tipoRepoSeleccionado, setTipoRepoSeleccionado] = useState("grupo");
  const [archivosRepo, setArchivosRepo] = useState([]);
  const [cargandoArchivos, setCargandoArchivos] = useState(false);
  const [generandoResumen, setGenerandoResumen] = useState(false);
  const [resumenResultado, setResumenResultado] = useState("");
  const [errorResumen, setErrorResumen] = useState("");
  const [resumenesGuardados, setResumenesGuardados] = useState([]);
  const [cargandoResumenes, setCargandoResumenes] = useState(false);

  // ── Tab Chat ─────────────────────────────────────────────
  // Formato de mensaje: { role: "user"|"assistant", text: string }
  const [mensajesChat, setMensajesChat] = useState([]);
  const [inputChat, setInputChat] = useState("");
  const [enviandoChat, setEnviandoChat] = useState(false);
  const [errorChat, setErrorChat] = useState("");
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [chatsGuardados, setChatsGuardados] = useState([]);
  const [chatActivoId, setChatActivoId] = useState(null);
  const chatEndRef = useRef(null);
  const [renombrando, setRenombrando] = useState(null);
  const [nuevoTitulo, setNuevoTitulo] = useState("");

  // ─────────────────────────────────────────────────────────
  // Cargar sesión inicial
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      setDisplayName(session?.user?.user_metadata?.display_name || session?.user?.email || "");
      setCargandoSesion(false);
    });
  }, []);

  // ─────────────────────────────────────────────────────────
  // Cargar contexto del usuario (horario + grupos + tareas)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const cargar = async () => {
      setCargandoContexto(true);
      try {
        // Horario
        const { data: bloquesData } = await supabase
          .from("bloques_horario")
          .select("id, day_of_week, start_time, end_time, type")
          .eq("user_id", userId);

        const bloques = (bloquesData || []).map(b => ({
          id: b.id,
          dayOfWeek: b.day_of_week,
          startTime: b.start_time,
          endTime: b.end_time,
          type: b.type || ""
        }));
        setHorario(bloques);

        // Grupos + tareas pendientes
        const grupos = await listarGruposDelUsuario();
        setReposGrupos(grupos);

        const todasTareas = [];
        await Promise.all(
          grupos.map(async g => {
            try {
              const tareas = await listarTareasGrupo(g.id);
              const pendientes = (tareas || [])
                .filter(t => !t.completada)
                .map(t => ({ ...t, grupo_nombre: g.nombre }));
              todasTareas.push(...pendientes);
            } catch {
              // ignorar grupos con error
            }
          })
        );
        setTareasPendientes(todasTareas);

        // Repos públicos creados por el usuario
        const reposCreados = await listarRepositoriosCreados();
        setReposPublicos(reposCreados);
        reposPublicosRef.current = reposCreados;
      } catch (e) {
        console.error("Error cargando contexto IA:", e);
      } finally {
        setCargandoContexto(false);
      }
    };

    cargar();
  }, [userId]);

  // ─────────────────────────────────────────────────────────
  // Cargar archivos cuando se selecciona un repo
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!repoSeleccionado) {
      setArchivosRepo([]);
      return;
    }

    const cargar = async () => {
      setCargandoArchivos(true);
      setResumenResultado("");
      setErrorResumen("");
      try {
        let archivos = [];
        if (tipoRepoSeleccionado === "grupo") {
          archivos = await listarArchivosGrupoPorId({ grupoId: repoSeleccionado });
        } else {
          archivos = await listarArchivosRepositorioPublico({ repositorioId: repoSeleccionado });
        }
        setArchivosRepo(archivos);
      } catch (e) {
        setErrorResumen("No se pudieron cargar los archivos: " + e.message);
      } finally {
        setCargandoArchivos(false);
      }
    };

    cargar();
  }, [repoSeleccionado, tipoRepoSeleccionado]);

  // Cargar resúmenes guardados al entrar al tab resumidor
  useEffect(() => {
    if (tabActiva !== "resumidor" || !userId) return;
    cargarResumenes();
  }, [tabActiva, userId]);

  // Cargar historial de chat al entrar al tab de chat
  useEffect(() => {
    if (tabActiva !== "chat" || !userId) return;
    const cargar = async () => {
      setCargandoHistorial(true);
      try {
        const historial = await listarHistorialChat();
        const conversaciones = construirConversaciones(historial);
        setChatsGuardados(conversaciones);

        if (conversaciones.length > 0) {
          setChatActivoId(conversaciones[0].id);
          setMensajesChat(conversaciones[0].mensajes);
        } else {
          iniciarNuevoChat();
        }
      } catch (e) {
        console.error("Error cargando historial de chat:", e);
      } finally {
        setCargandoHistorial(false);
      }
    };
    cargar();
  }, [tabActiva, userId]);

  // Scroll al final del chat
  useEffect(() => {
    if (tabActiva === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajesChat, tabActiva]);

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────
  async function cargarResumenes() {
    setCargandoResumenes(true);
    try {
      const { data, error } = await supabase
        .from("ia_resumenes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      setResumenesGuardados(data || []);
    } catch (e) {
      console.error("Error cargando resúmenes:", e);
    } finally {
      setCargandoResumenes(false);
    }
  }

  function getNombreRepo(id, tipo) {
    if (tipo === "grupo") {
      return reposGrupos.find(g => g.id === id)?.nombre || id;
    }
    return reposPublicosRef.current.find(r => r.id === id)?.titulo || id;
  }

  // contextoUsuario estructurado para el chat
  function buildContextoUsuario() {
    return {
      nombreUsuario: displayName,
      grupos: reposGrupos.map(g => g.nombre),
      horario: horario.map(b => {
        const dia = DIAS.find(d => d.value === b.dayOfWeek)?.label || "?";
        return `${dia} ${b.startTime}-${b.endTime} (${b.type || "Clase"})`;
      }),
      tareasPendientes: tareasPendientes.map(t => t.titulo)
    };
  }

  function crearChatId() {
    return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getTituloPersonalizado(id) {
    try { return localStorage.getItem(`flux_chat_titulo_${id}`) || null; } catch { return null; }
  }

  function guardarTituloPersonalizado(id, titulo) {
    try { localStorage.setItem(`flux_chat_titulo_${id}`, titulo); } catch {}
  }

  function crearTituloChat(texto = "") {
    const limpio = `${texto}`.trim().replace(/\s+/g, " ");
    if (!limpio) return "Chat sin título";
    return limpio.length > 48 ? `${limpio.slice(0, 48)}...` : limpio;
  }

  function construirConversaciones(historial = []) {
    const porChat = new Map();
    const ordenado = [...historial].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const item of ordenado) {
      const id = item.chat_id || "legacy";
      if (!porChat.has(id)) {
        porChat.set(id, {
          id,
          titulo: getTituloPersonalizado(id) || crearTituloChat(item.mensaje_usuario),
          updatedAt: item.created_at,
          mensajes: []
        });
      }

      const chat = porChat.get(id);
      chat.mensajes.push({ role: "user", text: item.mensaje_usuario });
      chat.mensajes.push({ role: "assistant", text: item.respuesta_ia });
      chat.updatedAt = item.created_at;
    }

    return [...porChat.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  function upsertConversacionLocal({ id, mensajes, updatedAt, tituloBase = "" }) {
    setChatsGuardados(prev => {
      const base = prev.filter(c => c.id !== id);
      const existente = prev.find(c => c.id === id);
      const conv = {
        id,
        titulo: existente?.titulo || getTituloPersonalizado(id) || crearTituloChat(tituloBase),
        updatedAt: updatedAt || new Date().toISOString(),
        mensajes
      };
      return [conv, ...base].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  }

  function iniciarNuevoChat() {
    const id = crearChatId();
    setChatActivoId(id);
    setMensajesChat([]);
    setErrorChat("");
  }

  function seleccionarChat(id) {
    const chat = chatsGuardados.find(c => c.id === id);
    if (!chat) return;
    setChatActivoId(id);
    setMensajesChat(chat.mensajes);
    setErrorChat("");
    setRenombrando(null);
  }

  function confirmarRenombre(id) {
    const titulo = nuevoTitulo.trim();
    if (!titulo) { setRenombrando(null); return; }
    guardarTituloPersonalizado(id, titulo);
    setChatsGuardados(prev => prev.map(c => c.id === id ? { ...c, titulo } : c));
    setRenombrando(null);
    setNuevoTitulo("");
  }

  function manejarTeclasRenombre(e, id) {
    if (e.key === "Enter") { e.preventDefault(); confirmarRenombre(id); }
    if (e.key === "Escape") { setRenombrando(null); setNuevoTitulo(""); }
  }

  function formatearFechaChat(fecha) {
    if (!fecha) return "";
    return new Date(fecha).toLocaleDateString();
  }

  // ─────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────
  async function manejarGenerarPlan() {
    setErrorPlan("");
    setPlanResultado("");
    setGenerandoPlan(true);
    try {
      const resultado = await generarPlanEstudio({ tareas: tareasPendientes, horario });
      setPlanResultado(resultado);
    } catch (e) {
      setErrorPlan(e.message);
    } finally {
      setGenerandoPlan(false);
    }
  }

  async function manejarGenerarResumen() {
    if (!repoSeleccionado) return;
    setErrorResumen("");
    setResumenResultado("");
    setGenerandoResumen(true);
    try {
      const nombreRepo = getNombreRepo(repoSeleccionado, tipoRepoSeleccionado);
      const resumen = await generarResumenRepositorio({ nombreRepo, archivos: archivosRepo });
      setResumenResultado(resumen);

      // Guardar en Supabase
      await supabase.from("ia_resumenes").insert({
        user_id: userId,
        repositorio_tipo: tipoRepoSeleccionado,
        repositorio_id: repoSeleccionado,
        repositorio_nombre: nombreRepo,
        resumen
      });
      await cargarResumenes();
    } catch (e) {
      setErrorResumen(e.message);
    } finally {
      setGenerandoResumen(false);
    }
  }

  async function manejarEnviarChat() {
    const texto = inputChat.trim();
    if (!texto || enviandoChat) return;

    const chatIdActual = chatActivoId || crearChatId();
    if (!chatActivoId) setChatActivoId(chatIdActual);

    const nuevoMensajeUsuario = { role: "user", text: texto };
    const mensajesActualizados = [...mensajesChat, nuevoMensajeUsuario];
    setMensajesChat(mensajesActualizados);
    setInputChat("");
    setEnviandoChat(true);
    setErrorChat("");
    upsertConversacionLocal({
      id: chatIdActual,
      mensajes: mensajesActualizados,
      updatedAt: new Date().toISOString(),
      tituloBase: texto
    });

    try {
      const respuesta = await chatConIA({
        mensajes: mensajesActualizados,
        contextoUsuario: buildContextoUsuario()
      });
      const nuevoMensajeIA = { role: "assistant", text: respuesta };
      const mensajesFinales = [...mensajesActualizados, nuevoMensajeIA];
      setMensajesChat(mensajesFinales);
      upsertConversacionLocal({
        id: chatIdActual,
        mensajes: mensajesFinales,
        updatedAt: new Date().toISOString(),
        tituloBase: texto
      });

      // Persistir en Supabase (no bloquea la UI si falla)
      guardarMensajeChat({ mensajeUsuario: texto, respuestaIA: respuesta, chatId: chatIdActual }).catch(
        e => console.error("Error guardando chat:", e)
      );
    } catch (e) {
      setErrorChat(e.message);
    } finally {
      setEnviandoChat(false);
    }
  }

  function manejarTeclasChat(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      manejarEnviarChat();
    }
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  if (cargandoSesion) {
    return (
      <div className="container">
        <div className="card">Cargando...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="container">
        <div className="card">
          <p>Inicia sesión para acceder al asistente IA.</p>
          <button className="btn btnPrimary" onClick={() => navigate("/auth")}>
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Topbar */}
      <div className="topbar">
        <div className="brand">
          <div className="logoDot" />
          <div>
            <div className="brandTitle">FLUX</div>
            <div className="brandSubtitle">Asistente IA</div>
          </div>
        </div>
        <button
          className="btn arrow-back"
          style={{ marginTop: 0 }}
          onClick={() => navigate(-1)}
          aria-label="Atrás"
        >
          <svg
            className="arrow-back-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {cargandoContexto && (
        <div className="card" style={{ textAlign: "center", color: "var(--primario)" }}>
          Cargando tus datos...
        </div>
      )}

      {/* Tabs */}
      <div className="group-tabs">
        <button
          className={`group-tab ${tabActiva === "planificador" ? "active" : ""}`}
          onClick={() => setTabActiva("planificador")}
        >
          Planificador
        </button>
        <button
          className={`group-tab ${tabActiva === "resumidor" ? "active" : ""}`}
          onClick={() => setTabActiva("resumidor")}
        >
          Resumidor
        </button>
        <button
          className={`group-tab ${tabActiva === "chat" ? "active" : ""}`}
          onClick={() => setTabActiva("chat")}
        >
          Chat libre
        </button>
      </div>

      {/* ── TAB 1: Planificador ── */}
      {tabActiva === "planificador" && (
        <div className="group-tab-content">
          <div className="card">
            <strong>Tareas pendientes</strong>
            {tareasPendientes.length === 0 ? (
              <p className="label" style={{ marginTop: 8 }}>
                No tienes tareas pendientes en ningún grupo.
              </p>
            ) : (
              <ul className="ia-lista" style={{ marginTop: 8 }}>
                {tareasPendientes.map(t => (
                  <li key={t.id} className="ia-lista-item">
                    <span className="ia-lista-dot" />
                    <span>
                      <strong>{t.titulo}</strong>
                      <span className="label" style={{ marginLeft: 6 }}>({t.grupo_nombre})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <strong>Tu horario semanal</strong>
            {horario.length === 0 ? (
              <p className="label" style={{ marginTop: 8 }}>
                Sin horario definido. Agrégalo en{" "}
                <button
                  className="btn"
                  style={{ display: "inline", padding: "0 4px", minHeight: "auto" }}
                  onClick={() => navigate("/perfil/editar")}
                >
                  Editar perfil
                </button>
                .
              </p>
            ) : (
              <div className="ia-calendario-semana">
                {DIAS_CAL.map(dia => {
                  const bloquesDia = horario
                    .filter(b => b.dayOfWeek === dia.value)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));
                  return (
                    <div key={dia.value} className={`ia-cal-columna ${bloquesDia.length ? "tiene-bloques" : ""}`}>
                      <div className="ia-cal-dia-header">{dia.label}</div>
                      {bloquesDia.length === 0 ? (
                        <div className="ia-cal-vacio">—</div>
                      ) : (
                        bloquesDia.map(b => (
                          <div key={b.id} className="ia-cal-bloque">
                            <span className="ia-cal-hora">{b.startTime}–{b.endTime}</span>
                            {b.type && <span className="ia-cal-tipo">{b.type}</span>}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {errorPlan && (
            <div className="alert alert-error" style={{ marginTop: 12 }}>
              {errorPlan}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <button
              className="btn btnPrimary"
              onClick={manejarGenerarPlan}
              disabled={generandoPlan || cargandoContexto}
            >
              {generandoPlan ? "Generando plan..." : "✨ Generar plan de estudio"}
            </button>
          </div>

          {planResultado && (
            <div className="card ia-resultado" style={{ marginTop: 16 }}>
              <strong style={{ display: "block", marginBottom: 8 }}>Plan generado</strong>
              <pre className="ia-pre">{planResultado}</pre>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Resumidor ── */}
      {tabActiva === "resumidor" && (
        <div className="group-tab-content">
          <div className="card">
            <strong>Selecciona un repositorio</strong>
            <div className="ia-repo-picker">
              {reposGrupos.length === 0 && reposPublicos.length === 0 && (
                <p className="label">No tienes grupos ni repositorios aún.</p>
              )}
              {reposGrupos.length > 0 && (
                <div className="ia-repo-seccion">
                  <div className="label ia-repo-seccion-label">Mis grupos</div>
                  <div className="ia-repo-grid">
                    {reposGrupos.map(g => (
                      <button
                        key={g.id}
                        className={`ia-repo-card ${repoSeleccionado === g.id && tipoRepoSeleccionado === "grupo" ? "selected" : ""}`}
                        onClick={() => { setTipoRepoSeleccionado("grupo"); setRepoSeleccionado(g.id); }}
                      >
                        <span className="ia-repo-icono">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </span>
                        <span className="ia-repo-nombre">{g.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {reposPublicos.length > 0 && (
                <div className="ia-repo-seccion">
                  <div className="label ia-repo-seccion-label">Mis repositorios públicos</div>
                  <div className="ia-repo-grid">
                    {reposPublicos.map(r => (
                      <button
                        key={r.id}
                        className={`ia-repo-card ${repoSeleccionado === r.id && tipoRepoSeleccionado === "publico" ? "selected" : ""}`}
                        onClick={() => { setTipoRepoSeleccionado("publico"); setRepoSeleccionado(r.id); }}
                      >
                        <span className="ia-repo-icono">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        </span>
                        <span className="ia-repo-nombre">{r.titulo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {cargandoArchivos && (
              <p className="label" style={{ marginTop: 8 }}>Cargando archivos...</p>
            )}

            {repoSeleccionado && !cargandoArchivos && (
              <div style={{ marginTop: 12 }}>
                <p className="label">
                  <strong>Archivos ({archivosRepo.length})</strong>
                </p>
                {archivosRepo.length === 0 ? (
                  <p className="label">Este repositorio no tiene archivos aún.</p>
                ) : (
                  <ul className="ia-lista" style={{ marginTop: 6 }}>
                    {archivosRepo.map((a, i) => (
                      <li key={a.id || i} className="ia-lista-item">
                        <span className="ia-lista-dot" />
                        <span>{a.nombre || a.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {errorResumen && (
              <div className="alert alert-error" style={{ marginTop: 12 }}>
                {errorResumen}
              </div>
            )}

            {repoSeleccionado && !cargandoArchivos && (
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn btnPrimary"
                  onClick={manejarGenerarResumen}
                  disabled={generandoResumen}
                >
                  {generandoResumen ? "Generando resumen..." : "✨ Generar resumen con IA"}
                </button>
              </div>
            )}

            {resumenResultado && (
              <div className="ia-resultado" style={{ marginTop: 16 }}>
                <strong style={{ display: "block", marginBottom: 8 }}>Resumen generado</strong>
                <pre className="ia-pre">{resumenResultado}</pre>
              </div>
            )}
          </div>

          {/* Resúmenes anteriores */}
          <div className="card" style={{ marginTop: 12 }}>
            <strong>Resúmenes anteriores</strong>
            {cargandoResumenes ? (
              <p className="label" style={{ marginTop: 8 }}>Cargando...</p>
            ) : resumenesGuardados.length === 0 ? (
              <p className="label" style={{ marginTop: 8 }}>
                No hay resúmenes guardados aún.
              </p>
            ) : (
              <div style={{ marginTop: 8 }}>
                {resumenesGuardados.map(r => (
                  <details key={r.id} className="ia-resumen-item">
                    <summary className="ia-resumen-summary">
                      <span>
                        {r.repositorio_nombre || getNombreRepo(r.repositorio_id, r.repositorio_tipo)}
                      </span>
                      <span className="label">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </summary>
                    <pre className="ia-pre ia-pre-small">{r.resumen}</pre>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Chat libre ── */}
      {tabActiva === "chat" && (
        <div className="group-tab-content">
          <div className="card">
            <div className="ia-chat-sesiones-head">
              <strong>Chats guardados</strong>
              <button className="btn btn-secundario ia-chat-nuevo-btn" onClick={iniciarNuevoChat}>
                + Nuevo chat
              </button>
            </div>

            {cargandoHistorial ? (
              <p className="label" style={{ marginTop: 8 }}>Cargando historial...</p>
            ) : chatsGuardados.length === 0 ? (
              <p className="label" style={{ marginTop: 8 }}>Aún no tienes chats guardados.</p>
            ) : (
              <div className="ia-chat-sesiones-lista" style={{ marginTop: 8 }}>
                {chatsGuardados.map(c => (
                  <div
                    key={c.id}
                    className={`ia-chat-sesion-item ${chatActivoId === c.id ? "active" : ""}`}
                  >
                    {renombrando === c.id ? (
                      <div className="ia-chat-renombrar">
                        <input
                          className="input"
                          value={nuevoTitulo}
                          onChange={e => setNuevoTitulo(e.target.value)}
                          onKeyDown={e => manejarTeclasRenombre(e, c.id)}
                          autoFocus
                          placeholder="Nombre del chat..."
                        />
                        <button className="btn ia-rename-ok" onClick={() => confirmarRenombre(c.id)}>✓</button>
                        <button className="btn ia-rename-cancel" onClick={() => { setRenombrando(null); setNuevoTitulo(""); }}>✕</button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="ia-chat-sesion-btn-inner"
                          onClick={() => seleccionarChat(c.id)}
                        >
                          <span className="ia-chat-sesion-titulo">{c.titulo}</span>
                          <span className="label">{formatearFechaChat(c.updatedAt)}</span>
                        </button>
                        <button
                          className="btn ia-rename-btn"
                          title="Renombrar chat"
                          onClick={e => { e.stopPropagation(); setRenombrando(c.id); setNuevoTitulo(c.titulo); }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card chat-card">
            <div className="chat-header">
              <strong>Chat con FLUX IA</strong>
              <span className="label">Pregúntame sobre tus grupos, tareas o repositorios</span>
            </div>

            <div className="ia-chat-messages">
              {cargandoHistorial && (
                <p className="label" style={{ textAlign: "center", padding: 16 }}>
                  Cargando historial...
                </p>
              )}
              {!cargandoHistorial && mensajesChat.length === 0 && (
                <div className="ia-chat-empty">
                  <span>✨</span>
                  <p>
                    ¡Hola{displayName ? `, ${displayName.split(" ")[0]}` : ""}! Soy FLUX IA.
                    Puedes preguntarme sobre tus tareas, horario o repositorios.
                  </p>
                </div>
              )}
              {mensajesChat.map((m, i) => (
                <div
                  key={i}
                  className={`ia-chat-bubble ${m.role === "user" ? "ia-bubble-user" : "ia-bubble-ia"}`}
                >
                  <pre className="ia-pre ia-pre-chat">{m.text}</pre>
                </div>
              ))}
              {enviandoChat && (
                <div className="ia-chat-bubble ia-bubble-ia">
                  <span className="ia-typing">Escribiendo...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {errorChat && (
              <div className="alert alert-error" style={{ marginTop: 8 }}>
                {errorChat}
              </div>
            )}

            <div className="chat-input" style={{ marginTop: 12 }}>
              <textarea
                className="input"
                rows={2}
                value={inputChat}
                onChange={e => setInputChat(e.target.value)}
                onKeyDown={manejarTeclasChat}
                placeholder="Escribe tu pregunta... (Enter para enviar)"
                disabled={enviandoChat}
              />
              <button
                className="btn btnPrimary"
                onClick={manejarEnviarChat}
                disabled={enviandoChat || !inputChat.trim()}
              >
                {enviandoChat ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
