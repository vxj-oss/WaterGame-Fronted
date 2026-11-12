import { Ctx, el, esc, GameDef } from './kit';

const N = 8;

interface Piece {
  c: 0 | 1;
  k: boolean;
}
type Board = (Piece | null)[][];

interface Move {
  fr: number;
  fc: number;
  tr: number;
  tc: number;
  caps: [number, number][];
}

const DIRS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const forward = (c: 0 | 1) => (c === 0 ? -1 : 1);
const inside = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;

function initial(): Board {
  return Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, c): Piece | null => {
      if ((r + c) % 2 === 0) return null;
      if (r < 3) return { c: 1, k: false };
      if (r > 4) return { c: 0, k: false };
      return null;
    }),
  );
}

const clone = (b: Board): Board => b.map((row) => row.map((p) => (p ? { ...p } : null)));

function jumps(b: Board, sr: number, sc: number, r: number, c: number, p: Piece, taken: [number, number][], out: Move[]) {
  let any = false;
  const dirs = p.k ? DIRS : DIRS.filter(([dr]) => dr === forward(p.c));
  for (const [dr, dc] of dirs) {
    const mr = r + dr;
    const mc = c + dc;
    const lr = r + 2 * dr;
    const lc = c + 2 * dc;
    if (!inside(lr, lc)) continue;
    const mid = b[mr][mc];
    if (!mid || mid.c === p.c || taken.some(([a, d]) => a === mr && d === mc)) continue;
    const landFree = !b[lr][lc] || (lr === sr && lc === sc);
    if (!landFree) continue;
    any = true;
    const nextTaken: [number, number][] = [...taken, [mr, mc]];
    const crowns = !p.k && lr === (p.c === 0 ? 0 : N - 1);
    if (crowns) out.push({ fr: sr, fc: sc, tr: lr, tc: lc, caps: nextTaken });
    else jumps(b, sr, sc, lr, lc, p, nextTaken, out);
  }
  if (!any && taken.length) out.push({ fr: sr, fc: sc, tr: r, tc: c, caps: taken });
}

function movesFor(b: Board, who: 0 | 1): Move[] {
  const caps: Move[] = [];
  const steps: Move[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const p = b[r][c];
      if (!p || p.c !== who) continue;
      jumps(b, r, c, r, c, p, [], caps);
      const dirs = p.k ? DIRS : DIRS.filter(([dr]) => dr === forward(p.c));
      for (const [dr, dc] of dirs) {
        const tr = r + dr;
        const tc = c + dc;
        if (inside(tr, tc) && !b[tr][tc]) steps.push({ fr: r, fc: c, tr, tc, caps: [] });
      }
    }
  }
  return caps.length ? caps : steps;
}

function apply(b: Board, m: Move): Board {
  const n = clone(b);
  const p = n[m.fr][m.fc]!;
  n[m.fr][m.fc] = null;
  for (const [r, c] of m.caps) n[r][c] = null;
  n[m.tr][m.tc] = p;
  if (!p.k && m.tr === (p.c === 0 ? 0 : N - 1)) p.k = true;
  return n;
}

function start(ctx: Ctx) {
  let board = initial();
  let turn: 0 | 1 = ctx.round % 2 === 0 ? 0 : 1;
  let quiet = 0;
  let over = false;
  let sel: [number, number] | null = null;
  let last: Move | null = null;
  let timer: number | undefined;
  let sure = false;
  let sureTimer: number | undefined;
  ctx.cleanup(() => {
    window.clearTimeout(timer);
    window.clearTimeout(sureTimer);
  });

  const flip = !ctx.local && ctx.me === 1;
  const wrap = el('div', 'bdwrap');
  const grid = el('div', 'bd');
  const resign = el('button', 'gbtn mini ghost', 'Rendirse');
  wrap.append(grid, resign);
  ctx.root.append(wrap);

  const legal = () => movesFor(board, turn);
  const mine = () => ctx.local || turn === ctx.me;

  const label = () => {
    ctx.turn(turn);
    const must = legal().some((m) => m.caps.length) ? ' · captura obligatoria' : '';
    if (ctx.local) ctx.status(`Turno de <b>${esc(ctx.names[turn])}</b>${must}`);
    else ctx.status((turn === ctx.me ? '<b>Tu turno</b>' : `Turno de ${esc(ctx.other)}`) + must);
  };

  const render = () => {
    const moves = legal();
    const targets = sel ? moves.filter((m) => m.fr === sel![0] && m.fc === sel![1]) : [];
    grid.innerHTML = '';
    for (let dr = 0; dr < N; dr++) {
      for (let dc = 0; dc < N; dc++) {
        const r = flip ? N - 1 - dr : dr;
        const c = flip ? N - 1 - dc : dc;
        const dark = (r + c) % 2 === 1;
        const sq = el('button', `sq ${dark ? 'dk' : 'lt'}`);
        const p = board[r][c];
        const isSel = sel && sel[0] === r && sel[1] === c;
        const isTarget = targets.some((m) => m.tr === r && m.tc === c);
        if (isSel) sq.classList.add('sel');
        if (isTarget) sq.classList.add('tg');
        if (last && ((last.fr === r && last.fc === c) || (last.tr === r && last.tc === c))) sq.classList.add('lm');
        if (p) sq.innerHTML = `<span class="pc p${p.c}${p.k ? ' king' : ''}">${p.k ? '♛' : ''}</span>`;
        sq.disabled = over || !dark;
        sq.onclick = () => click(r, c);
        grid.append(sq);
      }
    }
  };

  const finishWith = (winner: 0 | 1 | null, sub: string) => {
    over = true;
    render();
    timer = window.setTimeout(() => ctx.finish({ winner, sub }), 900);
  };

  const play = (m: Move) => {
    const mover = board[m.fr][m.fc]!;
    const wasKing = mover.k;
    board = apply(board, m);
    last = m;
    sel = null;
    quiet = m.caps.length || !wasKing ? 0 : quiet + 1;
    turn = turn === 0 ? 1 : 0;
    const next = legal();
    if (!next.length) return finishWith(turn === 0 ? 1 : 0, 'Se quedó sin movimientos');
    if (quiet >= 40) return finishWith(null, 'Sin avances');
    render();
    label();
  };

  const click = (r: number, c: number) => {
    if (over || !mine()) return;
    const p = board[r][c];
    const moves = legal();
    if (p && p.c === turn) {
      sel = moves.some((m) => m.fr === r && m.fc === c) ? [r, c] : null;
      render();
      return;
    }
    if (!sel) return;
    const idx = moves.findIndex((m) => m.fr === sel![0] && m.fc === sel![1] && m.tr === r && m.tc === c);
    if (idx < 0) return;
    ctx.send({ i: idx });
    play(moves[idx]);
  };

  resign.onclick = () => {
    if (over) return;
    if (!sure) {
      sure = true;
      resign.textContent = '¿Seguro?';
      sureTimer = window.setTimeout(() => {
        sure = false;
        resign.textContent = 'Rendirse';
      }, 3000);
      return;
    }
    const loser = ctx.local ? turn : ctx.me;
    ctx.send({ rs: 1 });
    finishWith(loser === 0 ? 1 : 0, 'Se rindió');
  };

  ctx.on((d) => {
    if (over) return;
    if (typeof d?.i === 'number') {
      const m = legal()[d.i];
      if (m) play(m);
    } else if (d?.rs) {
      const loser = ctx.me === 0 ? 1 : 0;
      finishWith(loser === 0 ? 1 : 0, 'Tu pareja se rindió');
    }
  });

  render();
  label();
}

export const checkers: GameDef = {
  id: 'checkers',
  name: 'Damas',
  tagline: 'Captura todas las fichas de tu pareja',
  icon: '🔴',
  from: '#fb923c',
  to: '#b91c1c',
  online: true,
  local: true,
  match: { target: 2, perPoint: 1 },
  start,
};
