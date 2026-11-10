import Phaser from 'phaser';
import { API, api, net } from './net';
import { LEVELS } from './levels';
import { nextLevelIndex, record } from './save';

// Pantallas HTML (login y mesa de juego) que se muestran encima del canvas.

declare const google: any; // Google Identity Services

const root = () => document.getElementById('ui')!;
const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function hideUi() {
  const el = root();
  el.style.display = 'none';
  el.innerHTML = '';
}

function card(html: string) {
  const el = root();
  el.style.display = 'flex';
  el.innerHTML = `<div class="card">${html}</div>`;
}

/** Punto de entrada: pide login si hace falta y luego muestra la mesa. */
export async function openOnline(scene: Phaser.Scene) {
  if (!net.token) return loginScreen(scene);
  try {
    await api('/couple');
  } catch (e) {
    if ((e as Error).message === 'unauthorized') {
      net.logout();
      return loginScreen(scene);
    }
    return errorScreen(scene);
  }
  return tableScreen(scene);
}

function errorScreen(scene: Phaser.Scene) {
  card(`<h2>Sin conexión</h2><p>No pude conectar con el servidor<br><small>${esc(API)}</small></p>
    <button id="retry">Reintentar</button><button id="back" class="ghost">← Volver</button>`);
  $('retry').onclick = () => void openOnline(scene);
  $('back').onclick = hideUi;
}

// ───────────────────────────────────── login ─────────────────────────────────────

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

async function loginScreen(scene: Phaser.Scene) {
  card(`<h2>Entrar</h2><p id="msg">Cargando…</p><div id="g" style="display:flex;justify-content:center"></div><div id="dev"></div>
    <button id="back" class="ghost">← Volver</button>`);
  $('back').onclick = hideUi;

  let cfg: { googleClientId: string | null; devLogin: boolean };
  try {
    cfg = await api('/config');
  } catch {
    return errorScreen(scene);
  }
  const msg = $('msg');
  msg.textContent = '';
  const done = (d: { token: string; user: { name: string; picture?: string | null } }) => {
    net.setSession(d.token, d.user);
    void tableScreen(scene);
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
      google.accounts.id.renderButton($('g'), { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with' });
    } catch {
      msg.textContent = 'No se pudo cargar el login de Google';
    }
  }

  if (cfg.devLogin) {
    $('dev').innerHTML = `<small>Modo prueba · solo desarrollo</small>
      <input id="name" placeholder="Tu nombre" maxlength="30" /><button id="devgo">Entrar sin Google</button>`;
    const go = async () => {
      const name = (($('name') as HTMLInputElement).value || '').trim();
      if (!name) return;
      try {
        done(await api('/auth/dev', 'POST', { name }));
      } catch {
        msg.textContent = 'No se pudo entrar';
      }
    };
    $('devgo').onclick = go;
    $('name').addEventListener('keydown', (e) => e.key === 'Enter' && void go());
  }

  if (!cfg.googleClientId && !cfg.devLogin) msg.textContent = 'Falta configurar GOOGLE_CLIENT_ID en el backend.';
}

// ─────────────────────────────────── mesa de juego ───────────────────────────────────

interface Couple {
  id: number;
  code: string;
  role: 'fire' | 'water';
  members: number;
}

async function tableScreen(scene: Phaser.Scene) {
  let couple: Couple | null;
  try {
    couple = await api<Couple | null>('/couple');
  } catch {
    return errorScreen(scene);
  }
  if (couple) return lobbyScreen(scene, couple);

  card(`<h2>Hola, ${esc(net.user?.name ?? '')}</h2>
    <p>Crea una mesa y pásale el código a tu pareja, o únete con el código que te dio.</p>
    <button id="create">Crear mesa</button>
    <input id="code" placeholder="CÓDIGO" maxlength="6" style="text-transform:uppercase;text-align:center;letter-spacing:6px" />
    <button id="join">Unirme a una mesa</button><p id="msg" class="err"></p>
    <button id="out" class="ghost">Cerrar sesión</button><button id="back" class="ghost">← Volver</button>`);
  const msg = $('msg');
  $('back').onclick = hideUi;
  $('out').onclick = () => {
    net.logout();
    hideUi();
  };
  $('create').onclick = async () => {
    try {
      await api('/couple/create', 'POST');
      void tableScreen(scene);
    } catch {
      msg.textContent = 'No se pudo crear la mesa';
    }
  };
  const join = async () => {
    const code = ($('code') as HTMLInputElement).value.trim();
    if (!code) return;
    try {
      await api('/couple/join', 'POST', { code });
      void tableScreen(scene);
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
    /* sin conexión: se usa el progreso local */
  }
}

async function lobbyScreen(scene: Phaser.Scene, couple: Couple) {
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

  const draw = () => {
    const role = net.role ?? couple.role;
    const connected = net.code !== null;
    card(`<h2>Tu mesa</h2>
      <div class="code" id="codetxt">${esc(couple.code)}</div>
      <button id="copy" class="ghost">Copiar código</button>
      <p>Eres <b>${role === 'fire' ? 'Fuego' : 'Agua'}</b></p>
      <p class="status ${net.peerOnline ? 'ok' : ''}">${
        !connected ? 'Conectando…' : net.peerOnline ? 'Tu pareja está aquí' : 'Esperando a tu pareja…'
      }</p>
      <button id="go" ${net.peerOnline ? '' : 'disabled'}>Empezar</button>
      <button id="pick" class="ghost" ${net.peerOnline ? '' : 'disabled'}>Elegir nivel</button>
      <button id="leave" class="ghost">Salir de la mesa</button>
      <button id="back" class="ghost">← Menú</button>`);
    $('copy').onclick = () => {
      void navigator.clipboard?.writeText(couple.code);
      $('copy').textContent = '¡Copiado!';
    };
    $('go').onclick = () => {
      const lvl = nextLevelIndex(LEVELS.length);
      net.send('event', { t: 'goto', level: lvl });
      start(lvl);
    };
    $('pick').onclick = () => {
      net.send('event', { t: 'select' });
      cleanup();
      hideUi();
      scene.scene.start('LevelSelect', { online: true });
    };
    $('leave').onclick = async () => {
      cleanup();
      net.disconnect();
      try {
        await api('/couple/leave', 'POST');
      } catch {
        /* ignorar */
      }
      void tableScreen(scene);
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
    net.on('event', (e: { t: string; level?: number }) => {
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
