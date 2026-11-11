import { Ctx, DROP, el, esc, FLAME, GameDef, rnd } from './kit';

interface Level {
  name: string;
  desc: string;
  n: number;
  k: number;
  blocked?: number;
  vanish?: number;
  misere?: boolean;
  icon: string;
}

const LEVELS: Level[] = [
  { name: 'Clásico', desc: '3×3 · tres en línea', n: 3, k: 3, icon: '1' },
  { name: 'Fichas que se van', desc: '3×3 · solo 4 fichas, la más vieja desaparece', n: 3, k: 3, vanish: 4, icon: '2' },
  { name: 'Al revés', desc: '3×3 · pierde quien haga la línea', n: 3, k: 3, misere: true, icon: '3' },
  { name: 'Cuatro seguidas', desc: '4×4 · cuatro en línea', n: 4, k: 4, icon: '4' },
  { name: 'Obstáculos', desc: '5×5 · cuatro en línea con casillas bloqueadas', n: 5, k: 4, blocked: 4, icon: '5' },
  { name: 'Gran tablero', desc: '6×6 · cinco en línea', n: 6, k: 5, icon: '6' },
  { name: 'Maestro', desc: '5×5 · cuatro en línea, obstáculos y 5 fichas', n: 5, k: 4, blocked: 3, vanish: 5, icon: '7' },
];

const KEY = 'wf-ttt-unlocked';
const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

const loadUnlocked = () => {
  try {
    return Math.min(LEVELS.length - 1, Math.max(0, Number(localStorage.getItem(KEY)) || 0));
  } catch {
    return 0;
  }
};

const saveUnlocked = (v: number) => {
  try {
    localStorage.setItem(KEY, String(v));
  } catch {
    void 0;
  }
};

type Cell = 0 | 1 | 2 | null;

function lineThrough(board: Cell[], n: number, k: number, i: number, who: 0 | 1): number[] | null {
  const r = Math.floor(i / n);
  const c = i % n;
  for (const [dr, dc] of DIRS) {
    const cells = [i];
    for (const s of [1, -1]) {
      let rr = r + dr * s;
      let cc = c + dc * s;
      while (rr >= 0 && rr < n && cc >= 0 && cc < n && board[rr * n + cc] === who) {
        cells.push(rr * n + cc);
        rr += dr * s;
        cc += dc * s;
      }
    }
    if (cells.length >= k) return cells;
  }
  return null;
}

function run(board: Cell[], n: number, i: number, who: 0 | 1) {
  const r = Math.floor(i / n);
  const c = i % n;
  let best = 1;
  for (const [dr, dc] of DIRS) {
    let len = 1;
    for (const s of [1, -1]) {
      let rr = r + dr * s;
      let cc = c + dc * s;
      while (rr >= 0 && rr < n && cc >= 0 && cc < n && board[rr * n + cc] === who) {
        len++;
        rr += dr * s;
        cc += dc * s;
      }
    }
    best = Math.max(best, len);
  }
  return best;
}

function simulate(lv: Level, board: Cell[], queues: number[][], i: number, who: 0 | 1) {
  const b = [...board];
  const q = queues.map((x) => [...x]);
  b[i] = who;
  if (lv.vanish) {
    q[who].push(i);
    if (q[who].length > lv.vanish) b[q[who].shift()!] = null;
  }
  return { b, line: lineThrough(b, lv.n, lv.k, i, who) };
}

function botPick(lv: Level, board: Cell[], queues: number[][], skill: number): number {
  const legal = board.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  const random = () => legal[rnd(legal.length)];
  if (Math.random() > skill + 0.1) return random();
  const mine = legal.filter((i) => simulate(lv, board, queues, i, 1).line);
  const theirs = legal.filter((i) => simulate(lv, board, queues, i, 0).line);
  if (lv.misere) {
    const safe = legal.filter((i) => !mine.includes(i));
    const pool = safe.length ? safe : legal;
    if (Math.random() > skill) return pool[rnd(pool.length)];
    const forced = pool.filter((i) => !theirs.includes(i));
    const list = forced.length ? forced : pool;
    return list[rnd(list.length)];
  }
  if (mine.length && Math.random() < 0.5 + 0.5 * skill) return mine[rnd(mine.length)];
  if (theirs.length && Math.random() < 0.35 + 0.65 * skill) return theirs[rnd(theirs.length)];
  const mid = (lv.n - 1) / 2;
  let best = legal[0];
  let bestScore = -1e9;
  for (const i of legal) {
    const sim = simulate(lv, board, queues, i, 1).b;
    const opp = simulate(lv, board, queues, i, 0).b;
    const r = Math.floor(i / lv.n);
    const c = i % lv.n;
    const score =
      Math.pow(run(sim, lv.n, i, 1), 3) +
      0.9 * Math.pow(run(opp, lv.n, i, 0), 3) -
      (Math.abs(r - mid) + Math.abs(c - mid)) * 0.4 +
      Math.random() * 0.8;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

function makeBlocked(lv: Level): number[] {
  const out: number[] = [];
  const total = lv.n * lv.n;
  while (out.length < (lv.blocked ?? 0)) {
    const i = rnd(total);
    if (!out.includes(i) && i !== Math.floor(total / 2)) out.push(i);
  }
  return out;
}

function start(ctx: Ctx) {
  const wrap = el('div', 'tttwrap');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:14px;width:100%';
  ctx.root.append(wrap);
  let timer: number | undefined;
  ctx.cleanup(() => window.clearTimeout(timer));
  let started = false;

  const picker = () => {
    wrap.innerHTML = '';
    ctx.turn(null);
    const unlocked = ctx.solo ? loadUnlocked() : LEVELS.length - 1;
    const canPick = ctx.mode === 'local' || ctx.me === 0;
    ctx.status(canPick ? '<b>Elige un nivel</b>' : `${esc(ctx.other)} está eligiendo el nivel`);
    if (!canPick) {
      wrap.innerHTML = `<div class="gpanel"><h3>Espera</h3><p>${esc(ctx.other)} está eligiendo el nivel.</p></div>`;
      return;
    }
    const grid = el('div', 'lvgrid');
    LEVELS.forEach((lv, i) => {
      const locked = i > unlocked;
      const b = el('button', `gcard${locked ? ' locked' : ''}`);
      b.disabled = locked;
      b.innerHTML = `<span class="ic" style="background:linear-gradient(160deg,#ff9a5c,#ff4d6d);font:400 34px var(--display)">${locked ? '🔒' : lv.icon}</span>
        <span><h4>${esc(lv.name)}</h4><p>${esc(lv.desc)}</p></span>`;
      b.onclick = () => {
        const blocked = makeBlocked(lv);
        ctx.send({ go: { lv: i, blocked } });
        play(i, blocked);
      };
      grid.append(b);
    });
    wrap.append(grid);
  };

  const play = (idx: number, blocked: number[]) => {
    if (started) return;
    started = true;
    const lv = LEVELS[idx];
    const board: Cell[] = Array(lv.n * lv.n).fill(null);
    blocked.forEach((i) => (board[i] = 2));
    const queues: number[][] = [[], []];
    let turn: 0 | 1 = ctx.solo ? 0 : ctx.round % 2 === 0 ? 0 : 1;
    let over = false;

    wrap.innerHTML = '';
    const info = el('div', '', `<b>${esc(lv.name)}</b> · ${esc(lv.desc)}`);
    info.style.cssText = 'color:var(--mute);font-size:14px;text-align:center';
    const grid = el('div', 'ttt');
    grid.style.setProperty('--n', String(lv.n));
    const cells = board.map((_, i) => {
      const b = el('button');
      b.setAttribute('aria-label', `Casilla ${i + 1}`);
      b.onclick = () => click(i);
      grid.append(b);
      return b;
    });
    wrap.append(info, grid);

    const label = () => {
      ctx.turn(turn);
      if (ctx.solo) ctx.status(turn === 0 ? '<b>Tu turno</b>' : 'El robot está pensando…');
      else if (ctx.local) ctx.status(`Turno de <b>${esc(ctx.names[turn])}</b>`);
      else ctx.status(turn === ctx.me ? '<b>Tu turno</b>' : `Turno de ${esc(ctx.other)}`);
    };

    const render = (win?: number[]) => {
      const oldest = lv.vanish && queues[turn].length >= lv.vanish ? queues[turn][0] : -1;
      cells.forEach((b, i) => {
        const v = board[i];
        const cls = v === null ? '' : v === 2 ? 'block' : `p${v}`;
        b.className = `${cls}${i === oldest && !over ? ' old' : ''}${win?.includes(i) ? ' win' : ''}`;
        b.innerHTML = v === 0 ? FLAME : v === 1 ? DROP : '';
        b.disabled = over || v !== null;
      });
    };

    const end = (winner: 0 | 1 | null, line?: number[]) => {
      over = true;
      render(line);
      if (ctx.solo && winner === 0) saveUnlocked(Math.max(loadUnlocked(), Math.min(LEVELS.length - 1, idx + 1)));
      timer = window.setTimeout(() => ctx.finish({ winner, sub: lv.name }), winner === null ? 600 : 900);
    };

    const play1 = (i: number, who: 0 | 1) => {
      if (over || board[i] !== null || who !== turn) return;
      board[i] = who;
      if (lv.vanish) {
        queues[who].push(i);
        if (queues[who].length > lv.vanish) board[queues[who].shift()!] = null;
      }
      const line = lineThrough(board, lv.n, lv.k, i, who);
      if (line) return end(lv.misere ? ((1 - who) as 0 | 1) : who, line);
      if (board.every((v) => v !== null)) return end(null);
      turn = turn === 0 ? 1 : 0;
      render();
      label();
      if (ctx.solo && turn === 1) {
        timer = window.setTimeout(() => play1(botPick(lv, board, queues, 0.2 + 0.75 * (idx / (LEVELS.length - 1))), 1), 550);
      }
    };

    const click = (i: number) => {
      if (over || board[i] !== null) return;
      if (ctx.solo) {
        if (turn !== 0) return;
        play1(i, 0);
        return;
      }
      if (ctx.local) {
        play1(i, turn);
        return;
      }
      if (turn !== ctx.me) return;
      play1(i, ctx.me);
      ctx.send({ i });
    };

    ctx.on((d) => {
      if (typeof d?.i === 'number') play1(d.i, ctx.me === 0 ? 1 : 0);
    });

    render();
    label();
    if (ctx.solo && turn === 1) timer = window.setTimeout(() => play1(botPick(lv, board, queues, 0.2), 1), 550);
  };

  ctx.on((d) => {
    if (d?.go && !started) play(d.go.lv as number, d.go.blocked as number[]);
  });

  picker();
}

export const ttt: GameDef = {
  id: 'ttt',
  name: 'Tres en raya',
  tagline: '7 niveles: contra otro jugador o contra el robot',
  icon: '⭕',
  from: '#ff9a5c',
  to: '#ff4d6d',
  online: true,
  local: true,
  solo: true,
  start,
};
