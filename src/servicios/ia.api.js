/**
 * ==========================================================================
 * FLUX APP - SERVICIO DE INTELIGENCIA ARTIFICIAL (GEMINI)
 * ==========================================================================
 * Este archivo centraliza la comunicación con la API de Google Gemini.
 * Gestiona el System Prompt, la limpieza de Markdown, las peticiones HTTP
 * de texto plano y el procesamiento multimodal (lectura de archivos PDF/Imágenes
 * desde Supabase Storage convertidos a Base64).
 * * ÍNDICE:
 * 1. CONSTANTES Y CONFIGURACIÓN (System Prompt)
 * 2. HELPERS DE TEXTO Y CONEXIÓN
 * 3. HELPERS DE STORAGE Y MULTIMODALIDAD
 * 4. ENDPOINTS EXPORTADOS (Planificador, Resumen, Chat)
 * ==========================================================================
 */

import { supabase } from "../config/supabaseClient";

const devLog = import.meta.env.DEV
  ? { log: console.log.bind(console), warn: console.warn.bind(console), error: console.error.bind(console) }
  : { log: () => {}, warn: () => {}, error: () => {} };

/* ==========================================================================
   1. CONSTANTES Y CONFIGURACIÓN
   ========================================================================== */

const SYSTEM_PROMPT = `
Eres FLUX IA, un asistente académico inteligente para estudiantes
de la Universidad Metropolitana (Unimet).

Tu rol es ayudar a los estudiantes a:
1. Organizar su tiempo de estudio según su horario semanal disponible
2. Gestionar y priorizar sus tareas académicas pendientes
3. Responder preguntas sobre sus materias y recursos disponibles

Reglas que debes seguir siempre:
- Responde siempre en español
- Sé conciso, claro y motivador
- Habla en primera persona cuando te refieras a ti (usa "yo")
- No te refieras a ti como "PROYECTOFLUX" ni en tercera persona
- Usa saltos de línea y emojis para hacer las respuestas más legibles
- Cuando generes un plan de estudio, siempre indica el día, hora y duración sugerida
- Si el estudiante no tiene tareas, sugiérele cómo aprovechar mejor la plataforma
- Nunca inventes información sobre materias o contenidos que no te hayan dado como contexto
- Trata siempre al estudiante de "tú" y con un tono amigable pero profesional

FORMATO OBLIGATORIO — DEBES cumplir esto siempre:
- PROHIBIDO usar asteriscos (* o **) para nada, ni para negritas ni para listas
- PROHIBIDO usar almohadillas (#, ##, ###) como encabezados
- PROHIBIDO usar guiones bajos (_) para cursivas
- Para listas usa números (1. 2. 3.) o viñetas con guión simple y espacio (- elemento)
- Para resaltar algo importante escríbelo en MAYÚSCULAS o entre comillas
- Escribe en prosa natural con párrafos separados por líneas en blanco
`;

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

// Tipos de archivo que Gemini puede leer nativamente como inlineData
const MIME_SOPORTADOS_GEMINI = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/gif"
]);


/* ==========================================================================
   2. HELPERS DE TEXTO Y CONEXIÓN BÁSICA
   ========================================================================== */

function getApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("No se encontró VITE_GEMINI_API_KEY en el .env");
  return key;
}

function getModel() {
  return import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

/**
 * Elimina la sintaxis Markdown de la respuesta de la IA para presentar
 * texto plano y limpio en la interfaz de usuario.
 */
function limpiarMarkdown(texto = "") {
  return texto
    // Negritas y cursivas: **texto**, *texto*, __texto__, _texto_
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Encabezados: ## Título → Título
    .replace(/^#{1,6}\s+/gm, "")
    // Asterisco suelto al inicio de línea (lista markdown) → guión
    .replace(/^\*\s+/gm, "- ")
    // Código inline: `texto` → texto
    .replace(/`([^`]+)`/g, "$1")
    // Líneas horizontales: --- o *** o ___
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Espacios múltiples al final de línea
    .replace(/ +$/gm, "")
    .trim();
}

/**
 * Realiza una petición estándar de texto (Prompt) a la API de Gemini.
 */
async function llamarGemini(userPrompt, { maxOutputTokens = 3000, temperature = 0.7 } = {}) {
  const apiKey = getApiKey();
  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [
        {
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens,
        temperature
      }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al contactar la IA (${response.status})`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  // Detectar si la respuesta fue cortada por límite de tokens
  if (candidate?.finishReason === "MAX_TOKENS") {
    devLog.warn("[FLUX IA] La respuesta fue cortada por límite de tokens. Considera aumentar maxOutputTokens.");
  }

  const texto = candidate?.content?.parts?.[0]?.text;
  if (!texto) throw new Error("La IA no generó una respuesta. Intenta de nuevo.");
  return limpiarMarkdown(texto);
}


/* ==========================================================================
   3. HELPERS DE STORAGE Y MULTIMODALIDAD
   ========================================================================== */

/**
 * Infiere el MIME type desde la extensión del archivo como fallback
 * si la base de datos no lo proporciona.
 */
function inferirMimePorExtension(nombre = "") {
  const ext = (nombre.split(".").pop() || "").toLowerCase();
  const map = {
    pdf:  "application/pdf",
    png:  "image/png",
    jpg:  "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif:  "image/gif",
    heic: "image/heic"
  };
  return map[ext] || "";
}

/**
 * Genera una URL firmada temporal de Supabase Storage 
 * (Requerido para leer archivos si el bucket no es 100% público).
 */
async function obtenerUrlFirmada(path) {
  if (!path) return null;
  try {
    const { data, error } = await supabase.storage
      .from("Flux_repositorioGrupos")
      .createSignedUrl(path, 120); // válida por 2 minutos
      
    if (error || !data?.signedUrl) {
      devLog.error("[FLUX IA] Error creando URL firmada para", path, error);
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    devLog.error("[FLUX IA] Excepción en obtenerUrlFirmada:", e);
    return null;
  }
}

/**
 * Descarga un archivo desde Supabase usando la URL firmada y lo convierte a Base64.
 * Esencial para enviar documentos a Gemini a través del atributo `inlineData`.
 */
async function descargarComoBase64(path, mimeType) {
  try {
    const url = await obtenerUrlFirmada(path);
    if (!url) return null;

    const res = await fetch(url);
    if (!res.ok) {
      devLog.error("[FLUX IA] Fetch falló para", path, res.status, res.statusText);
      return null;
    }
    
    // Ignorar archivos mayores a 15 MB para evitar timeouts o bloqueos de la API
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 15 * 1024 * 1024) {
      devLog.warn("[FLUX IA] Archivo demasiado grande, omitiendo:", path);
      return null;
    }
    
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const chunks = [];
    const CHUNK = 8192;
    
    for (let i = 0; i < bytes.length; i += CHUNK) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
    }
    
    devLog.log("[FLUX IA] Archivo descargado OK:", path, `(${(bytes.length / 1024).toFixed(1)} KB)`);
    return { base64: btoa(chunks.join("")), mimeType };
  } catch (e) {
    devLog.error("[FLUX IA] Error descargando archivo:", path, e);
    return null;
  }
}

/**
 * Llama a Gemini enviando un payload Multimodal (Texto + Archivos codificados en Base64).
 */
async function llamarGeminiMultimodal(parts, { maxOutputTokens = 6000, temperature = 0.6 } = {}) {
  const apiKey = getApiKey();
  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts }],
      generationConfig: { maxOutputTokens, temperature }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al contactar la IA (${response.status})`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  if (candidate?.finishReason === "MAX_TOKENS") {
    devLog.warn("[FLUX IA] Resumen cortado por límite de tokens.");
  }

  // Gemini puede responder en múltiples partes: unir todo el texto
  const texto = (candidate?.content?.parts || [])
    .map(p => p.text || "")
    .join("")
    .trim();

  if (!texto) {
    // Diagnóstico detallado para detectar bloqueos de seguridad de Google
    const razon = candidate?.finishReason || "sin candidatos";
    const bloqueo = data.promptFeedback?.blockReason || "";
    devLog.error("[FLUX IA] Respuesta vacía. finishReason:", razon, "blockReason:", bloqueo, data);
    throw new Error(`La IA no pudo procesar los archivos (${razon || bloqueo || "respuesta vacía"}). Intenta de nuevo.`);
  }

  return limpiarMarkdown(texto);
}


/* ==========================================================================
   4. ENDPOINTS EXPORTADOS (Funciones Principales de la IA)
   ========================================================================== */

/**
 * TAB 1: Genera un plan de estudio estructurado basado en las tareas pendientes,
 * el horario académico y las reglas (restricciones) del estudiante.
 */
export async function generarPlanEstudio({ tareas, horario, restricciones }) {
  const DIAS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

  const tareasTexto =
    tareas.length > 0
      ? tareas
          .map(t => `- "${t.titulo}" (materia/grupo: ${t.grupo_nombre || "N/A"})`)
          .join("\n")
      : "El estudiante no tiene tareas pendientes actualmente.";

  const horarioTexto =
    horario.length > 0
      ? horario
          .slice()
          .sort((a, b) =>
            a.dayOfWeek === b.dayOfWeek
              ? a.startTime.localeCompare(b.startTime)
              : a.dayOfWeek - b.dayOfWeek
          )
          .map(b => {
            const dia = DIAS[b.dayOfWeek] || `Día ${b.dayOfWeek}`;
            return `- ${dia}: ${b.startTime}–${b.endTime} (${b.type || "Clase"})`;
          })
          .join("\n")
      : "El estudiante no tiene horario definido.";

  const restriccionesTexto = restricciones && restricciones.trim() !== "" 
    ? `\n🛑 RESTRICCIONES Y PREFERENCIAS DEL ESTUDIANTE:\n"${restricciones}"\nPor favor, adapta el plan respetando estrictamente estas indicaciones.`
    : "";

  const prompt = `Soy un estudiante universitario de la Unimet y necesito un plan de estudio personalizado.

📋 MIS TAREAS PENDIENTES:
${tareasTexto}

🗓️ MI HORARIO SEMANAL (bloques de clase):
${horarioTexto}${restriccionesTexto}

IMPORTANTE: Debes completar TODA la respuesta sin cortarla. Si el plan es largo, inclúyelo completo.

Por favor genera un plan de estudio detallado que incluya:
1. Para cada tarea pendiente: qué día y en qué bloque de tiempo libre (antes o después de clases) debería estudiarla, con justificación.
2. Duración sugerida de estudio por tarea.
3. Sugerencias de actividades de estudio adicionales basadas en el tipo de cada materia.
4. Si no hay tareas, sugiere cómo aprovechar los bloques libres del horario.

Organiza la respuesta por días de la semana y asegúrate de cubrir todos los puntos antes de terminar.`;

  return llamarGemini(prompt, { maxOutputTokens: 4000 });
}

/**
 * TAB 2: Genera un resumen inteligente del Repositorio.
 * Lee los archivos soportados (PDF, Imágenes) desde Supabase Storage, 
 * los inyecta en el prompt y le pide a la IA que analice su contenido interno.
 */
export async function generarResumenRepositorio({ nombreRepo, archivos }) {
  const totalArchivos = archivos.length;

  // -- 1. Descargar contenido de PDFs e imágenes --
  const MAX_ARCHIVOS_CON_CONTENIDO = 8; // Límite por rendimiento y cuota de tokens
  let archivosConContenido = 0;

  const archivosInfo = await Promise.all(
    archivos.map(async (a, i) => {
      const nombre = a.nombre || a.name || `Archivo ${i + 1}`;
      // Usar mime_type de la BD; si no existe, inferirlo de la extensión del nombre
      const mime = ((a.mime_type || a.content_type || "").toLowerCase()) || inferirMimePorExtension(nombre);
      const tamano = a.size_bytes ? `${(a.size_bytes / 1024).toFixed(1)} KB` : "";
      const fecha = a.created_at ? new Date(a.created_at).toLocaleDateString("es-VE") : "";
      const esLegible = MIME_SOPORTADOS_GEMINI.has(mime);
      const path = a.path || a.ruta || null;

      let inlineData = null;
      if (esLegible && path && archivosConContenido < MAX_ARCHIVOS_CON_CONTENIDO) {
        inlineData = await descargarComoBase64(path, mime);
        if (inlineData) archivosConContenido++;
      }

      return { nombre, mime, tamano, fecha, inlineData, indice: i + 1 };
    })
  );

  // -- 2. Construir el bloque de texto del Prompt --
  const archivosTexto = archivosInfo
    .map(({ nombre, mime, tamano, fecha, inlineData, indice }) => {
      const estado = inlineData
        ? "✅ contenido leído"
        : MIME_SOPORTADOS_GEMINI.has(mime)
          ? "⚠️ no descargado (límite alcanzado)"
          : "📋 solo metadata (formato no soportado para lectura directa)";
      const partes = [mime, tamano, fecha ? `subido el ${fecha}` : "", estado].filter(Boolean);
      return `${indice}. ${nombre} (${partes.join(" | ")})`;
    })
    .join("\n") || "El repositorio está vacío.";

  const archivosConContenidoLeido = archivosInfo.filter(a => a.inlineData).length;
  const archivosNoLeidos = totalArchivos - archivosConContenidoLeido;

  const promptTexto = `Eres un asistente académico y acabas de recibir los archivos de un repositorio universitario. Tu tarea es leer DETENIDAMENTE cada archivo adjunto y generar un informe de contenido detallado.

📁 REPOSITORIO: "${nombreRepo}"
📊 ARCHIVOS TOTALES: ${totalArchivos} (${archivosConContenidoLeido} archivos leídos con su contenido completo, ${archivosNoLeidos} solo con metadata)

📄 ARCHIVOS:
${archivosTexto}

${archivosConContenidoLeido > 0
    ? `🔍 INSTRUCCIÓN CRÍTICA: Los archivos marcados con ✅ están adjuntos. DEBES leer su contenido completo y:
- Citar párrafos, definiciones, fórmulas o secciones clave de cada documento
- Explicar con tus propias palabras qué enseña o contiene cada archivo
- NO uses frases como "el archivo probablemente contiene" o "basado en el nombre" — tienes el contenido real
- Si un documento tiene secciones, enuméralas y explica de qué trata cada una`
    : "Basa tu análisis únicamente en los nombres y extensiones de los archivos."}

IMPORTANTE: Completa TODAS las secciones sin cortar la respuesta.

---

## 📌 1. Contenido Detallado por Archivo
Para cada archivo leído (✅), explica:
- Los temas principales que aborda
- Conceptos clave, definiciones o fórmulas importantes que aparecen
- Estructura general del documento (secciones o partes)
Para los archivos sin contenido (📋), describe brevemente qué se esperaría según su nombre.

## 📚 2. Orden de Estudio Recomendado
Lista todos los archivos en el orden óptimo para estudiarlos, con justificación basada en el contenido real que leíste.

## ⏱️ 3. Estimación de Tiempo
Estima cuánto tiempo tomaría estudiar cada archivo basándote en su extensión, densidad de contenido o tamaño.

## 💡 4. Recomendaciones
Al menos 5 recomendaciones concretas basadas en el contenido encontrado dentro de los archivos.

## ✅ 5. Conclusión
Cierre motivacional señalando los puntos más importantes del repositorio.

${totalArchivos === 0 ? "El repositorio está vacío: sugiere qué tipos de archivos sería útil agregar." : ""}`;

  // -- 3. Armar el payload Multimodal --
  const parts = [{ text: promptTexto }];

  for (const archivo of archivosInfo) {
    if (!archivo.inlineData) continue;
    parts.push({
      inlineData: {
        mimeType: archivo.inlineData.mimeType,
        data: archivo.inlineData.base64
      }
    });
    // Etiqueta de contexto para que Gemini identifique qué archivo pertenece a qué base64
    parts.push({ text: `[Archivo adjunto: "${archivo.nombre}"]` });
  }

  return llamarGeminiMultimodal(parts, { maxOutputTokens: 8000, temperature: 0.5 })
    .catch(errorMultimodal => {
      // Fallback: Si el procesamiento multimodal falla (ej. timeout), reintenta analizando solo los nombres/metadatos
      devLog.warn("[FLUX IA] Llamada multimodal falló, reintentando sin archivos:", errorMultimodal.message);
      const promptFallback = promptTexto +
        "\n\n[NOTA INTERNA: Los archivos no pudieron procesarse en esta llamada. Analiza únicamente a partir de los nombres y tipos de archivo listados arriba.]";
      return llamarGemini(promptFallback, { maxOutputTokens: 6000, temperature: 0.6 });
    });
}

/**
 * TAB 3: Conversación Libre con la IA.
 * Envía a Gemini el historial de mensajes de ese chat específico junto con
 * el contexto actual del estudiante (horarios, tareas, materias).
 */
export async function chatConIA({ mensajes, contextoUsuario }) {
  const { nombreUsuario, grupos, horario, tareasPendientes } = contextoUsuario;

  const contextoTexto = [
    `👤 Estudiante: ${nombreUsuario || "Usuario"}`,
    `📚 Grupos/Materias: ${grupos?.length > 0 ? grupos.join(", ") : "Sin grupos"}`,
    `🗓️ Horario: ${horario?.length > 0 ? horario.join(", ") : "Sin horario definido"}`,
    `📋 Tareas pendientes: ${tareasPendientes?.length > 0 ? tareasPendientes.join(", ") : "Sin tareas pendientes"}`
  ].join("\n");

  // Limitar el historial a los últimos 20 mensajes para no superar la ventana de tokens de Gemini
  const historialReciente = mensajes.slice(-21, -1);
  const historialTexto = historialReciente
    .map(m => `${m.role === "user" ? "Estudiante" : "FLUX IA"}: ${m.text}`)
    .join("\n");

  const mensajeActual = mensajes[mensajes.length - 1]?.text || "";

  const prompt = `CONTEXTO DEL ESTUDIANTE:
${contextoTexto}

${historialTexto ? `HISTORIAL DE CONVERSACIÓN:\n${historialTexto}\n` : ""}Estudiante: ${mensajeActual}

IMPORTANTE: Da una respuesta completa. Si tu respuesta incluye una lista, tabla, explicación o pasos, complétala entera antes de terminar.

Responde al último mensaje del estudiante en primera persona, tomando en cuenta su contexto y el historial de la conversación.`;

  return llamarGemini(prompt, { maxOutputTokens: 3000 });
}