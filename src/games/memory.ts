import { Ctx, el, GameDef, shuffle } from './kit';

const FACES = ['🍓', '🌹', '🐱', '🌙', '⭐', '🍕', '🎧', '🦋', '🍫', '☀️'];

function start(ctx: Ctx) {
  let deck: number[] = [];
  const matched: (0 | 1 | null)[] = [];
  let up: number[] = [];
  const pairs: [number, number] = [0, 0];
  let turn: 0 | 1 = ctx.round % 2 === 0 ? 0 : 1;
  let lock = false;
  let over = false;
  let timer: number | undefined;
  ctx.cleanup(() => window.clearTimeout(timer));

  const grid = el('div', 'mem');
  ctx.root.append(grid);
  let btns: HTMLButtonElement[] = [];

  const label = () => {
    ctx.turn(turn);
    const who = ctx.local ? `<b>${ctx.names[turn]}</b>` : turn === ctx.me ? '<b>Tu turno</b>' : `Turno de ${ctx.other}`;
    ctx.status(`${who} · parejas ${pairs[0]} - ${pairs[1]}`);
  };

  const render = () => {
    btns.forEach((b, i) => {
      const m = matched[i];
      const shown = m !== null || up.includes(i);
      b.className = `${shown ? 'up' : ''} ${m !== null ? `done m${m}` : ''}`;
    });
  };

  const flip = (i: number, who: 0 | 1) => {
    if (over || lock || who !== turn || matched[i] !== null || up.includes(i)) return;
    up.push(i);
    render();
    if (up.length < 2) return;
    lock = true;
    const [a, b] = up;
    if (deck[a] === deck[b]) {
      timer = window.setTimeout(() => {
        matched[a] = who;
        matched[b] = who;
        pairs[who]++;
        up = [];
        lock = false;
        render();
        if (matched.every((m) => m !== null)) {
          over = true;
          const w = pairs[0] === pairs[1] ? null : pairs[0] > pairs[1] ? 0 : 1;
          ctx.finish({ winner: w, sub: `Parejas: ${pairs[0]} - ${pairs[1]}` });
        } else label();
      }, 450);
    } else {
      timer = window.setTimeout(() => {
        up = [];
        lock = false;
        turn = turn === 0 ? 1 : 0;
        render();
        label();
      }, 1000);
    }
  };

  const click = (i: number) => {
    if (lock || over || matched[i] !== null || up.includes(i)) return;
    if (!ctx.local && turn !== ctx.me) return;
    const who = ctx.local ? turn : ctx.me;
    flip(i, who);
    ctx.send({ i });
  };

  ctx.on((d) => {
    if (typeof d?.i === 'number') flip(d.i, ctx.me === 0 ? 1 : 0);
  });

  ctx.init(
    () => shuffle([...FACES, ...FACES].map((_, i) => i % FACES.length)),
    (order) => {
      deck = order;
      deck.forEach(() => matched.push(null));
      btns = deck.map((v, i) => {
        const b = el('button');
        b.setAttribute('aria-label', `Carta ${i + 1}`);
        b.innerHTML = `<span class="face"><span class="back">♥</span><span class="front">${FACES[v]}</span></span>`;
        b.onclick = () => click(i);
        grid.append(b);
        return b;
      });
      render();
      label();
    },
  );
}

export const memory: GameDef = {
  id: 'memory',
  name: 'Memoria',
  tagline: 'Encuentra más parejas de cartas',
  icon: '🃏',
  from: '#a78bfa',
  to: '#ec4899',
  online: true,
  local: true,
  match: { target: 2 },
  start,
};
