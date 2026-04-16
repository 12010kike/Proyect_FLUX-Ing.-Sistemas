/**
 * CONFIGURACIÓN: Supabase Client
 * ----------------------------------------------------------------------
 * Este archivo inicializa y exporta el cliente principal de Supabase.
 * Actúa como la única conexión centralizada de la aplicación; debe 
 * importarse cada vez que necesitemos interactuar con la base de datos, 
 * el sistema de autenticación o el almacenamiento (Storage).
 */

import { createClient } from '@supabase/supabase-js';

// ─── 1. VARIABLES DE ENTORNO ──────────────────────────────────────────────
// Obtenemos la URL y la clave pública (anon key) desde el archivo .env
// Nota: Vite utiliza 'import.meta.env' en lugar del tradicional 'process.env'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ─── 2. INSTANCIA DEL CLIENTE ─────────────────────────────────────────────
// Creamos y exportamos la conexión al proyecto configurado
export const supabase = createClient(supabaseUrl, supabaseKey);