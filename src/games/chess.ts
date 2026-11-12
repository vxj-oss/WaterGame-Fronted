import { Ctx, el, esc, GameDef } from './kit';
import { GLYPH, State, Move, applyMove, initial, inCheck, insufficient, isWhite, keyOf, kingSq, legal, rc } from './chessEngine';

function start(ctx: Ctx) {
  let st = initial();
  let over = false;
  let sel = -1;
  let last: Move | null = null;
  let pending: Move[] | null = null;
  let timer: number | undefined;
  let sure = false;
  let sureTimer: number | undefined;
  const seen = new Map<string, number>([[keyOf(st), 1]]);
  ctx.cleanup(() => {
    window.clearTimeout(timer);
    window.clearTimeout(sureTimer);
  });

  const whitePlayer: 0 | 1 = ctx.round % 2 === 0 ? 0 : 1;
  const playerOf = (t: 'w' | 'b'): 0 | 1 => (t === 'w' ? whitePlayer : ((1 - whitePlayer) as 0 | 1));
  const myColor: 'w' | 'b' = ctx.local ? 'w' : ctx.me === whitePlayer ? 'w' : 'b';
  const flip = !ctx.local && myColor === 'b';
  const mine = () => ctx.local || playerOf(st.t) === ctx.me;

  const wrap = el('div', 'bdwrap');
  const grid = el('div', 'bd');
  const promo = el('div', 'promo');
  promo.hidden = true;
  const resign = el('button', 'gbtn mini ghost', 'Rendirse');
  wrap.append(grid, promo, resign);
  ctx.root.append(wrap);

  const label = () => {
    const p = playerOf(st.t);
    ctx.turn(p);
    const colorName = st.t === 'w' ? 'blancas' : 'negras';
    const warn = inCheck(st) ? ' · ¡jaque!' : '';
    if (ctx.local) ctx.status(`Turno de <b>${esc(ctx.names[p])}</b> (${colorName})${warn}`);
    else ctx.status((p === ctx.me ? `<b>Tu turno</b> (${colorName})` : `Turno de ${esc(ctx.other)} (${colorName})`) + warn);
  };

  const render = () => {
    const moves = legal(st);
    const targets = sel >= 0 ? moves.filter((m) => m.from === sel).map((m) => m.to) : [];
    const checkSq = inCheck(st) ? kingSq(st.b, st.t === 'w') : -1;
    grid.innerHTML = '';
    for (let d = 0; d < 64; d++) {
      const i = flip ? 63 - d : d;
      const [r, c] = rc(i);
      const sq = el('button', `sq ${(r + c) % 2 === 1 ? 'dk' : 'lt'}`);
      const p = st.b[i];
      if (i === sel) sq.classList.add('sel');
      if (targets.includes(i)) sq.classList.add(p ? 'cap' : 'tg');
      if (last && (last.from === i || last.to === i)) sq.classList.add('lm');
      if (i === checkSq) sq.classList.add('chk');
      if (p) sq.innerHTML = `<span class="cp ${isWhite(p) ? 'cw' : 'cb'}">${GLYPH[p.toLowerCase()]}</span>`;
      sq.disabled = over;
      sq.onclick = () => click(i);
      grid.append(sq);
    }
  };

  const finishWith = (winner: 0 | 1 | null, sub: string) => {
    over = true;
    render();
    timer = window.setTimeout(() => ctx.finish({ winner, sub }), 900);
  };

  const play = (m: Move) => {
    const mover = playerOf(st.t);
    st = applyMove(st, m);
    last = m;
    sel = -1;
    const key = keyOf(st);
    seen.set(key, (seen.get(key) ?? 0) + 1);
    const moves = legal(st);
    if (!moves.length) return inCheck(st) ? finishWith(mover, 'Jaque mate') : finishWith(null, 'Rey ahogado');
    if (insufficient(st.b)) return finishWith(null, 'Material insuficiente');
    if (st.half >= 100) return finishWith(null, 'Regla de los 50 movimientos');
    if ((seen.get(key) ?? 0) >= 3) return finishWith(null, 'Triple repetición');
    render();
    label();
  };

  const commit = (m: Move) => {
    const all = legal(st);
    const idx = all.findIndex((x) => x.from === m.from && x.to === m.to && x.promo === m.promo);
    if (idx < 0) return;
    ctx.send({ i: idx });
    play(all[idx]);
  };

  const askPromotion = (options: Move[]) => {
    pending = options;
    promo.hidden = false;
    promo.innerHTML = '<span>Corona tu peón</span>';
    const white = st.t === 'w';
    for (const pr of ['q', 'r', 'b', 'n']) {
      const b = el('button', `gbtn ${white ? 'ghost' : 'ghost'}`, `${GLYPH[pr]}`);
      b.style.fontSize = '30px';
      b.onclick = () => {
        promo.hidden = true;
        const m = options.find((o) => o.promo === pr)!;
        pending = null;
        commit(m);
      };
      promo.append(b);
    }
  };

  const click = (i: number) => {
    if (over || !mine() || pending) return;
    const p = st.b[i];
    const moves = legal(st);
    if (p && isWhite(p) === (st.t === 'w')) {
      sel = moves.some((m) => m.from === i) ? i : -1;
      render();
      return;
    }
    if (sel < 0) return;
    const options = moves.filter((m) => m.from === sel && m.to === i);
    if (!options.length) return;
    if (options[0].promo) askPromotion(options);
    else commit(options[0]);
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
    const loser = ctx.local ? playerOf(st.t) : ctx.me;
    ctx.send({ rs: 1 });
    finishWith(loser === 0 ? 1 : 0, 'Se rindió');
  };

  ctx.on((d) => {
    if (over) return;
    if (typeof d?.i === 'number') {
      const m = legal(st)[d.i];
      if (m) play(m);
    } else if (d?.rs) {
      const loser = ctx.me === 0 ? 1 : 0;
      finishWith(loser === 0 ? 1 : 0, 'Tu pareja se rindió');
    }
  });

  render();
  label();
}

export const chess: GameDef = {
  id: 'chess',
  name: 'Ajedrez',
  tagline: 'Jaque mate al rey de tu pareja',
  icon: '♟️',
  from: '#94a3b8',
  to: '#334155',
  online: true,
  local: true,
  match: { target: 2, perPoint: 1 },
  start,
};
