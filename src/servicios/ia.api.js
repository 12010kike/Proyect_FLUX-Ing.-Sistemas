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
- Usa formato con saltos de línea y emojis para hacer las respuestas más legibles
- Cuando generes un plan de estudio, siempre indica el día, hora y duración sugerida
- Si el estudiante no tiene tareas, sugiérele cómo aprovechar mejor la plataforma
- Nunca inventes información sobre materias o contenidos que no te hayan dado como contexto
- Trata siempre al estudiante de "tú" y con un tono amigable pero profesional
`;

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function getApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("No se encontró VITE_GEMINI_API_KEY en el .env");
  return key;
}

function getModel() {
  return import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

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
    console.warn("[FLUX IA] La respuesta fue cortada por límite de tokens. Considera aumentar maxOutputTokens.");
  }

  const texto = candidate?.content?.parts?.[0]?.text;
  if (!texto) throw new Error("La IA no generó una respuesta. Intenta de nuevo.");
  return texto;
}

// ─────────────────────────────────────────────────────────
// Tab 1 – Planificador
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// Tab 2 – Resumidor de Repositorio
// ─────────────────────────────────────────────────────────
export async function generarResumenRepositorio({ nombreRepo, archivos }) {
  const totalArchivos = archivos.length;

  const archivosTexto =
    totalArchivos > 0
      ? archivos
          .map((a, i) => {
            const nombre = a.nombre || a.name || `Archivo ${i + 1}`;
            const tipo = a.mime_type || a.content_type || "archivo";
            const tamano = a.size_bytes ? `${(a.size_bytes / 1024).toFixed(1)} KB` : "";
            const fecha = a.created_at ? new Date(a.created_at).toLocaleDateString("es-VE") : "";
            const uploader = a.uploader_nombre || "";
            const partes = [tipo, tamano, fecha ? `subido el ${fecha}` : "", uploader ? `por ${uploader}` : ""].filter(Boolean);
            return `${i + 1}. ${nombre} (${partes.join(", ")})`;
          })
          .join("\n")
      : "El repositorio está vacío, no tiene archivos.";

  const prompt = `Analiza detalladamente el siguiente repositorio de estudio universitario y genera un informe COMPLETO.

📁 REPOSITORIO: "${nombreRepo}"
📊 TOTAL DE ARCHIVOS: ${totalArchivos}

📄 LISTA DE ARCHIVOS:
${archivosTexto}

IMPORTANTE: Debes completar TODAS las secciones de la respuesta sin cortarla a la mitad. Si hay muchos archivos, analízalos todos antes de concluir.

Genera el siguiente informe completo, sección por sección:

## 📌 1. Resumen del Repositorio
Describe qué temas, materias o contenidos cubre este repositorio basándote en los nombres de los archivos. Identifica patrones temáticos y agrupa los archivos por tema si es posible.

## 📚 2. Orden de Estudio Recomendado
Lista explícitamente TODOS los archivos en el orden óptimo para estudiarlos, con una breve justificación de por qué ese orden.

## ⏱️ 3. Estimación de Tiempo Total
Estima cuánto tiempo tomaría revisar todo el material. Desglosa por archivo o grupo de archivos cuando sea relevante.

## 💡 4. Recomendaciones de Estudio
Da al menos 4 recomendaciones concretas y específicas para aprovechar mejor este repositorio.

## ✅ 5. Conclusión
Un cierre motivacional resumiendo los puntos clave del repositorio.

${totalArchivos === 0 ? "Como el repositorio está vacío, en cada sección sugiere qué tipos de archivos convendría agregar dado el nombre del repositorio." : ""}`;

  // Usamos más tokens para resúmenes, ya que pueden ser respuestas largas
  return llamarGemini(prompt, { maxOutputTokens: 6000, temperature: 0.6 });
}

// ─────────────────────────────────────────────────────────
// Tab 3 – Chat libre
// ─────────────────────────────────────────────────────────
export async function chatConIA({ mensajes, contextoUsuario }) {
  const { nombreUsuario, grupos, horario, tareasPendientes } = contextoUsuario;

  const contextoTexto = [
    `👤 Estudiante: ${nombreUsuario || "Usuario"}`,
    `📚 Grupos/Materias: ${grupos?.length > 0 ? grupos.join(", ") : "Sin grupos"}`,
    `🗓️ Horario: ${horario?.length > 0 ? horario.join(", ") : "Sin horario definido"}`,
    `📋 Tareas pendientes: ${tareasPendientes?.length > 0 ? tareasPendientes.join(", ") : "Sin tareas pendientes"}`
  ].join("\n");

  // Solo incluir los últimos 20 mensajes para no saturar el contexto
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
