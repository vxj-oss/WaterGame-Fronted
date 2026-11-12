import Phaser from 'phaser';
import { app } from '../services/app';
import { API, api, net } from '../services/net';
import { record } from '../services/save';
import { openHub } from '../games/hub';
import { launchGame } from '../games/kit';
import { gameById } from '../games/registry';

declare const google: any;

const root = () => document.getElementById('ui')!;
const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const FLAME = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5c.9 4 6.5 6.2 6.5 12.4a6.5 6.5 0 0 1-13 0c0-3.2 2-4.6 3-6.8.7 1.6 1.6 2 2.4 1.3C11.5 6.6 11.8 4 12 1.5z"/></svg>';
const DROP = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5s7 7.3 7 12.4a7 7 0 0 1-14 0C5 8.8 12 1.5 12 1.5z"/></svg>';
const brand = (label: string) => `<div class="brand"><span class="f">${FLAME}</span><span class="w">${DROP}</span><span>${label}</span></div>`;

export function hideUi() {
  const el = root();
  el.style.display = 'none';
  el.innerHTML = '';
  if (!document.getElementById('games')) app.game?.loop.wake();
}

function card(html: string) {
  const el = root();
  app.game?.loop.sleep();
  el.style.display = 'flex';
  el.innerHTML = `<div class="card">${html}</div>`;
}

export async function openOnline(scene: Phaser.Scene, game?: string) {
  if (!net.token) return loginScreen(scene, game);
  try {
    await api('/couple');
  } catch (e) {
    if ((e as Error).message === 'unauthorized') {
      net.logout();
      return loginScreen(scene, game);
    }
    return errorScreen(scene, game);
  }
  return tableScreen(scene, game);
}

function errorScreen(scene: Phaser.Scene, game?: string) {
  card(`${brand('Sin conexión')}<h2>No hay señal</h2>
    <p>No pude conectar con el servidor.<br><small>${esc(API)}</small></p>
    <button id="retry" class="lagoon">Reintentar</button><button id="back" class="ghost">Volver</button>`);
  $('retry').onclick = () => void openOnline(scene, game);
  $('back').onclick = hideUi;
}

let gsiPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  gsiPromise ??= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => res();
    s.onerror = () => rej(new Error('No cargó Google'));
    document.head.appendChild(s);
  });
  return gsiPromise;
}

async function loginScreen(scene: Phaser.Scene, game?: string) {
  card(`${brand('Fuego y Agua')}<h2>Entra y juega</h2>
    <p>Inicia sesión para crear una mesa y jugar con tu pareja, cada quien desde su celular.</p>
    <div id="g" style="display:flex;justify-content:center;min-height:44px"></div><p id="msg" class="err"></p>
    <button id="back" class="ghost">Volver</button>`);
  $('back').onclick = hideUi;

  let cfg: { googleClientId: string | null };
  try {
    cfg = await api('/config');
  } catch {
    return errorScreen(scene, game);
  }
  const msg = $('msg');
  const done = (d: { token: string; user: { name: string; picture?: string | null } }) => {
    net.setSession(d.token, d.user);
    void tableScreen(scene, game);
  };

  if (cfg.googleClientId) {
    try {
      await loadGsi();
      google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: async (r: { credential: string }) => {
          try {
            done(await api('/auth/google', 'POST', { credential: r.credential }));
          } catch {
            msg.textContent = 'No se pudo iniciar sesión con Google';
          }
        },
      });
      google.accounts.id.renderButton($('g'), { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with', width: 330 });
    } catch {
      msg.textContent = 'No se pudo cargar el login de Google';
    }
  } else {
    msg.textContent = 'El inicio de sesión con Google no está configurado.';
  }
}

interface Couple {
  id: number;
  code: string;
  role: 'fire' | 'water';
  members: number;
}

async function tableScreen(scene: Phaser.Scene, game?: string) {
  let couple: Couple | null;
  try {
    couple = await api<Couple | null>('/couple');
  } catch {
    return errorScreen(scene, game);
  }
  if (couple) return lobbyScreen(scene, couple, game);

  card(`${brand('Mesa de juego')}<h2>Hola, ${esc((net.user?.name ?? '').split(' ')[0])}</h2>
    <p>Crea una mesa y pásale el código a tu pareja, o únete con el código que te dio.</p>
    <button id="create">Crear una mesa</button>
    <div class="row"><input id="code" class="code-in" placeholder="CÓDIGO" maxlength="6" autocomplete="off" />
    <button id="join" class="lagoon" style="flex:0 0 auto;width:auto">Unirme</button></div>
    <p id="msg" class="err"></p>
    <div class="row"><button id="back" class="ghost">Volver</button><button id="out" class="ghost">Cerrar sesión</button></div>`);
  const msg = $('msg');
  $('back').onclick = hideUi;
  $('out').onclick = () => {
    net.logout();
    hideUi();
    scene.scene.restart();
  };
  $('create').onclick = async () => {
    try {
      await api('/couple/create', 'POST');
      void tableScreen(scene, game);
    } catch {
      msg.textContent = 'No se pudo crear la mesa';
    }
  };
  const join = async () => {
    const code = ($('code') as HTMLInputElement).value.trim();
    if (!code) return;
    try {
      await api('/couple/join', 'POST', { code });
      void tableScreen(scene, game);
    } catch (e) {
      const m = (e as Error).message;
      msg.textContent = m === 'code not found' ? 'No existe esa mesa' : m === 'couple is full' ? 'Esa mesa ya está llena' : 'No se pudo unir';
    }
  };
  $('join').onclick = join;
  $('code').addEventListener('keydown', (e) => e.key === 'Enter' && void join());
}

async function syncProgress() {
  try {
    const rows = await api<{ level: number; best_time_ms: number; gems: number; stars: number }[]>('/progress');
    rows.forEach((r) => record(r.level, r.best_time_ms, r.gems, r.stars));
  } catch {
    return;
  }
}

async function lobbyScreen(scene: Phaser.Scene, couple: Couple, game?: string) {
  await syncProgress();
  net.connect();
  const offs: (() => void)[] = [];
  const cleanup = () => {
    offs.forEach((o) => o());
    offs.length = 0;
  };

  const start = (level: number) => {
    cleanup();
    hideUi();
    scene.scene.start('Level', { level, online: true });
  };

  const gameDef = game ? gameById(game) : undefined;

  const startGame = (id: string) => {
    const def = gameById(id);
    if (!def) return;
    cleanup();
    hideUi();
    launchGame(def, 'online');
  };

  let opened = false;

  const draw = () => {
    if (document.getElementById('games')) return;
    const role = net.role ?? couple.role;
    const connected = net.code !== null;
    const you = role === 'fire' ? 'fire' : 'water';
    const other = role === 'fire' ? 'water' : 'fire';
    const slot = (kind: string, name: string, on: boolean, status: string) =>
      `<div class="slot ${kind} ${on ? 'on' : 'off'}"><div class="av">${kind === 'fire' ? FLAME : DROP}</div><b>${name}</b><em>${status}</em></div>`;
    card(`${brand('Tu mesa')}<h2>Mesa lista</h2>
      <div class="code" title="Código de la mesa">${[...couple.code].map((c) => `<span>${esc(c)}</span>`).join('')}</div>
      <button id="copy" class="ghost">Copiar código</button>
      <div class="slots">
        ${slot(you, 'Tú', connected, connected ? 'Conectado' : 'Conectando')}
        ${slot(other, 'Tu pareja', connected && net.peerOnline, net.peerOnline ? 'Aquí contigo' : 'Esperando')}
      </div>
      <p>${gameDef ? `Van a jugar <b>${esc(gameDef.name)}</b>.` : net.peerOnline ? 'Ya están los dos. ¡Elijan un juego!' : 'Cuando tu pareja entre con el código, elegirán juntos un juego.'}</p>
      ${
        gameDef
          ? `<div class="row"><button id="gg" ${net.peerOnline ? '' : 'disabled'}>Jugar ${esc(gameDef.name)}</button></div>`
          : `<div class="row"><button id="hubbtn" ${net.peerOnline ? '' : 'disabled'}>Elegir juego</button></div>`
      }
      <div class="row"><button id="back" class="link">Menú</button><button id="leave" class="link">Salir de la mesa</button></div>`);
    $('copy').onclick = () => {
      void navigator.clipboard?.writeText(couple.code);
      $('copy').textContent = '¡Código copiado!';
    };
    if (gameDef) {
      $('gg').onclick = () => {
        net.send('event', { t: 'game', id: gameDef.id });
        startGame(gameDef.id);
      };
    } else {
      $('hubbtn').onclick = () => {
        cleanup();
        hideUi();
        openHub(scene);
      };
      if (net.peerOnline && connected && !opened) {
        opened = true;
        cleanup();
        hideUi();
        openHub(scene);
        return;
      }
    }
    $('leave').onclick = async () => {
      cleanup();
      net.disconnect();
      try {
        await api('/couple/leave', 'POST');
      } catch {
        return;
      }
      void tableScreen(scene, game);
    };
    $('back').onclick = () => {
      cleanup();
      hideUi();
    };
  };

  offs.push(
    net.on('joined', draw),
    net.on('peer-joined', draw),
    net.on('peer-left', draw),
    net.on('disconnected', draw),
    net.on('event', (e: { t: string; level?: number; id?: string }) => {
      if (e.t === 'game' && typeof e.id === 'string') startGame(e.id);
      if (e.t === 'goto' && typeof e.level === 'number') start(e.level);
      if (e.t === 'select') {
        cleanup();
        hideUi();
        scene.scene.start('LevelSelect', { online: true });
      }
    }),
  );
  draw();
}
