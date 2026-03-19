import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  eliminarRepositorioPublico,
  eliminarArchivoRepositorioPublico,
  guardarCalificacionRepositorioPublico,
  agregarColaboradorPorEmail,
  eliminarColaboradorRepositorioPublico,
  listarArchivosRepositorioPublico,
  listarColaboradoresRepositorioPublico,
  obtenerMiCalificacionRepositorioPublico,
  obtenerPromedioRepositorioPublico,
  obtenerRepositorioPublicoPorId,
  salirRepositorioPublico,
  subirArchivoRepositorioPublico,
  toggleFavoritoRepositorio,
  isRepositorioFavorito
} from "../servicios/grupos.api";
import { supabase } from "../config/supabaseClient";
import Estrellas from "../components/Estrellas";
import ModalQR from "../components/ModalQR"; // Importación del QR
import "../estilos/flux.css";

export default function RepositorioPublicoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [isFavorito, setIsFavorito] = useState(false);
  const [actividad, setActividad] = useState([]);
  const [archivosSeleccionados, setArchivosSeleccionados] = useState([]);
  const [nuevoAnuncio, setNuevoAnuncio] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mensajeColaboradores, setMensajeColaboradores] = useState("");
  const [esCreador, setEsCreador] = useState(false);
  const [esColaborador, setEsColaborador] = useState(false);
  const [colaboradores, setColaboradores] = useState([]);
  const [emailColaborador, setEmailColaborador] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [ratingPromedio, setRatingPromedio] = useState(0);
  const [ratingTotal, setRatingTotal] = useState(0);
  const [miRating, setMiRating] = useState("");
  const [guardandoRating, setGuardandoRating] = useState(false);
  
  // ESTADOS PARA EL QR Y LA INVITACIÓN
  const [mostrarQR, setMostrarQR] = useState(false);
  const [mostrarPopUpUnirse, setMostrarPopUpUnirse] = useState(false);

  const inputRef = useRef(null);
  const esEditor = esCreador || esColaborador;
  const [tabActiva, setTabActiva] = useState("info");

  // EFECTO: Detectar si el usuario escaneó el QR (?invitacion=true)
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get("invitacion") === "true") {
      setMostrarPopUpUnirse(true);
    }
  }, []);

  async function cargarArchivos(repoId) {
    if (!repoId) {
      setArchivos([]);
      return;
    }
    const data = await listarArchivosRepositorioPublico({ repositorioId: repoId });
    setArchivos(data);
  }

  async function cargarRatings(repoId) {
    if (!repoId) {
      setRatingPromedio(0);
      setRatingTotal(0);
      setMiRating("");
      return;
    }
    const [promedio, miCalificacion] = await Promise.all([
      obtenerPromedioRepositorioPublico({ repositorioId: repoId }),
      obtenerMiCalificacionRepositorioPublico({ repositorioId: repoId })
    ]);
    setRatingPromedio(promedio?.ratingPromedio || 0);
    setRatingTotal(promedio?.ratingTotal || 0);
    setMiRating(miCalificacion ? String(miCalificacion) : "");
  }

  async function cargarColaboradores(repoId, uid) {
    if (!repoId || !uid) {
      setColaboradores([]);
      setEsColaborador(false);
      return;
    }
    try {
      const data = await listarColaboradoresRepositorioPublico({ repositorioId: repoId });
      setColaboradores(data);
      setEsColaborador(data.some(c => c.user_id === uid));
    } catch (e) {
      console.warn("No se pudieron cargar colaboradores:", e.message);
      setColaboradores([]);
      setEsColaborador(false);
    }
  }

  useEffect(() => {
    (async () => {
      setCargando(true);
      setError("");
      try {
        const data = await obtenerRepositorioPublicoPorId(id);
        setRepo(data);
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id || null;
        setUserId(uid);
        setEsCreador(Boolean(uid && data?.creador_id && uid === data.creador_id));
        
        await Promise.all([
          cargarArchivos(data?.id),
          cargarRatings(data?.id),
          cargarColaboradores(data?.id, uid),
          cargarActividad(data?.id)
        ]);

        try {
          const fav = await isRepositorioFavorito(data?.id);
          setIsFavorito(Boolean(fav));
        } catch (e) {
          console.warn("Error checking favorite:", e.message);
        }
      } catch (e) {
        setError(e.message);
        setRepo(null);
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  async function cargarActividad(repoId) {
    if (!repoId) return;
    try {
      const { data, error } = await supabase
        .from("repositorio_publico_actividad")
        .select("mensaje, fecha, actor_id")
        .eq("repositorio_id", repoId)
        .order("fecha", { ascending: false });
      if (error) throw error;
      setActividad(data || []);
    } catch (e) {
      console.warn("No se pudo cargar actividad:", e.message);
    }
  }

  async function publicarAnuncio() {
    if (!repo?.id || !esCreador || !nuevoAnuncio.trim()) return;
    try {
      const { error } = await supabase.from("repositorio_publico_actividad").insert({
        repositorio_id: repo.id,
        actor_id: userId,
        mensaje: `ANUNCIO::${nuevoAnuncio.trim()}`
      });
      if (error) throw error;
      setNuevoAnuncio("");
      await cargarActividad(repo.id);
    } catch (e) {
      setMensaje(`Error: ${e.message}`);
    }
  }

  const manejarArchivos = files => {
    const archivosValidos = Array.from(files || []).filter(file => file.size <= 20 * 1024 * 1024);
    setArchivosSeleccionados(archivosValidos);
  };

  async function manejarSubirArchivos() {
    if (!repo?.id || !esEditor || !archivosSeleccionados.length) return;
    setSubiendo(true);
    try {
      for (const archivo of archivosSeleccionados) {
        await subirArchivoRepositorioPublico({ repositorioId: repo.id, archivo });
      }
      setArchivosSeleccionados([]);
      await cargarArchivos(repo.id);
      setMensaje("¡Subida completada!");
    } catch (e) {
      setMensaje(`Error: ${e.message}`);
    } finally {
      setSubiendo(false);
    }
  }

  async function manejarEliminarArchivo(archivo) {
    if (!repo?.id || !archivo?.id || !esEditor) return;
    try {
      await eliminarArchivoRepositorioPublico({
        repositorioId: repo.id,
        archivoId: archivo.id,
        path: archivo.path
      });
      await cargarArchivos(repo.id);
    } catch (e) {
      setMensaje(`Error: ${e.message}`);
    }
  }

  async function manejarAgregarColaborador() {
    const correo = emailColaborador.trim();
    if (!repo?.id || !esCreador || !correo) return;
    try {
      await agregarColaboradorPorEmail({ repositorioId: repo.id, email: correo });
      setEmailColaborador("");
      await cargarColaboradores(repo.id, userId);
    } catch (e) {
      setMensajeColaboradores(`Error: ${e.message}`);
    }
  }

  async function manejarUnirsePorInvitacion() {
    if (!repo?.id) return;
    if (!userId) {
      alert("Debes iniciar sesión para poder unirte a este repositorio.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const emailUsuario = session?.user?.email;

      const { error } = await supabase
        .from("repositorio_publico_colaboradores") 
        .insert({
          repositorio_id: repo.id,
          user_id: userId,
          email: emailUsuario
        });

      if (error && error.code !== '23505') throw error;

      // ACCIONES DE ÉXITO:
      setMostrarPopUpUnirse(false); 
      window.history.replaceState(null, "", window.location.pathname); // Limpiar URL
      await cargarColaboradores(repo.id, userId); // Refrescar permisos
      setTabActiva("archivos"); // Redirigir a archivos automáticamente
      setMensajeColaboradores("¡Te has unido exitosamente!");

    } catch (e) {
      alert(`Aviso: ${e.message}`);
      setMostrarPopUpUnirse(false);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  async function manejarCalificar(valorNota) {
    if (!repo?.id || !userId) return;
    setMiRating(valorNota);
    setGuardandoRating(true);
    try {
      await guardarCalificacionRepositorioPublico({ repositorioId: repo.id, rating: Number(valorNota) });
      await cargarRatings(repo.id);
    } finally {
      setGuardandoRating(false);
    }
  }

  if (cargando) return <div className="container"><div className="card">Cargando...</div></div>;
  if (!repo) return <div className="container"><div className="card">No encontrado</div></div>;

  return (
    <div className="container">
      {/* Banner Superior */}
      <div className="group-banner" style={{ "--banner-a": "#6c757d", "--banner-b": "#343a40" }}>
        <div className="group-banner-content group-banner-single">
          <button className="btn arrow-back group-back-btn" onClick={() => navigate("/grupos")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{width:20}}><path d="M15 6L9 12L15 18" /></svg>
          </button>
          <div className="group-banner-main">
            <div className="group-banner-title">{repo.titulo}</div>
            <div className="group-banner-subtitle">Público · {repo.creador_nombre}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setMostrarQR(true)}>📱 QR</button>
          </div>
        </div>
      </div>

      {/* Navegación de Pestañas */}
      <div className="group-tabs">
        <button className={`group-tab ${tabActiva === "info" ? "active" : ""}`} onClick={() => setTabActiva("info")}>Info</button>
        <button className={`group-tab ${tabActiva === "archivos" ? "active" : ""}`} onClick={() => setTabActiva("archivos")}>Archivos</button>
        <button className={`group-tab ${tabActiva === "people" ? "active" : ""}`} onClick={() => setTabActiva("people")}>Personas</button>
      </div>

      {/* Contenido Dinámico */}
      {tabActiva === "info" && (
        <div className="group-tab-content">
          <div className="card">
            <strong>{repo.titulo}</strong>
            <p className="label">Promedio: {Number(ratingPromedio).toFixed(1)}/5 ({ratingTotal} votos)</p>
            <div style={{ marginTop: 20 }}>
              <Estrellas alCalificar={manejarCalificar} />
              {guardandoRating && <p style={{fontSize:12}}>Guardando...</p>}
            </div>
          </div>
        </div>
      )}

      {tabActiva === "archivos" && (
        <div className="group-tab-content">
          {esEditor && (
            <div className="card repo-card">
              <div className="drop-area" onClick={() => inputRef.current?.click()}>
                {archivosSeleccionados.length > 0 ? `${archivosSeleccionados.length} listos` : "Toca para subir archivos"}
              </div>
              <input ref={inputRef} type="file" multiple hidden onChange={e => manejarArchivos(e.target.files)} />
              <button className="btn btnPrimary" onClick={manejarSubirArchivos} disabled={subiendo} style={{marginTop:10}}>
                {subiendo ? "Subiendo..." : "Subir ahora"}
              </button>
            </div>
          )}
          <div className="archivos-grid">
            {archivos.map(file => (
              <div key={file.id} className="archivo-card">
                <div className="archivo-info">
                  <span className="archivo-nombre">{file.nombre}</span>
                </div>
                {esEditor && <button className="btn" onClick={() => manejarEliminarArchivo(file)}>Eliminar</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tabActiva === "people" && (
        <div className="group-tab-content">
          <div className="card">
            <strong>Integrantes</strong>
            <ul className="miembros-scroll">
              {colaboradores.map(c => (
                <li key={c.user_id} className="member-row">
                  <span className="member-item-name">{c.email}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Modales */}
      <ModalQR 
        isOpen={mostrarQR} 
        onClose={() => setMostrarQR(false)} 
        url={`${window.location.origin}${window.location.pathname}?invitacion=true`} 
        titulo={repo.titulo} 
      />

      {mostrarPopUpUnirse && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "white", padding: 30, borderRadius: 12, textAlign: "center", maxWidth: 350 }}>
            <h3>¡Invitación Recibida!</h3>
            <p>¿Quieres unirte como colaborador a <b>{repo.titulo}</b>?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
              <button onClick={() => { setMostrarPopUpUnirse(false); window.history.replaceState(null, "", window.location.pathname); }} className="btn">Cancelar</button>
              <button onClick={manejarUnirsePorInvitacion} className="btn btnPrimary" style={{background: "#007bff", color: "white"}}>Sí, unirme</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}