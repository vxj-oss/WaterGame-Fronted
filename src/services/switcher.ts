import { app } from './app';
import { closeGames, launchGame } from '../games/kit';
import { gameById } from '../games/registry';
import { LEVELS } from '../data/levels';
import { net } from './net';
import { nextLevelIndex } from './save';
import { hideUi } from '../components/screens';
import { toast } from '../components/toast';

export type Target = { kind: 'game'; id: string } | { kind: 'fuego'; level: number } | { kind: 'levels' };

export const inTable = () => !!net.code && net.peerOnline;

let lastSent = 0;
const label = (t: Target) => (t.kind === 'game' ? (gameById(t.id)?.name ?? 'otro juego') : 'Fuego y Agua');

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
  } else if (t.kind === 'levels') {
    closeGames();
    stopScenes([]);
    g.scene.start('LevelSelect', { online: true });
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
