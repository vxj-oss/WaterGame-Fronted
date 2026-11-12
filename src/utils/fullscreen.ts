let wantFs = true;

export function isFullscreen() {
  return !!document.fullscreenElement;
}

export async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch {
    return;
  }
}

export async function toggleFullscreen() {
  if (document.fullscreenElement) {
    wantFs = false;
    await document.exitFullscreen().catch(() => undefined);
  } else {
    wantFs = true;
    await enterFullscreen();
  }
}

export function autoFullscreenOnTouch() {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  let last = 0;
  window.addEventListener(
    'pointerdown',
    () => {
      const now = performance.now();
      if (wantFs && !document.fullscreenElement && now - last > 5000) {
        last = now;
        void enterFullscreen();
      }
    },
    true,
  );
}
