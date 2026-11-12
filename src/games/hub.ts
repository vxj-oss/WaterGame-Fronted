import Phaser from 'phaser';
import { openOnline } from '../components/screens';
import { fuegoTarget, goTo, inTable } from '../services/switcher';
import { LEVELS } from '../data/levels';
import { nextLevelIndex } from '../services/save';
import { loadRecords, localVersus, onlineBest, onlineVersus } from '../services/records';
import { closeGames, el, esc, GameDef, gameRoot, launchGame, setExitHandler } from './kit';
import { GAMES } from './registry';

export function openHub(scene: Phaser.Scene, mode: 'all' | 'local' = 'all') {
  const localOnly = mode === 'local';
  setExitHandler(() => openHub(scene, mode));
  const root = gameRoot();
  root.innerHTML = '';
  root.style.display = 'flex';

  const top = el('div', 'g-top');
  const back = el('button', 'g-back', '‹');
  back.setAttribute('aria-label', 'Volver');
  back.onclick = closeGames;
  const title = el('div', 'g-title');
  title.textContent = localOnly ? 'Juego local' : 'Más juegos';
  top.append(back, title);

  const status = el('div', 'g-status');
  status.innerHTML = localOnly ? '<span>Juegos para jugar en este dispositivo</span>' : '<span>Elige un juego para dos</span>';

  const body = el('div', 'g-body hubbody');
  const grid = el('div', 'hub');
  const layer = el('div', 'g-layer');

  const fuego = el('button', 'gcard');
  fuego.innerHTML = `<span class="ic" style="background:linear-gradient(160deg,#ff9a5c,#3b8cff)">🔥</span>
    <span><h4>Fuego y Agua</h4><p>Plataformas cooperativas: ${LEVELS.length} niveles</p>
    <span class="gtags">${localOnly ? '' : '<span class="gtag on">2 jugadores</span>'}<span class="gtag loc">Mismo dispositivo</span></span></span>`;
  fuego.onclick = () => chooseFuego();
  grid.append(fuego);

  GAMES.filter((g) => !localOnly || g.local || g.solo).forEach((g, i) => {
    const card = el('button', 'gcard');
    card.style.animationDelay = `${i * 60}ms`;
    card.innerHTML = `<span class="ic" style="background:linear-gradient(160deg,${g.from},${g.to})">${g.icon}</span>
      <span><h4>${esc(g.name)}</h4><p>${esc(g.tagline)}</p>
      <span class="gtags">${localOnly ? '' : '<span class="gtag on">2 jugadores</span>'}${g.local ? '<span class="gtag loc">Mismo dispositivo</span>' : ''}${g.solo ? '<span class="gtag loc">Robot</span>' : ''}${g.match ? `<span class="gtag">Meta ${g.match.target} puntos</span>` : ''}</span>
      <span class="rec" data-g="${g.id}"></span></span>`;
    card.onclick = () => choose(g);
    grid.append(card);
  });

  const chooseFuego = () => {
    layer.innerHTML = '';
    const panel = el('div', 'gpanel');
    panel.innerHTML = '<h3>Fuego y Agua</h3><p>Dos personajes, un solo camino</p>';
    const row = el('div', 'choices');
    row.style.margin = '0 auto';
    if (localOnly) {
      const play = el('button', 'gbtn lagoon', 'Jugar');
      play.onclick = () => {
        closeGames();
        scene.scene.start('Level', { level: nextLevelIndex(LEVELS.length) });
      };
      const pick = el('button', 'gbtn gold', 'Elegir nivel');
      pick.onclick = () => {
        closeGames();
        scene.scene.start('LevelSelect');
      };
      const stop = el('button', 'gbtn ghost', 'Cancelar');
      stop.onclick = () => layer.classList.remove('on');
      row.append(play, pick, stop);
      panel.append(row);
      layer.append(panel);
      layer.classList.add('on');
      return;
    }
    const online = el('button', 'gbtn lagoon', inTable() ? 'Seguir con el siguiente nivel' : 'Jugar en línea (2 jugadores)');
    online.onclick = () => {
      if (inTable()) goTo(fuegoTarget());
      else {
        closeGames();
        void openOnline(scene);
      }
    };
    const loc = el('button', 'gbtn', 'En este dispositivo');
    loc.onclick = () => {
      closeGames();
      scene.scene.start('Level', { level: nextLevelIndex(LEVELS.length) });
    };
    const levels = el('button', 'gbtn ghost', 'Elegir nivel');
    levels.onclick = () => {
      if (inTable()) goTo({ kind: 'levels' });
      else {
        closeGames();
        scene.scene.start('LevelSelect');
      }
    };
    const cancel = el('button', 'gbtn ghost', 'Cancelar');
    cancel.onclick = () => layer.classList.remove('on');
    row.append(online, levels);
    if (!inTable()) row.append(loc);
    row.append(cancel);
    panel.append(row);
    layer.append(panel);
    layer.classList.add('on');
  };

  const choose = (g: GameDef) => {
    if (localOnly && g.local && !g.solo) {
      launchGame(g, 'local');
      return;
    }
    layer.innerHTML = '';
    const panel = el('div', 'gpanel');
    panel.innerHTML = `<h3>${esc(g.name)}</h3><p>${esc(g.tagline)}</p>`;
    const row = el('div', 'choices');
    row.style.margin = '0 auto';
    if (!localOnly) {
      const online = el('button', 'gbtn lagoon', 'Jugar en línea (2 jugadores)');
      online.onclick = () => {
        if (inTable()) goTo({ kind: 'game', id: g.id });
        else {
          closeGames();
          void openOnline(scene, g.id);
        }
      };
      row.append(online);
    }
    if (g.solo) {
      const bot = el('button', 'gbtn gold', 'Contra el robot');
      bot.onclick = () => launchGame(g, 'solo');
      row.append(bot);
    }
    if (g.local) {
      const loc = el('button', 'gbtn', 'En este dispositivo');
      loc.onclick = () => launchGame(g, 'local');
      row.append(loc);
    }
    const cancel = el('button', 'gbtn ghost', 'Cancelar');
    cancel.onclick = () => layer.classList.remove('on');
    row.append(cancel);
    panel.append(row);
    layer.append(panel);
    layer.classList.add('on');
  };

  body.append(grid);
  root.append(top, status, body, layer);

  const showRecords = () => {
    GAMES.forEach((g) => {
      const out = grid.querySelector<HTMLElement>(`.rec[data-g="${g.id}"]`);
      if (!out) return;
      if (g.match) {
        const v = localOnly ? localVersus(g.id) : onlineVersus(g.id);
        out.textContent = v ? `🏆 Récord: ${v[0]} – ${v[1]}` : '';
      } else if (!localOnly && g.id === 'draw') {
        const b = onlineBest(g.id);
        out.textContent = b !== null ? `🏆 Mejor marca: ${b} de 4` : '';
      }
    });
  };
  showRecords();
  if (!localOnly) void loadRecords().then(showRecords);
}
