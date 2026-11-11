import './games.css';
import { net } from '../net';
import { MESSAGES } from '../messages';

export type Winner = 0 | 1 | null | 'team';
export interface Outcome {
  winner: Winner;
  sub?: string;
}

export interface Ctx {
  root: HTMLElement;
  mode: 'online' | 'local';
  local: boolean;
  solo: boolean;
  me: 0 | 1;
  names: [string, string];
  other: string;
  round: number;
  send(d: unknown): void;
  on(fn: (d: any) => void): void;
  cleanup(fn: () => void): void;
  init<T>(make: () => T, use: (s: T) => void): void;
  status(html: string): void;
  turn(i: 0 | 1 | null): void;
  finish(o: Outcome): void;
  exit(): void;
}

export interface GameDef {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  from: string;
  to: string;
  online: boolean;
  local: boolean;
  solo?: boolean;
  start(ctx: Ctx): void;
}

export const FLAME = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5c.9 4 6.5 6.2 6.5 12.4a6.5 6.5 0 0 1-13 0c0-3.2 2-4.6 3-6.8.7 1.6 1.6 2 2.4 1.3C11.5 6.6 11.8 4 12 1.5z"/></svg>';
export const DROP = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5s7 7.3 7 12.4a7 7 0 0 1-14 0C5 8.8 12 1.5 12 1.5z"/></svg>';

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html) n.innerHTML = html;
  return n;
}

export const rnd = (n: number) => Math.floor(Math.random() * n);

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function norm(s: string) {
  return s
    .toUpperCase()
    .replace(/Ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0001/g, 'Ñ')
    .replace(/[^A-ZÑ]/g, '');
}

export function gameRoot() {
  let root = document.getElementById('games');
  if (!root) {
    root = document.createElement('div');
    root.id = 'games';
    document.body.appendChild(root);
  }
  return root;
}

let current: Session | null = null;
let exitHandler: () => void = () => closeGames();

export function setExitHandler(fn: () => void) {
  exitHandler = fn;
}

export function closeGames() {
  current?.dispose();
  current = null;
  document.getElementById('games')?.remove();
}

export function launchGame(def: GameDef, mode: 'online' | 'local' | 'solo') {
  current?.dispose();
  current = new Session(def, mode);
}

const firstName = () => (net.user?.name ?? '').split(' ')[0] || 'Tú';

class Session {
  private root: HTMLElement;
  private body!: HTMLElement;
  private statusEl!: HTMLElement;
  private againBtn!: HTMLButtonElement;
  private layer!: HTMLElement;
  private chips: { box: HTMLElement; n: HTMLElement; s: HTMLElement }[] = [];
  private handlers: ((d: any) => void)[] = [];
  private cleanups: (() => void)[] = [];
  private offs: (() => void)[] = [];
  private score: [number, number] = [0, 0];
  private round = -1;
  private hostState: { v: unknown } | null = null;
  private guestReady = false;
  private guestUse: ((s: any) => void) | null = null;
  private me: 0 | 1;
  private names: [string, string];
  private alive = true;

  constructor(
    private def: GameDef,
    private mode: 'online' | 'local' | 'solo',
  ) {
    this.me = mode === 'online' && net.role === 'water' ? 1 : 0;
    this.names = mode === 'solo' ? ['Tú', 'Robot'] : mode === 'local' ? ['Jugador 1', 'Jugador 2'] : this.me === 0 ? [firstName(), 'Jugador 2'] : ['Jugador 1', firstName()];
    this.root = gameRoot();
    this.root.innerHTML = '';
    this.root.style.display = 'flex';
    this.build();

    if (mode === 'online') {
      this.offs.push(
        net.on('event', (e: any) => this.incoming(e)),
        net.on('peer-left', () => this.peerGone('El otro jugador se desconectó')),
        net.on('disconnected', () => this.peerGone('Se perdió la conexión')),
        net.on('peer-joined', () => {
          if (this.me === 0) this.restartBoth();
          else this.hideLayer();
        }),
      );
    }
    this.begin();
  }

  private build() {
    const top = el('div', 'g-top');
    const back = el('button', 'g-back', '‹');
    back.setAttribute('aria-label', 'Salir');
    back.onclick = () => this.exit();
    const home = el('button', 'g-back g-home', '⌂');
    home.setAttribute('aria-label', 'Menú principal');
    home.onclick = () => this.home();
    const title = el('div', 'g-title');
    title.textContent = this.def.name;
    const chips = el('div', 'g-chips');
    [0, 1].forEach((i) => {
      const box = el('div', `g-chip p${i}`);
      const ic = el('i', '', i === 0 ? FLAME : DROP);
      const n = el('span');
      const s = el('b', '', '0');
      box.append(ic, n, s);
      chips.append(box);
      this.chips.push({ box, n, s });
    });
    top.append(back, home, title, chips);

    const status = el('div', 'g-status');
    this.statusEl = el('span');
    this.againBtn = el('button', 'gbtn mini gold', 'Otra vez');
    this.againBtn.hidden = true;
    this.againBtn.onclick = () => this.again();
    status.append(this.statusEl, this.againBtn);

    this.body = el('div', 'g-body');
    this.layer = el('div', 'g-layer');
    this.root.append(top, status, this.body, this.layer);
    this.renderChips();
  }

  private renderChips() {
    this.chips.forEach((c, i) => {
      c.n.textContent = this.names[i];
      c.s.textContent = String(this.score[i]);
    });
  }

  private begin() {
    this.runCleanups();
    this.round++;
    this.handlers = [];
    this.hostState = null;
    this.guestReady = false;
    this.guestUse = null;
    this.againBtn.hidden = true;
    this.hideLayer();
    this.body.innerHTML = '';
    this.body.scrollTop = 0;
    this.statusEl.textContent = '';
    this.chips.forEach((c) => c.box.classList.remove('on'));
    this.def.start(this.ctx());
  }

  private runCleanups() {
    const list = this.cleanups;
    this.cleanups = [];
    list.forEach((f) => f());
  }

  private ctx(): Ctx {
    return {
      root: this.body,
      mode: this.mode === 'online' ? 'online' : 'local',
      local: this.mode !== 'online',
      solo: this.mode === 'solo',
      me: this.me,
      names: this.names,
      other: this.names[this.me === 0 ? 1 : 0],
      round: this.round,
      send: (d) => {
        if (this.mode === 'online') net.send('event', { t: 'g', id: this.def.id, d });
      },
      on: (fn) => this.handlers.push(fn),
      cleanup: (fn) => this.cleanups.push(fn),
      init: (make, use) => this.init(make, use),
      status: (html) => {
        this.statusEl.innerHTML = html;
      },
      turn: (i) => this.chips.forEach((c, k) => c.box.classList.toggle('on', i === k)),
      finish: (o) => this.finish(o),
      exit: () => this.exit(),
    };
  }

  private sys(sys: string, d?: unknown) {
    if (this.mode === 'online') net.send('event', { t: 'g', id: this.def.id, sys, d });
  }

  private init<T>(make: () => T, use: (s: T) => void) {
    if (this.mode !== 'online') return use(make());
    if (this.me === 0) {
      const v = make();
      use(v);
      this.hostState = { v };
      if (this.guestReady) this.sys('init', v);
    } else {
      this.guestUse = use;
      this.sys('ready');
    }
  }

  private incoming(e: any) {
    if (!this.alive || e?.t !== 'g' || e.id !== this.def.id) return;
    if (e.sys === 'ready') {
      this.guestReady = true;
      if (this.hostState) this.sys('init', this.hostState.v);
    } else if (e.sys === 'init') {
      this.guestUse?.(e.d);
      this.guestUse = null;
    } else if (e.sys === 'again') {
      this.begin();
    } else if (e.sys === 'bye') {
      this.peerGone('El otro jugador salió del juego');
    } else if (!e.sys) {
      this.handlers.forEach((fn) => fn(e.d));
    }
  }

  private showLayer(html: string) {
    this.layer.innerHTML = html;
    this.layer.classList.add('on');
  }

  private hideLayer() {
    this.layer.classList.remove('on');
    this.layer.innerHTML = '';
  }

  private peerGone(text: string) {
    this.showLayer(`<div class="gpanel"><h3>Pausa</h3><p>${esc(text)}</p><div class="grow"><button class="gbtn ghost" id="gx">Cambiar de juego</button></div></div>`);
    (this.layer.querySelector('#gx') as HTMLElement).onclick = () => this.exit();
  }

  private restartBoth() {
    this.sys('again');
    this.begin();
  }

  private again() {
    if (this.mode === 'online') this.restartBoth();
    else this.begin();
  }

  private finish(o: Outcome) {
    if (o.winner === 0 || o.winner === 1) this.score[o.winner]++;
    this.renderChips();
    this.chips.forEach((c) => c.box.classList.remove('on'));
    const w = o.winner;
    let title: string;
    if (w === 'team') title = '¡Lo lograron!';
    else if (w === null) title = 'Empate';
    else if (this.mode === 'solo') title = w === 0 ? '¡Ganaste!' : 'Ganó el robot';
    else if (this.mode === 'local') title = `Ganó ${this.names[w]}`;
    else title = w === this.me ? '¡Ganaste!' : `Ganó ${this.names[w]}`;
    const sweet = MESSAGES[rnd(MESSAGES.length)];
    this.showLayer(`<div class="gpanel"><h3>${esc(title)}</h3>${o.sub ? `<p>${esc(o.sub)}</p>` : ''}<p class="sweet">${esc(sweet)}</p>
      <div class="grow"><button class="gbtn gold" id="ga">Otra vez</button><button class="gbtn ghost" id="gv">Ver juego</button><button class="gbtn ghost" id="gx">Salir</button></div></div>`);
    (this.layer.querySelector('#ga') as HTMLElement).onclick = () => this.again();
    (this.layer.querySelector('#gv') as HTMLElement).onclick = () => {
      this.hideLayer();
      this.againBtn.hidden = false;
    };
    (this.layer.querySelector('#gx') as HTMLElement).onclick = () => this.exit();
  }

  home() {
    if (!this.alive) return;
    this.sys('bye');
    closeGames();
  }

  exit() {
    if (!this.alive) return;
    this.sys('bye');
    this.dispose();
    if (current === this) current = null;
    exitHandler();
  }

  dispose() {
    this.alive = false;
    this.runCleanups();
    this.offs.forEach((o) => o());
    this.offs = [];
    this.root.innerHTML = '';
  }
}
