export function isFullscreen() {
  return !!document.fullscreenElement;
}

export async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch {
  }
}

export async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
  else await enterFullscreen();
}

export function autoFullscreenOnTouch() {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  const go = () => {
    window.removeEventListener('pointerdown', go);
    void enterFullscreen();
  };
  window.addEventListener('pointerdown', go, { once: true });
}
