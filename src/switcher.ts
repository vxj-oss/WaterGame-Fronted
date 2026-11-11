import { app } from './app';
import { closeGames, launchGame } from './games/kit';
import { gameById } from './games/registry';
import { LEVELS } from './levels';
import { net } from './net';
import { nextLevelIndex } from './save';
import { hideUi } from './screens';
import { toast } from './toast';

export type Target = { kind: 'game'; id: string } | { kind: 'fuego'; level: number };

export const inTable = () => !!net.code && net.peerOnline;

let lastSent = 0;
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
