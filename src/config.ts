export const TILE = 32;
export const COLS = 30;
export const ROWS = 17;
export const TOP = 40; // alto de la barra superior (HUD)

// Colores de los grupos 1-4 (botones, palancas, compuertas y ascensores)
export const GROUP_COLORS = [0x000000, 0xffd23f, 0xb86bff, 0xff6bb5, 0xe6e6e6];

// Plataforma que sube `rise` tiles cuando su grupo está activo.
// (col,row) es la esquina superior izquierda de la plataforma en reposo.
export interface LiftDef {
  col: number;
  row: number;
  width: number;
  rise: number;
  group: number;
}

export interface Level {
  name: string;
  map: string[];
  lifts?: LiftDef[];
  par: number; // segundos para obtener la 3ra estrella
}
