import Phaser from 'phaser';
import { openOnline } from '../screens';
import { fuegoTarget, goTo, inTable } from '../switcher';
import { LEVELS } from '../levels';
import { nextLevelIndex } from '../save';
import { closeGames, el, esc, GameDef, gameRoot, launchGame, setExitHandler } from './kit';
import { GAMES } from './registry';

export function openHub(scene: Phaser.Scene) {
  setExitHandler(() => openHub(scene));
  const root = gameRoot();
  root.innerHTML = '';
  root.style.display = 'flex';

  const top = el('div', 'g-top');
  const back = el('button', 'g-back', '‹');
  back.setAttribute('aria-label', 'Volver');
  back.onclick = closeGames;
  const title = el('div', 'g-title');
  title.textContent = 'Más juegos';
  top.append(back, title);

  const status = el('div', 'g-status');
  status.innerHTML = '<span>Elige un juego para dos</span>';

  const body = el('div', 'g-body hubbody');
  const grid = el('div', 'hub');
  const layer = el('div', 'g-layer');

  const fuego = el('button', 'gcard');
  fuego.innerHTML = `<span class="ic" style="background:linear-gradient(160deg,#ff9a5c,#3b8cff)">🔥</span>
    <span><h4>Fuego y Agua</h4><p>Plataformas cooperativas: ${LEVELS.length} niveles</p>
    <span class="gtags"><span class="gtag on">2 jugadores</span><span class="gtag loc">Mismo dispositivo</span></span></span>`;
  fuego.onclick = () => chooseFuego();
  grid.append(fuego);

  GAMES.forEach((g, i) => {
    const card = el('button', 'gcard');
    card.style.animationDelay = `${i * 60}ms`;
    card.innerHTML = `<span class="ic" style="background:linear-gradient(160deg,${g.from},${g.to})">${g.icon}</span>
      <span><h4>${esc(g.name)}</h4><p>${esc(g.tagline)}</p>
      <span class="gtags"><span class="gtag on">2 jugadores</span>${g.local ? '<span class="gtag loc">Mismo dispositivo</span>' : ''}${g.solo ? '<span class="gtag loc">Robot</span>' : ''}</span></span>`;
    card.onclick = () => choose(g);
    grid.append(card);
  });

  const chooseFuego = () => {
    layer.innerHTML = '';
    const panel = el('div', 'gpanel');
    panel.innerHTML = '<h3>Fuego y Agua</h3><p>Dos personajes, un solo camino</p>';
    const row = el('div', 'choices');
    row.style.margin = '0 auto';
    const online = el('button', 'gbtn lagoon', 'Jugar en línea (2 jugadores)');
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
    const cancel = el('button', 'gbtn ghost', 'Cancelar');
    cancel.onclick = () => layer.classList.remove('on');
    row.append(online, loc, cancel);
    panel.append(row);
    layer.append(panel);
    layer.classList.add('on');
  };

  const choose = (g: GameDef) => {
    layer.innerHTML = '';
    const panel = el('div', 'gpanel');
    panel.innerHTML = `<h3>${esc(g.name)}</h3><p>${esc(g.tagline)}</p>`;
    const row = el('div', 'choices');
    row.style.margin = '0 auto';
    const online = el('button', 'gbtn lagoon', 'Jugar en línea (2 jugadores)');
    online.onclick = () => {
      if (inTable()) goTo({ kind: 'game', id: g.id });
      else {
        closeGames();
        void openOnline(scene, g.id);
      }
    };
    row.append(online);
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
}
