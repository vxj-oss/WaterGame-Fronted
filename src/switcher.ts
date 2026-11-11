import { app } from './app';
import { closeGames, launchGame } from './games/kit';
import { gameById } from './games/registry';
import { LEVELS } from './levels';
import { net } from './net';
import { nextLevelIndex } from './save';
import { hideUi } from './screens';

export type Target = { kind: 'game'; id: string } | { kind: 'fuego'; level: number };

export const inTable = () => !!net.code && net.peerOnline;

let lastSent = 0;
let toastTimer: number | undefined;

function toast(text: string) {
  let box = document.getElementById('toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast';
    box.style.cssText =
      'position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:60;padding:12px 20px;border-radius:999px;' +
      'background:rgba(8,24,32,0.92);color:#f7f3ea;font:800 15px Nunito,system-ui,sans-serif;box-shadow:0 0 0 1.5px rgba(46,211,230,0.4),0 12px 30px rgba(0,0,0,0.5);' +
      'pointer-events:none;transition:opacity 0.3s';
    document.body.appendChild(box);
  }
  box.textContent = text;
  box.style.opacity = '1';
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (box) box.style.opacity = '0';
  }, 2600);
}

const label = (t: Target) => (t.kind === 'fuego' ? 'Fuego y Agua' : (gameById(t.id)?.name ?? 'otro juego'));

function stopScenes(except: string[]) {
  const g = app.game;
  if (!g) return;
  for (const k of ['Menu', 'LevelSelect', 'Level']) if (!except.includes(k) && g.scene.isActive(k)) g.scene.stop(k);
}

export function goTo(t: Target, broadcast = true) {
  const g = app.game;
  if (!g) return;
  hideUi();
  if (t.kind === 'game') {
    const def = gameById(t.id);
    if (!def) return;
    stopScenes(['Menu']);
    if (!g.scene.isActive('Menu')) g.scene.start('Menu');
    launchGame(def, 'online');
  } else {
    closeGames();
    stopScenes([]);
    g.scene.start('Level', { level: t.level, online: true });
  }
  if (broadcast) {
    lastSent = Date.now();
    net.send('event', { t: 'go', target: t });
  } else {
    toast(`Tu pareja cambió a ${label(t)}`);
  }
}

export const fuegoTarget = (): Target => ({ kind: 'fuego', level: nextLevelIndex(LEVELS.length) });

export function initSwitcher() {
  net.on('event', (e: { t?: string; target?: Target }) => {
    if (e?.t !== 'go' || !e.target) return;
    if (net.role === 'fire' && Date.now() - lastSent < 1000) return;
    goTo(e.target, false);
  });
}
