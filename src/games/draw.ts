import { Ctx, el, esc, GameDef, norm, shuffle } from './kit';

const WORDS = [
  'corazón', 'pizza', 'gato', 'casa', 'luna', 'sol', 'árbol', 'flor', 'coche', 'playa', 'helado', 'guitarra', 'bicicleta',
  'paraguas', 'mariposa', 'castillo', 'avión', 'pastel', 'oso', 'estrella', 'cohete', 'anillo', 'beso', 'regalo', 'montaña',
  'pez', 'reloj', 'gafas', 'libro', 'cámara', 'café', 'tortuga', 'conejo', 'dragón', 'fantasma', 'cama', 'zapato', 'nube',
  'pingüino', 'hamburguesa', 'rosa', 'barco', 'tren', 'sombrero', 'elefante', 'jirafa', 'araña', 'cangrejo', 'robot',
];

const COLORS = ['#1b1b1f', '#e63946', '#ff9f1c', '#f2c94c', '#2a9d8f', '#3b8cff', '#8e44ad', '#8d5a2b'];
const SIZES = [4, 9, 18];
const ROUNDS = 4;
const DRAW_SECONDS = 75;
const GUESS_SECONDS = 40;
const TRIES = 3;
const W = 800;
const H = 600;
const PAPER = '#fff8ec';

type Phase = 'pick' | 'draw' | 'guess' | 'over';
interface Seg {
  a: number[];
  c: string;
  s: number;
}

function start(ctx: Ctx) {
  let idx = 0;
  let hits = 0;
  let phase: Phase = 'pick';
  let current = '';
  let tries = 0;
  let timerId: number | undefined;
  let pump: number | undefined;
  let next: number | undefined;
  let watchdog: number | undefined;
  ctx.cleanup(() => {
    window.clearTimeout(watchdog);
    window.clearInterval(timerId);
    window.clearInterval(pump);
    window.clearTimeout(next);
  });

  const box = el('div', 'draw');
  ctx.root.append(box);

  const drawerOf = (i: number) => ((i + ctx.round) % 2) as 0 | 1;
  const iDraw = () => drawerOf(idx) === ctx.me;

  let gSeg: ((s: Seg) => void) | null = null;
  let gClear: (() => void) | null = null;
  let addLog: ((html: string) => void) | null = null;
  let onNo: ((left: number) => void) | null = null;
  let onGuessPhase: (() => void) | null = null;

  const paint = (g: CanvasRenderingContext2D, s: Seg) => {
    g.strokeStyle = s.c;
    g.lineWidth = s.s;
    g.beginPath();
    g.moveTo(s.a[0] * W, s.a[1] * H);
    g.lineTo(s.a[2] * W, s.a[3] * H);
    g.stroke();
  };

  const makeCanvas = () => {
    const c = el('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    return { c, g };
  };

  const countdown = (out: HTMLElement, from: number, zero: () => void) => {
    window.clearInterval(timerId);
    let left = from;
    out.textContent = String(left);
    out.classList.remove('low');
    timerId = window.setInterval(() => {
      left--;
      out.textContent = String(Math.max(0, left));
      out.classList.toggle('low', left <= 10);
      if (left <= 0) {
        window.clearInterval(timerId);
        zero();
      }
    }, 1000);
  };

  const dots = (left: number) => '●'.repeat(Math.max(0, left)) + '○'.repeat(Math.max(0, TRIES - left));

  const status = () => ctx.status(`Ronda <b>${idx + 1}</b> de ${ROUNDS} · aciertos ${hits}`);

  const round = () => {
    window.clearInterval(timerId);
    window.clearInterval(pump);
    phase = 'pick';
    tries = 0;
    current = '';
    gSeg = gClear = addLog = onNo = onGuessPhase = null;
    ctx.turn(drawerOf(idx));
    box.innerHTML = '';
    status();
    if (iDraw()) choose();
    else box.innerHTML = `<div class="gpanel"><h3>Espera</h3><p>${esc(ctx.other)} está eligiendo qué dibujar.</p></div>`;
  };

  const choose = () => {
    const panel = el('div', 'gpanel');
    panel.innerHTML = '<h3>Elige</h3><p>¿Qué vas a dibujar?</p>';
    const list = el('div', 'choices');
    shuffle(WORDS)
      .slice(0, 3)
      .forEach((w) => {
        const b = el('button', 'gbtn lagoon');
        b.textContent = w;
        b.onclick = () => beginDrawing(w);
        list.append(b);
      });
    panel.append(list);
    box.innerHTML = '';
    box.append(panel);
  };

  const beginDrawing = (word: string) => {
    current = word;
    phase = 'draw';
    ctx.send({ st: { sp: [...word].map((ch) => (ch === ' ' ? 1 : 0)), t: DRAW_SECONDS } });
    const { c, g } = makeCanvas();
    let color = COLORS[0];
    let size = SIZES[1];
    let last: number[] | null = null;
    let queue: Seg[] = [];

    box.innerHTML = '';
    const head = el('div', 'tools');
    const timer = el('div', 'timer');
    head.append(timer, el('div', '', `Dibuja: <b>${esc(word)}</b>`));

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
      if (phase !== 'draw') return;
      g.fillStyle = PAPER;
      g.fillRect(0, 0, W, H);
      ctx.send({ cl: 1 });
    };
    tools.append(clear);

    const actions = el('div', 'grow');
    const done = el('button', 'gbtn gold', 'Ya está ✓ ¡que adivine!');
    actions.append(done);
    const log = el('div', 'gl');
    const wrap = el('div', 'cwrap');
    wrap.append(c);
    const side = el('div', 'dside');
    side.append(head, tools, actions, log);
    box.append(wrap, side);

    addLog = (html) => log.prepend(el('div', '', html));

    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
    };
    const add = (a: number[]) => {
      const s: Seg = { a, c: color, s: size };
      paint(g, s);
      queue.push(s);
    };
    const shell = () => c.closest('#games');
    let calm: number | undefined;
    c.addEventListener('pointerdown', (e) => {
      if (phase !== 'draw') return;
      e.preventDefault();
      window.clearTimeout(calm);
      shell()?.classList.add('busy');
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
        void 0;
      }
      const p = pos(e);
      last = p;
      add([p[0], p[1], p[0] + 0.0004, p[1]]);
    });
    c.addEventListener('pointermove', (e) => {
      if (!last || phase !== 'draw') return;
      e.preventDefault();
      const p = pos(e);
      add([last[0], last[1], p[0], p[1]]);
      last = p;
    });
    const up = () => {
      last = null;
      window.clearTimeout(calm);
      calm = window.setTimeout(() => shell()?.classList.remove('busy'), 900);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('lostpointercapture', up);
    pump = window.setInterval(() => {
      if (!queue.length) return;
      ctx.send({ sg: queue });
      queue = [];
    }, 70);

    const finish = () => {
      if (phase !== 'draw') return;
      phase = 'guess';
      last = null;
      if (queue.length) {
        ctx.send({ sg: queue });
        queue = [];
      }
      window.clearInterval(pump);
      ctx.send({ dn: 1 });
      tools.hidden = true;
      actions.hidden = true;
      head.querySelector('b')!.parentElement!.innerHTML = `Palabra: <b>${esc(word)}</b> · ${esc(ctx.other)} adivina (${TRIES} intentos)`;
      countdown(timer, GUESS_SECONDS, () => conclude(false, word));
    };
    done.onclick = finish;
    countdown(timer, DRAW_SECONDS, finish);
  };

  const guessView = (sp: number[]) => {
    phase = 'draw';
    tries = TRIES;
    window.clearTimeout(watchdog);
    watchdog = window.setTimeout(() => conclude(false, '—'), (DRAW_SECONDS + GUESS_SECONDS + 12) * 1000);
    const { c, g } = makeCanvas();
    box.innerHTML = '';
    const head = el('div', 'tools');
    const timer = el('div', 'timer');
    const blanks = el('div', 'blanks');
    sp.forEach((s) => blanks.append(el('span', s ? 'sp' : '')));
    head.append(timer, blanks);
    const info = el('div', 'gl');
    info.textContent = `${ctx.other} está dibujando…`;
    const left = el('div', '', dots(tries));
    left.style.cssText = 'letter-spacing:4px;color:var(--gold);font-size:18px';
    const row = el('div', 'guessrow');
    const input = el('input', 'ginput plain');
    input.placeholder = '¿Qué es?';
    input.maxLength = 24;
    input.autocomplete = 'off';
    input.disabled = true;
    const send = el('button', 'gbtn lagoon', 'Enviar');
    send.disabled = true;
    row.append(input, send);
    const log = el('div', 'gl');
    const wrap = el('div', 'cwrap');
    wrap.append(c);
    const side = el('div', 'dside');
    side.append(head, info, left, row, log);
    box.append(wrap, side);

    let waiting = false;
    const refresh = () => {
      const on = phase === 'guess' && tries > 0 && !waiting;
      input.disabled = !on;
      send.disabled = !on;
      left.textContent = dots(tries);
    };
    gSeg = (s) => paint(g, s);
    gClear = () => {
      g.fillStyle = PAPER;
      g.fillRect(0, 0, W, H);
    };
    addLog = (html) => log.prepend(el('div', '', html));
    onGuessPhase = () => {
      phase = 'guess';
      info.textContent = '¡Ya puedes adivinar!';
      countdown(timer, GUESS_SECONDS, () => undefined);
      refresh();
      input.focus();
    };
    onNo = (n) => {
      tries = n;
      waiting = false;
      refresh();
      if (n > 0) input.focus();
    };
    const go = () => {
      const t = input.value.trim();
      if (!t || phase !== 'guess' || waiting || tries <= 0) return;
      input.value = '';
      waiting = true;
      ctx.send({ gs: t });
      addLog?.(`💬 ${esc(t)}`);
      refresh();
    };
    send.onclick = go;
    input.addEventListener('keydown', (e) => e.key === 'Enter' && go());
    countdown(timer, DRAW_SECONDS, () => undefined);
  };

  const conclude = (ok: boolean, word: string) => {
    if (phase === 'over') return;
    const wasDrawer = iDraw();
    phase = 'over';
    window.clearTimeout(watchdog);
    window.clearInterval(timerId);
    window.clearInterval(pump);
    if (ok) hits++;
    if (wasDrawer) ctx.send({ end: { ok, word } });
    const note = el('div', 'gpanel');
    note.innerHTML = `<h3>${ok ? '¡Acertaron!' : 'Se acabó'}</h3>${word === '—' ? '' : `<p>La palabra era <b>${esc(word)}</b></p>`}`;
    box.append(note);
    status();
    next = window.setTimeout(() => {
      idx++;
      if (idx >= ROUNDS) ctx.finish({ winner: 'team', sub: `${hits} de ${ROUNDS} dibujos adivinados` });
      else round();
    }, 2600);
  };

  ctx.on((d) => {
    if (d?.st) guessView(d.st.sp);
    else if (d?.sg) {
      for (const s of d.sg as Seg[]) gSeg?.(s);
    } else if (d?.cl) gClear?.();
    else if (d?.dn) onGuessPhase?.();
    else if (typeof d?.gs === 'string') {
      if (phase !== 'guess' || !iDraw()) return;
      const t = d.gs as string;
      const ok = norm(t) === norm(current);
      tries++;
      addLog?.(ok ? `✔ <b>${esc(t)}</b>` : `✖ ${esc(t)}`);
      if (ok) conclude(true, current);
      else if (tries >= TRIES) conclude(false, current);
      else ctx.send({ no: { left: TRIES - tries } });
    } else if (d?.no) onNo?.(d.no.left as number);
    else if (d?.end) conclude(d.end.ok as boolean, d.end.word as string);
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
