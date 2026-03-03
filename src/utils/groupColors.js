const COLOR_STORAGE_KEY = "flux_color_preferencias_v1";

export const PALETA_BANNERS = [
  { id: "c1", a: "#0F80C1", b: "#1F93D8", badge: "#0A5F93" },
  { id: "c2", a: "#7B3FE4", b: "#9E62FF", badge: "#5A28B7" },
  { id: "c3", a: "#0E8F6A", b: "#1CB98C", badge: "#0B664B" },
  { id: "c4", a: "#C05A1A", b: "#E17A2F", badge: "#8C3E10" },
  { id: "c5", a: "#C2276B", b: "#E34D8E", badge: "#8A1B4A" },
  { id: "c6", a: "#3159C8", b: "#4C77E8", badge: "#223F90" },
  { id: "c7", a: "#2E7D32", b: "#46A34B", badge: "#1F5722" },
  { id: "c8", a: "#8B5E00", b: "#B37A00", badge: "#654300" },
  { id: "c9", a: "#0F766E", b: "#14B8A6", badge: "#115E59" },
  { id: "c10", a: "#9A3412", b: "#EA580C", badge: "#7C2D12" }
];

function hashTexto(valor = "") {
  let hash = 0;
  for (let i = 0; i < valor.length; i++) {
    hash = (hash << 5) - hash + valor.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function obtenerColorGrupo(identificador = "") {
  return PALETA_BANNERS[hashTexto(identificador) % PALETA_BANNERS.length];
}

export function obtenerColorPorId(colorId = "") {
  return PALETA_BANNERS.find(c => c.id === colorId) || null;
}

function leerPreferenciasColor() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(COLOR_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function guardarPreferenciasColor(preferencias) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(preferencias || {}));
  } catch {
    // Ignore localStorage errors
  }
}

function claveEntidad(tipo = "", entidadId = "") {
  return `${tipo}:${entidadId}`;
}

export function obtenerColorGuardado(tipo = "", entidadId = "") {
  if (!tipo || !entidadId) return "";
  const preferencias = leerPreferenciasColor();
  const colorId = preferencias[claveEntidad(tipo, entidadId)] || "";
  return obtenerColorPorId(colorId) ? colorId : "";
}

export function guardarColorGuardado(tipo = "", entidadId = "", colorId = "") {
  if (!tipo || !entidadId || !obtenerColorPorId(colorId)) return;
  const preferencias = leerPreferenciasColor();
  preferencias[claveEntidad(tipo, entidadId)] = colorId;
  guardarPreferenciasColor(preferencias);
}

export function obtenerColorEntidad({ tipo = "", entidadId = "", identificador = "", colorId = "" }) {
  const colorSeleccionado = obtenerColorPorId(colorId);
  if (colorSeleccionado) return colorSeleccionado;
  const colorGuardado = obtenerColorPorId(obtenerColorGuardado(tipo, entidadId));
  if (colorGuardado) return colorGuardado;
  return obtenerColorGrupo(identificador);
}
