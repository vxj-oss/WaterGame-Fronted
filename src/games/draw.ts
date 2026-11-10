import { Ctx, el, esc, GameDef, norm, shuffle } from './kit';

const WORDS = [
  'corazón', 'pizza', 'gato', 'casa', 'luna', 'sol', 'árbol', 'flor', 'coche', 'playa', 'helado', 'guitarra', 'bicicleta',
  'paraguas', 'mariposa', 'castillo', 'avión', 'pastel', 'oso', 'estrella', 'cohete', 'anillo', 'beso', 'regalo', 'montaña',
  'pez', 'reloj', 'gafas', 'libro', 'cámara', 'café', 'tortuga', 'conejo', 'dragón', 'fantasma', 'cama', 'zapato', 'nube',
  'pingüino', 'hamburguesa', 'rosa', 'barco', 'tren', 'sombrero', 'elefante', 'jirafa', 'araña', 'cangrejo', 'cohete', 'robot',
];

const COLORS = ['#1b1b1f', '#e63946', '#ff9f1c', '#f2c94c', '#2a9d8f', '#3b8cff', '#8e44ad', '#8d5a2b'];
const SIZES = [4, 9, 18];
const ROUNDS = 4;
const SECONDS = 75;
const W = 800;
const H = 600;

function start(ctx: Ctx) {
  let idx = 0;
  let hits = 0;
  let ended = false;
  let timerId: number | undefined;
  let pump: number | undefined;
  let next: number | undefined;
  ctx.cleanup(() => {
    window.clearInterval(timerId);
    window.clearInterval(pump);
    window.clearTimeout(next);
  });

  const box = el('div', 'draw');
  ctx.root.append(box);

  const drawerOf = (i: number) => ((i + ctx.round) % 2) as 0 | 1;

  const round = () => {
    window.clearInterval(timerId);
    window.clearInterval(pump);
    ended = false;
    const drawer = drawerOf(idx);
    const iDraw = drawer === ctx.me;
    ctx.turn(drawer);
    box.innerHTML = '';
    ctx.status(`Ronda <b>${idx + 1}</b> de ${ROUNDS} · aciertos ${hits}`);
    if (iDraw) choose();
    else waitWord();
  };

  const waitWord = () => {
    box.innerHTML = `<div class="gpanel"><h3>Espera</h3><p>${esc(ctx.other)} está eligiendo qué dibujar.</p></div>`;
  };

  const choose = () => {
    const opts = shuffle(WORDS).slice(0, 3);
    const panel = el('div', 'gpanel');
    panel.innerHTML = '<h3>Elige</h3><p>¿Qué vas a dibujar?</p>';
    const list = el('div', 'choices');
    opts.forEach((w) => {
      const b = el('button', 'gbtn lagoon');
      b.textContent = w;
      b.onclick = () => begin(w);
      list.append(b);
    });
    panel.append(list);
    box.innerHTML = '';
    box.append(panel);
  };

  const makeCanvas = () => {
    const c = el('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff8ec';
    g.fillRect(0, 0, W, H);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    return { c, g };
  };

  const seg = (g: CanvasRenderingContext2D, a: number[], color: string, size: number) => {
    g.strokeStyle = color;
    g.lineWidth = size;
    g.beginPath();
    g.moveTo(a[0] * W, a[1] * H);
    g.lineTo(a[2] * W, a[3] * H);
    g.stroke();
  };

  const countdown = (el: HTMLElement, from: number) => {
    let left = from;
    el.textContent = String(left);
    window.clearInterval(timerId);
    timerId = window.setInterval(() => {
      left--;
      el.textContent = String(Math.max(0, left));
      el.classList.toggle('low', left <= 10);
      if (left <= 0) {
        window.clearInterval(timerId);
        if (ctx.me === drawerOf(idx) && !ended) conclude(false, current);
      }
    }, 1000);
  };

  let current = '';
  let gSeg: ((a: number[], color: string, size: number) => void) | null = null;
  let gClear: (() => void) | null = null;
  let addGuess: ((t: string, ok?: boolean) => void) | null = null;

  const begin = (word: string) => {
    current = word;
    ctx.send({ st: { n: word.length, t: SECONDS, sp: [...word].map((ch) => (ch === ' ' ? 1 : 0)) } });
    const { c, g } = makeCanvas();
    let color = COLORS[0];
    let size = SIZES[1];
    let last: number[] | null = null;
    let queue: { a: number[]; c: string; s: number }[] = [];

    box.innerHTML = '';
    const head = el('div', 'tools');
    const timer = el('div', 'timer');
    head.append(timer);
    const wordTag = el('div', '', `Dibuja: <b>${esc(word)}</b>`);
    head.append(wordTag);
    const tools = el('div', 'tools');
    COLORS.forEach((col, i) => {
      const s = el('button', `swatch${i === 0 ? ' on' : ''}`);
      s.style.background = col;
      s.setAttribute('aria-label', `Color ${i + 1}`);
      s.onclick = () => {
        color = col;
        tools.querySelectorAll('.swatch').forEach((x) => x.classList.remove('on'));
        s.classList.add('on');
      };
      tools.append(s);
    });
    SIZES.forEach((sz, i) => {
      const b = el('button', `sz${i === 1 ? ' on' : ''}`, `<i style="width:${sz}px;height:${sz}px"></i>`);
      b.setAttribute('aria-label', `Grosor ${i + 1}`);
      b.onclick = () => {
        size = sz;
        tools.querySelectorAll('.sz').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      };
      tools.append(b);
    });
    const clear = el('button', 'gbtn mini ghost', 'Borrar');
    clear.onclick = () => {
      g.fillStyle = '#fff8ec';
      g.fillRect(0, 0, W, H);
      ctx.send({ cl: 1 });
    };
    tools.append(clear);
    const log = el('div', 'gl');
    box.append(head, c, tools, log);

    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
    };
    c.addEventListener('pointerdown', (e) => {
      if (ended) return;
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
        void 0;
      }
      const p = pos(e);
      last = p;
      const a = [p[0], p[1], p[0] + 0.0001, p[1]];
      seg(g, a, color, size);
      queue.push({ a, c: color, s: size });
    });
    c.addEventListener('pointermove', (e) => {
      if (!last || ended) return;
      const p = pos(e);
      const a = [last[0], last[1], p[0], p[1]];
      seg(g, a, color, size);
      queue.push({ a, c: color, s: size });
      last = p;
    });
    const up = () => {
      last = null;
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    pump = window.setInterval(() => {
      if (!queue.length) return;
      ctx.send({ sg: queue });
      queue = [];
    }, 70);

    addGuess = (t, ok) => {
      const line = el('div', '', ok === undefined ? `💬 ${esc(t)}` : ok ? `✔ <b>${esc(t)}</b>` : `✖ ${esc(t)}`);
      log.prepend(line);
    };
    countdown(timer, SECONDS);
  };

  const guessView = (sp: number[]) => {
    const { c, g } = makeCanvas();
    box.innerHTML = '';
    const head = el('div', 'tools');
    const timer = el('div', 'timer');
    head.append(timer);
    const blanks = el('div', 'blanks');
    sp.forEach((s) => blanks.append(el('span', s ? 'sp' : '')));
    head.append(blanks);
    const row = el('div', 'guessrow');
    const input = el('input', 'ginput plain');
    input.placeholder = '¿Qué es?';
    input.maxLength = 24;
    input.autocomplete = 'off';
    const send = el('button', 'gbtn lagoon', 'Enviar');
    row.append(input, send);
    const log = el('div', 'gl');
    box.append(head, c, row, log);
    gSeg = (a, color, size) => seg(g, a, color, size);
    gClear = () => {
      g.fillStyle = '#fff8ec';
      g.fillRect(0, 0, W, H);
    };
    addGuess = (t, ok) => {
      log.prepend(el('div', '', ok === undefined ? `💬 ${esc(t)}` : ok ? `✔ <b>${esc(t)}</b>` : `✖ ${esc(t)}`));
    };
    const go = () => {
      const t = input.value.trim();
      if (!t || ended) return;
      input.value = '';
      ctx.send({ gs: t });
      addGuess?.(t, undefined);
    };
    send.onclick = go;
    input.addEventListener('keydown', (e) => e.key === 'Enter' && go());
    countdown(timer, SECONDS);
  };

  const conclude = (ok: boolean, word: string) => {
    if (ended) return;
    ended = true;
    window.clearInterval(timerId);
    window.clearInterval(pump);
    if (ok) hits++;
    if (ctx.me === drawerOf(idx)) ctx.send({ end: { ok, word } });
    const note = el('div', 'gpanel');
    note.innerHTML = `<h3>${ok ? '¡Acertaron!' : 'Se acabó'}</h3><p>La palabra era <b>${esc(word)}</b></p>`;
    box.append(note);
    ctx.status(`Ronda <b>${idx + 1}</b> de ${ROUNDS} · aciertos ${hits}`);
    next = window.setTimeout(() => {
      idx++;
      if (idx >= ROUNDS) {
        ctx.finish({ winner: 'team', sub: `${hits} de ${ROUNDS} dibujos adivinados` });
      } else round();
    }, 2400);
  };

  ctx.on((d) => {
    if (d?.st) guessView(d.st.sp);
    else if (d?.sg) {
      for (const s of d.sg as { a: number[]; c: string; s: number }[]) gSeg?.(s.a, s.c, s.s);
    } else if (d?.cl) gClear?.();
    else if (typeof d?.gs === 'string') {
      const t = d.gs as string;
      const ok = norm(t) === norm(current);
      addGuess?.(t, ok);
      if (ok) conclude(true, current);
    } else if (d?.end) {
      conclude(d.end.ok, d.end.word);
    }
  });

  round();
}

export const draw: GameDef = {
  id: 'draw',
  name: 'Dibuja y adivina',
  tagline: 'Uno dibuja, el otro adivina',
  icon: '🎨',
  from: '#fbbf24',
  to: '#f97316',
  online: true,
  local: false,
  start,
};
