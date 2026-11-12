import { Ctx, el, esc, GameDef, rnd } from './kit';

const N = 8;
const FLEET = [4, 3, 3, 2, 2];

type Ship = number[];

function cellsOf(start: number, len: number, horiz: boolean): Ship | null {
  const r = Math.floor(start / N);
  const c = start % N;
  const out: number[] = [];
  for (let k = 0; k < len; k++) {
    const rr = horiz ? r : r + k;
    const cc = horiz ? c + k : c;
    if (rr >= N || cc >= N) return null;
    out.push(rr * N + cc);
  }
  return out;
}

function randomFleet(): Ship[] {
  const ships: Ship[] = [];
  for (const len of FLEET) {
    for (let tries = 0; tries < 400; tries++) {
      const s = cellsOf(rnd(N * N), len, Math.random() < 0.5);
      if (s && !s.some((c) => ships.some((o) => o.includes(c)))) {
        ships.push(s);
        break;
      }
    }
  }
  return ships;
}

function start(ctx: Ctx) {
  const box = el('div', 'navy');
  ctx.root.append(box);

  let ships: Ship[] = [];
  let horiz = true;
  let phase: 'place' | 'wait' | 'battle' = 'place';
  let mineReady = false;
  let peerReady = false;
  let turn: 0 | 1 = ctx.round % 2 === 0 ? 0 : 1;
  let over = false;
  let busy = false;
  const incoming = new Set<number>();
  const shots = new Map<number, 'miss' | 'hit' | 'sunk'>();
  const sunkEnemy: Ship[] = [];

  const placed = () => ships.length;
  const occupied = (c: number) => ships.some((s) => s.includes(c));

  const grid = (cls: string, build: (i: number, b: HTMLButtonElement) => void) => {
    const g = el('div', `nboard ${cls}`);
    for (let i = 0; i < N * N; i++) {
      const b = el('button', 'cell');
      build(i, b);
      g.append(b);
    }
    return g;
  };

  const renderPlace = () => {
    ctx.status(placed() < FLEET.length ? `Coloca tu barco de <b>${FLEET[placed()]}</b> casillas` : '<b>Flota lista</b>');
    ctx.turn(null);
    box.innerHTML = '';
    const g = grid('big', (i, b) => {
      b.className = `cell${occupied(i) ? ' ship' : ''}`;
      b.onclick = () => {
        if (placed() >= FLEET.length) return;
        const s = cellsOf(i, FLEET[placed()], horiz);
        if (!s || s.some(occupied)) return;
        ships.push(s);
        renderPlace();
      };
    });
    const bar = el('div', 'grow');
    const rot = el('button', 'gbtn mini lagoon', horiz ? 'Horizontal ↔' : 'Vertical ↕');
    rot.onclick = () => {
      horiz = !horiz;
      renderPlace();
    };
    const rand = el('button', 'gbtn mini ghost', 'Al azar');
    rand.onclick = () => {
      ships = randomFleet();
      renderPlace();
    };
    const undo = el('button', 'gbtn mini ghost', 'Deshacer');
    undo.disabled = placed() === 0;
    undo.onclick = () => {
      ships.pop();
      renderPlace();
    };
    const ok = el('button', 'gbtn mini gold', 'Listo');
    ok.disabled = placed() < FLEET.length;
    ok.onclick = ready;
    bar.append(rot, rand, undo, ok);
    box.append(g, bar);
  };

  const ready = () => {
    mineReady = true;
    phase = 'wait';
    ctx.send({ rdy: 1 });
    check();
  };

  const check = () => {
    if (mineReady && peerReady) {
      phase = 'battle';
      renderBattle();
    } else if (mineReady) {
      box.innerHTML = `<div class="gpanel"><h3>Listo</h3><p>Esperando a que ${ctx.other} coloque su flota…</p></div>`;
      ctx.status(`Esperando a ${esc(ctx.other)}`);
    }
  };

  const renderBattle = () => {
    ctx.turn(turn);
    ctx.status(turn === ctx.me ? '<b>Tu turno: dispara</b>' : `Dispara ${esc(ctx.other)}…`);
    box.innerHTML = '';
    const wrap = el('div', 'nboards');
    const enemyBox = el('div', 'navy');
    enemyBox.append(el('div', 'nlabel', 'Mar enemigo'));
    const sunkCells = new Set(sunkEnemy.flat());
    enemyBox.append(
      grid('big', (i, b) => {
        const s = sunkCells.has(i) ? 'sunk' : shots.get(i);
        b.className = `cell${s ? ` ${s}` : ' aim'}`;
        b.onclick = () => fire(i);
      }),
    );
    const mineBox = el('div', 'navy');
    mineBox.append(el('div', 'nlabel', 'Tu flota'));
    mineBox.append(
      grid('small', (i, b) => {
        const hitMine = incoming.has(i);
        const cls = occupied(i) ? (hitMine ? 'hit' : 'ship') : hitMine ? 'miss' : '';
        b.className = `cell ${cls}`;
        b.disabled = true;
      }),
    );
    wrap.append(enemyBox, mineBox);
    box.append(wrap);
  };

  const fire = (i: number) => {
    if (phase !== 'battle' || over || busy || turn !== ctx.me || shots.has(i)) return;
    if (sunkEnemy.flat().includes(i)) return;
    busy = true;
    ctx.send({ s: i });
  };

  const answer = (i: number) => {
    if (incoming.has(i)) return;
    incoming.add(i);
    const ship = ships.find((s) => s.includes(i));
    const hit = !!ship;
    const sunk = ship && ship.every((c) => incoming.has(c)) ? ship : null;
    const win = ships.every((s) => s.every((c) => incoming.has(c)));
    ctx.send({ r: { i, hit, sunk, win } });
    const shooter = (1 - ctx.me) as 0 | 1;
    turn = hit && !win ? shooter : ctx.me;
    if (win) {
      over = true;
      renderBattle();
      setTimeout(() => ctx.finish({ winner: shooter, sub: 'Toda tu flota se hundió' }), 900);
    } else renderBattle();
  };

  const result = (r: { i: number; hit: boolean; sunk: Ship | null; win: boolean }) => {
    busy = false;
    shots.set(r.i, r.hit ? 'hit' : 'miss');
    if (r.sunk) sunkEnemy.push(r.sunk);
    turn = r.hit && !r.win ? ctx.me : ((1 - ctx.me) as 0 | 1);
    if (r.win) {
      over = true;
      renderBattle();
      setTimeout(() => ctx.finish({ winner: ctx.me, sub: 'Hundiste toda su flota' }), 900);
    } else renderBattle();
  };

  ctx.on((d) => {
    if (d?.rdy) {
      peerReady = true;
      check();
    } else if (typeof d?.s === 'number') answer(d.s);
    else if (d?.r) result(d.r);
  });

  renderPlace();
}

export const navy: GameDef = {
  id: 'navy',
  name: 'Batalla naval',
  tagline: 'Hunde la flota del otro jugador',
  icon: '🚢',
  from: '#38bdf8',
  to: '#2563eb',
  online: true,
  local: false,
  match: { target: 2 },
  start,
};
