/**
 * COMPONENTE: Estrellas
 * ----------------------------------------------------------------------
 * Muestra un sistema de calificación interactivo de 5 estrellas.
 * Soporta selecciones de media estrella (ej. 2.5, 4.5) calculando
 * la posición exacta del cursor sobre el elemento.
 * * Props:
 * - alCalificar (function): Callback que recibe el valor numérico (0-5) 
 * cuando el usuario hace clic para confirmar su calificación.
 */

import { useState } from 'react';

export default function Estrellas({ alCalificar }) {
  
  // ─── 1. ESTADOS LOCALES ──────────────────────────────────────────────────
  const [rating, setRating] = useState(0); // Calificación final seleccionada
  const [hover, setHover] = useState(0);   // Calificación temporal al pasar el mouse

  // ─── 2. FUNCIONES AUXILIARES (HELPERS) ───────────────────────────────────
  
  /**
   * Determina el estilo visual de cada estrella (Llena, Mitad, Vacía)
   * basándose en la posición del mouse o la calificación fijada.
   */
  const obtenerEstilo = (index) => {
    // Si hay un hover activo se prioriza, si no, se usa la calificación guardada
    const valorActual = hover || rating;

    // Estilo base para todas las estrellas
    const baseStyle = {
      fontSize: "40px",
      cursor: "pointer",
      transition: "transform 0.1s",
      userSelect: "none",      // Evita seleccionar texto al hacer clic rápido
      display: "inline-block"  // Necesario para que funcione el degradado
    };

    // Caso 1: Estrella completa (ej: valorActual = 3, estrella 1, 2 y 3)
    if (valorActual >= index) {
      return { ...baseStyle, color: "#FFD700" }; // Dorado sólido
    }
    
    // Caso 2: Media estrella (ej: valorActual = 2.5, estrella 3)
    if (valorActual >= index - 0.5) {
      return {
        ...baseStyle,
        background: "linear-gradient(90deg, #FFD700 50%, #D3D3D3 50%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      };
    }

    // Caso 3: Estrella vacía
    return { ...baseStyle, color: "#D3D3D3" }; // Gris claro
  };

  // ─── 3. MANEJADORES DE EVENTOS (HANDLERS) ────────────────────────────────
  
  /**
   * Detecta si el mouse está en la mitad izquierda o derecha de la estrella
   * para actualizar el efecto hover en tiempo real.
   */
  const manejarMovimiento = (e, index) => {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left; // Posición horizontal del mouse dentro de la estrella
    
    // Si el mouse está antes de la mitad del ancho, valor = 0.5, sino = entera
    const nuevoValor = x < width / 2 ? index - 0.5 : index;
    setHover(nuevoValor);
  };

  /**
   * Fija la calificación final al hacer clic sobre una estrella y notifica al padre.
   */
  const confirmarVoto = (e, index) => {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    const valorFinal = x < width / 2 ? index - 0.5 : index;
    
    setRating(valorFinal);
    if (alCalificar) alCalificar(valorFinal);
  };

  /**
   * Borra la calificación actual y la regresa a cero.
   */
  const manejarReinicio = () => {
    setRating(0);
    setHover(0);
    if (alCalificar) alCalificar(0);
  };

  // ─── 4. RENDERIZADO (JSX) ────────────────────────────────────────────────
  return (
    <div 
      className="card" 
      style={{ 
        padding: "20px", 
        marginTop: "20px", 
        textAlign: "left", 
        background: "#fff", 
        borderRadius: "8px", 
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)" 
      }}
    >
      <strong style={{ fontSize: "1.1rem", color: "#333" }}>
        Tu calificación
      </strong>
      
      {/* Contenedor de las 5 estrellas */}
      <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
        {[1, 2, 3, 4, 5].map((index) => (
          <span
            key={index}
            style={obtenerEstilo(index)}
            onMouseMove={(e) => manejarMovimiento(e, index)}
            onMouseLeave={() => setHover(0)}
            onClick={(e) => confirmarVoto(e, index)}
          >
            ★
          </span>
        ))}
      </div>

      {/* Botón para resetear */}
      <button
        type="button"
        className="btn"
        style={{ marginTop: "8px" }}
        onClick={manejarReinicio}
      >
        Calificar con 0
      </button>
      
      {/* Mensaje dinámico de estado */}
      <p style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
        {rating > 0 
          ? `Has seleccionado ${rating} estrellas` 
          : "Desliza y haz clic para puntuar"}
      </p>
    </div>
  );
}