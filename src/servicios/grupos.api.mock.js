/**
 * SERVICIO MOCK: Grupos API (Simulación)
 * ----------------------------------------------------------------------
 * Servicio simulado (Mock) para la gestión de grupos.
 * Utiliza localStorage del navegador en lugar de la base de datos real (Supabase)
 * para permitir el desarrollo y pruebas locales de manera rápida y segura.
 */

// ─── 1. IMPORTACIONES Y CONSTANTES ──────────────────────────────────────
import { validarNombreSinMalasPalabras } from "../utils/nameModeration";

const CLAVE_STORAGE = "flux_grupos_mock";

// ─── 2. FUNCIONES AUXILIARES (HELPERS) ──────────────────────────────────

/**
 * Obtiene la lista de grupos guardada actualmente en el localStorage.
 */
function cargarGrupos() {
  return JSON.parse(localStorage.getItem(CLAVE_STORAGE) || "[]");
}

/**
 * Sobrescribe el localStorage con la lista de grupos actualizada.
 */
function guardarGrupos(grupos) {
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(grupos));
}

/**
 * Genera un código alfanumérico aleatorio (ej. para códigos de invitación).
 */
function generarCodigo(longitud = 6) {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let resultado = "";
  for (let i = 0; i < longitud; i++) {
    resultado += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return resultado;
}

// ─── 3. SERVICIOS SIMULADOS (MOCK ENDPOINTS) ────────────────────────────

/**
 * Simula la creación de un nuevo grupo.
 * Genera IDs falsos usando crypto.randomUUID() y lo guarda en LocalStorage.
 */
export async function crearGrupo({ nombreGrupo, nombreUsuario }) {
  const grupos = cargarGrupos();
  const userId = crypto.randomUUID(); // Generamos un ID falso para el creador
  const nombreLimpio = validarNombreSinMalasPalabras(nombreGrupo, "El nombre del grupo");

  // Garantizar que el código generado sea único en nuestra base simulada
  let codigo = generarCodigo();
  while (grupos.some(g => g.codigo === codigo)) {
    codigo = generarCodigo();
  }

  // Estructura de datos simulando la respuesta relacional de Supabase
  const grupo = {
    id: crypto.randomUUID(),
    nombre: nombreLimpio,
    codigo,
    creadorId: userId,
    miembros: [{ id: crypto.randomUUID(), nombre: nombreUsuario, user_id: userId, is_admin: true }],
    actividad: [
      {
        mensaje: `${nombreUsuario} creó el grupo.`,
        fecha: new Date().toISOString(),
        actor_id: userId
      }
    ]
  };

  grupos.push(grupo);
  guardarGrupos(grupos);

  return grupo;
}

/**
 * Simula la consulta a la base de datos para previsualizar un grupo dado un código.
 */
export async function obtenerVistaPreviaPorCodigo(codigo) {
  const grupos = cargarGrupos();
  return grupos.find(
    g => g.codigo === codigo.trim().toUpperCase()
  ) || null;
}

/**
 * Simula el proceso de unirse a un grupo. 
 * Actualiza el array de miembros y el array de actividad (historial) del grupo.
 */
export async function unirseAGrupoPorCodigo({ codigo, nombreUsuario }) {
  const grupos = cargarGrupos();
  const indice = grupos.findIndex(
    g => g.codigo === codigo.trim().toUpperCase()
  );

  if (indice === -1) {
    throw new Error("El código ingresado no existe.");
  }

  const grupo = grupos[indice];

  // Verificación básica (en este mock validamos por nombre en lugar de ID de usuario)
  const existe = grupo.miembros.some(
    m => m.nombre.toLowerCase() === nombreUsuario.toLowerCase()
  );

  if (!existe) {
    // Agregar nuevo miembro
    grupo.miembros.push({
      id: crypto.randomUUID(),
      nombre: nombreUsuario,
      user_id: crypto.randomUUID(), // ID falso para el nuevo integrante
      is_admin: false
    });

    // Registrar actividad de ingreso
    grupo.actividad.unshift({
      mensaje: `${nombreUsuario} se unió al grupo.`,
      fecha: new Date().toISOString(),
      actor_id: null
    });

    // Actualizar el array general y guardar
    grupos[indice] = grupo;
    guardarGrupos(grupos);
  }

  return grupo;
}