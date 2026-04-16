/**
 * COMPONENTE: TaskMaster
 * ----------------------------------------------------------------------
 * Gestor de tareas reutilizable para grupos.
 * Proporciona una interfaz para listar, marcar y administrar pendientes.
 * * Funcionalidades clave:
 * - Barra de progreso dinámica (calculada en tiempo real).
 * - Restricción de permisos: solo administradores pueden crear o borrar.
 * - Feedback visual para tareas completadas (tachado).
 */

import React, { useState } from 'react';

const TaskMaster = ({ 
  esAdmin, 
  tareas, 
  onAgregarTarea, 
  onToggleTarea, 
  onBorrarTarea 
}) => {
  
  // ─── 1. ESTADOS LOCALES ────────────────────────────────────────────────
  const [nuevaTarea, setNuevaTarea] = useState("");

  // ─── 2. LÓGICA DE CÁLCULO (BARRA DE PROGRESO) ──────────────────────────
  const totalTareas = tareas.length;
  const tareasCompletadas = tareas.filter(tarea => tarea.completada).length;
  
  // Calcula el porcentaje de avance (evita división por cero)
  const progreso = totalTareas === 0 ? 0 : Math.round((tareasCompletadas / totalTareas) * 100);

  // ─── 3. MANEJADORES DE EVENTOS (HANDLERS) ──────────────────────────────
  
  /**
   * Procesa el envío del formulario para añadir una tarea.
   * Valida que el texto no esté vacío antes de notificar al padre.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (nuevaTarea.trim() !== "") {
      onAgregarTarea(nuevaTarea);
      setNuevaTarea(""); // Resetea el campo tras la inserción
    }
  };

  // ─── 4. RENDERIZADO (JSX) ───────────────────────────────────────────────
  return (
    <div 
      className="task-master-container" 
      style={{ 
        padding: '20px', 
        backgroundColor: '#fff', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Gestor de Tareas</h3>

      {/* --- SECCIÓN: Barra de Progreso --- */}
      {totalTareas > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '5px', color: '#666' }}>
            <span>Progreso</span>
            <span>{progreso}%</span>
          </div>
          <div style={{ width: '100%', backgroundColor: '#e9ecef', borderRadius: '8px', height: '10px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${progreso}%`, 
                backgroundColor: progreso === 100 ? '#28a745' : '#f48042', 
                height: '100%', 
                borderRadius: '8px',
                transition: 'width 0.4s ease-in-out, background-color 0.4s ease-in-out' 
              }} 
            />
          </div>
        </div>
      )}

      {/* --- SECCIÓN: Formulario de Adición (Solo Admin) --- */}
      {esAdmin && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            value={nuevaTarea}
            onChange={(e) => setNuevaTarea(e.target.value)}
            placeholder="Añadir nueva tarea..."
            style={{ flexGrow: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button 
            type="submit" 
            style={{ 
              padding: '8px 15px', 
              backgroundColor: '#f48042', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Agregar
          </button>
        </form>
      )}

      {/* --- SECCIÓN: Listado de Tareas --- */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {tareas.map((tarea) => (
          <li 
            key={tarea.id} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '10px', 
              padding: '10px', 
              backgroundColor: '#f9f9f9', 
              borderRadius: '4px' 
            }}
          >
            {/* Checkbox de estado */}
            <input
              type="checkbox"
              checked={tarea.completada}
              onChange={() => onToggleTarea(tarea.id, !tarea.completada)}
              style={{ marginRight: '15px', transform: 'scale(1.2)', cursor: 'pointer' }}
            />
            
            {/* Texto de la tarea (con estilo dinámico si está completada) */}
            <span style={{
              textDecoration: tarea.completada ? 'line-through' : 'none',
              color: tarea.completada ? '#888' : '#333',
              flexGrow: 1,
              fontSize: '16px',
              transition: 'color 0.3s'
            }}>
              {tarea.titulo}
            </span>
            
            {/* Acción de eliminación (Solo Admin) */}
            {esAdmin && (
              <button 
                onClick={() => onBorrarTarea(tarea.id)} 
                style={{ 
                  padding: '5px 10px', 
                  backgroundColor: '#dc3545', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontSize: '12px' 
                }}
              >
                Borrar
              </button>
            )}
          </li>
        ))}
      </ul>
      
      {/* --- SECCIÓN: Estado Vacío --- */}
      {tareas.length === 0 && (
        <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
          No hay tareas asignadas todavía.
        </p>
      )}
    </div>
  );
};

export default TaskMaster;