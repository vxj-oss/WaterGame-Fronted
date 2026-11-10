// Sistema de diseño (ver DESIGN.md): galería monocroma — vacío negro, tinta blanca y un solo
// gris carbón para botones. Todo el color lo ponen los personajes, las gemas y los elementos del juego.

export const C = {
  void: 0x000000,
  bone: 0xffffff,
  charcoal: 0x444345,
  frost: 0xe2e2e2,
  ash: 0xb8bab9,
};

export const CSS = {
  void: '#000000',
  bone: '#ffffff',
  charcoal: '#444345',
  frost: '#e2e2e2',
  ash: '#b8bab9',
};

// Inter (400) para títulos y JetBrains Mono (400) para todo lo demás, como sustitutos de Roobert / GT America Mono.
export const DISPLAY = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

// El lienzo se escala para ajustarse a la pantalla (en un celular se ve ~0.6x),
// así que los textos de interfaz son mayores que los 10–12px del documento de diseño.
export const SIZE = {
  caption: '14px',
  chrome: '17px',
  heading: '40px',
  display: '96px',
};
