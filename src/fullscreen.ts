// Pantalla completa (y orientación horizontal en el celular).

export function isFullscreen() {
  return !!document.fullscreenElement;
}

export async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    // Solo funciona en pantalla completa y en navegadores que lo permiten (Android).
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch {
    /* el navegador no lo permite: se ignora */
  }
}

export async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
  else await enterFullscreen();
}

/** En pantallas táctiles, el primer toque activa la pantalla completa para que el juego ocupe todo el celular. */
export function autoFullscreenOnTouch() {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  const go = () => {
    window.removeEventListener('pointerdown', go);
    void enterFullscreen();
  };
  window.addEventListener('pointerdown', go, { once: true });
}
