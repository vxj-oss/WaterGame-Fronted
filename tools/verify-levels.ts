import { LEVELS } from '../src/data/levels';
import { COLS, ROWS, TILE } from '../src/config/constants';
import { mkdirSync, writeFileSync } from 'node:fs';

const DT = 1 / 60;
const GRAV = 900;
const V0 = 440;
const SPEED = 150;
const CUT = 200;
const HW = 12;
const HH = 15;
const W = COLS * TILE;
const H = ROWS * TILE;
const STEP = 8;
const HAZ_PAD = 8;

type Role = 'fire' | 'water';
interface R { l: number; t: number; r: number; b: number }
const ov = (a: R, b: R) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const rectOf = (x: number, yc: number): R => ({ l: x - HW, r: x + HW, t: yc - HH, b: yc + HH });

interface Lift { g: number; l: number; r: number; base: number; top: number }
interface Ctx {
  walls: boolean[][];
  hazF: R[]; hazW: R[];
  gates: { g: number; r: R }[];
  buttons: { g: number; z: R }[];
  levers: { g: number; z: R }[];
  lifts: Lift[];
  boxRows: number[]; boxCols0: number[];
  fs: { x: number; yc: number }; ws: { x: number; yc: number };
  doorF: R; doorW: R;
  geoms: Map<number, Geom>;
  trans: Map<number, Tr[]>;
}
interface Geom { act: number; boxCols: number[]; extra: R[]; boxRects: R[] }
interface Opts { dir: number; start: number; stop: number; jump: boolean; cut: number }
interface Act { kind: 'walk' | 'fall' | 'jump' | 'push'; d?: number; opts?: Opts }
interface Tr { to: number; cost: number; push?: { i: number; d: number }; act: Act }

function parse(lvIndex: number): Ctx {
  const lv = LEVELS[lvIndex];
  const c: Ctx = {
    walls: Array.from({ length: ROWS }, () => Array(COLS).fill(false)),
    hazF: [], hazW: [], gates: [], buttons: [], levers: [], lifts: [],
    boxRows: [], boxCols0: [],
    fs: { x: 0, yc: 0 }, ws: { x: 0, yc: 0 },
    doorF: { l: 0, t: 0, r: 0, b: 0 }, doorW: { l: 0, t: 0, r: 0, b: 0 },
    geoms: new Map(), trans: new Map(),
  };
  lv.map.forEach((row, r) => [...row].forEach((ch, col) => {
    const x = col * TILE + TILE / 2;
    const y = r * TILE + TILE / 2;
    const haz = (): R => ({ l: col * TILE - HAZ_PAD, r: col * TILE + TILE + HAZ_PAD, t: (r + 1) * TILE - 12, b: (r + 1) * TILE });
    if (ch === '#') c.walls[r][col] = true;
    else if (ch === 'r') c.hazW.push(haz());
    else if (ch === 'w') c.hazF.push(haz());
    else if (ch === 'g') { c.hazF.push(haz()); c.hazW.push(haz()); }
    else if (ch === 'F') c.fs = { x, yc: y };
    else if (ch === 'W') c.ws = { x, yc: y };
    else if (ch === 'D') c.doorF = { l: col * TILE + 2, r: col * TILE + 30, t: (r + 1) * TILE - 40, b: (r + 1) * TILE };
    else if (ch === 'E') c.doorW = { l: col * TILE + 2, r: col * TILE + 30, t: (r + 1) * TILE - 40, b: (r + 1) * TILE };
    else if (ch === 'X') { c.boxRows.push(r); c.boxCols0.push(col); }
    else if (ch >= '1' && ch <= '4') c.buttons.push({ g: Number(ch), z: { l: x - 14, r: x + 14, t: (r + 1) * TILE - 10, b: (r + 1) * TILE + 2 } });
    else if (ch >= '5' && ch <= '8') c.levers.push({ g: Number(ch) - 4, z: { l: x - 10, r: x + 10, t: r * TILE + 6, b: r * TILE + 32 } });
    else if (ch >= 'a' && ch <= 'd') c.gates.push({ g: ch.charCodeAt(0) - 96, r: { l: col * TILE + 2, r: col * TILE + 30, t: r * TILE, b: r * TILE + 32 } });
  }));
  for (const d of lv.lifts ?? []) {
    c.lifts.push({ g: d.group, l: d.col * TILE, r: (d.col + d.width) * TILE, base: d.row * TILE, top: d.row * TILE - d.rise * TILE });
  }
  return c;
}

function geom(c: Ctx, act: number, boxCols: number[]): Geom {
  const key = act + 16 * boxCols.reduce((k, b, i) => k + b * 32 ** i, 0);
  let g = c.geoms.get(key);
  if (g) return g;
  const extra: R[] = [];
  for (const ga of c.gates) if (!(act & (1 << ga.g))) extra.push(ga.r);
  for (const l of c.lifts) {
    const top = act & (1 << l.g) ? l.top : l.base;
    extra.push({ l: l.l, r: l.r, t: top, b: top + 16 });
  }
  const boxRects = boxCols.map((col, i) => ({ l: col * TILE, r: col * TILE + TILE, t: c.boxRows[i] * TILE, b: c.boxRows[i] * TILE + TILE }));
  g = { act, boxCols, extra: [...extra, ...boxRects], boxRects };
  c.geoms.set(key, g);
  return g;
}

function hit(c: Ctx, g: Geom, l: number, t: number, r: number, b: number, skipBoxes = false): boolean {
  if (l < 0 || t < 0 || r > W || b > H) return true;
  const c0 = Math.floor(l / TILE), c1 = Math.floor((r - 1e-6) / TILE);
  const r0 = Math.floor(t / TILE), r1 = Math.floor((b - 1e-6) / TILE);
  for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) if (c.walls[rr][cc]) return true;
  const n = skipBoxes ? g.extra.length - g.boxRects.length : g.extra.length;
  for (let i = 0; i < n; i++) {
    const e = g.extra[i];
    if (l < e.r && r > e.l && t < e.b && b > e.t) return true;
  }
  return false;
}
const hitP = (c: Ctx, g: Geom, x: number, yc: number, skipBoxes = false) => hit(c, g, x - HW, yc - HH, x + HW, yc + HH, skipBoxes);
const supported = (c: Ctx, g: Geom, x: number, yc: number) => hit(c, g, x - HW, yc - HH + 1, x + HW, yc + HH + 1);

const nodeId = (x: number, yc: number) => Math.round(x / STEP) * 32 + Math.round((yc + HH) / TILE);
const nodeX = (n: number) => Math.floor(n / 32) * STEP;
const nodeYc = (n: number) => (n % 32) * TILE - HH;

const deadAt = (c: Ctx, role: Role, x: number, yc: number) => {
  const rc = rectOf(x, yc);
  return (role === 'fire' ? c.hazF : c.hazW).some((h) => ov(rc, h));
};

function simulate(c: Ctx, g: Geom, role: Role, x: number, yc: number, o: Opts): { node: number; frames: number } | null {
  let vy = o.jump ? -V0 : 0;
  const startRect = rectOf(x, yc);
  const ignoreLever = c.levers.map((lv) => ov(startRect, lv.z));
  for (let f = 0; f < 420; f++) {
    const vx = f >= o.start && f < o.stop ? o.dir * SPEED : 0;
    vy += GRAV * DT;
    if (f >= o.cut && vy < -CUT) vy = -CUT;

    let nx = x + vx * DT;
    if (hitP(c, g, nx, yc)) {
      let a = x, b = nx;
      for (let i = 0; i < 8; i++) { const m = (a + b) / 2; if (hitP(c, g, m, yc)) b = m; else a = m; }
      nx = a;
    }
    x = nx;

    let ny = yc + vy * DT;
    let landed = false;
    if (hitP(c, g, x, ny)) {
      let a = yc, b = ny;
      for (let i = 0; i < 8; i++) { const m = (a + b) / 2; if (hitP(c, g, x, m)) b = m; else a = m; }
      ny = a;
      if (vy > 0) landed = true;
      vy = 0;
    }
    yc = ny;

    if (deadAt(c, role, x, yc)) return null;
    if (landed) {
      const feetY = Math.round((yc + HH) / TILE) * TILE;
      const y2 = feetY - HH;
      const xr = Math.round(x / STEP) * STEP;
      for (const cand of [xr, xr - STEP, xr + STEP]) {
        if (Math.abs(cand - x) > STEP + 0.5) continue;
        if (hitP(c, g, cand, y2) || !supported(c, g, cand, y2) || deadAt(c, role, cand, y2)) continue;
        return { node: nodeId(cand, y2), frames: f + 1 };
      }
      return null;
    }
    const rc = rectOf(x, yc);
    for (let i = 0; i < c.levers.length; i++) if (!ignoreLever[i] && ov(rc, c.levers[i].z)) return null;
  }
  return null;
}

function transitions(c: Ctx, g: Geom, role: Role, node: number): Tr[] {
  const ckey = ((g.act + 16 * g.boxCols.reduce((k, b, i) => k + b * 32 ** i, 0)) * 2 + (role === 'fire' ? 0 : 1)) * 16384 + node;
  const cached = c.trans.get(ckey);
  if (cached) return cached;

  const x = nodeX(node), yc = nodeYc(node);
  const best = new Map<number, Tr>();
  const add = (t: Tr) => {
    const k = t.to * 100 + (t.push ? t.push.i * 3 + t.push.d + 1 + 1 : 0);
    const o = best.get(k);
    if (!o || o.cost > t.cost) best.set(k, t);
  };

  for (const d of [-1, 1]) {
    const nx = x + d * STEP;
    if (hitP(c, g, nx, yc)) {
      if (!hitP(c, g, nx, yc, true)) {
        const bi = g.boxRects.findIndex((b) => ov(rectOf(nx, yc), b));
        if (bi >= 0 && Math.abs(yc + HH - g.boxRects[bi].b) < 1) {
          const col = g.boxCols[bi] + d;
          const tr: R = { l: col * TILE, r: col * TILE + TILE, t: g.boxRects[bi].t, b: g.boxRects[bi].b };
          const free = !hit(c, g, tr.l + 1, tr.t + 1, tr.r - 1, tr.b - 1, true) &&
            g.boxRects.every((b, j) => j === bi || !ov(tr, b)) &&
            c.walls[Math.round(tr.b / TILE)]?.[col] === true;
          if (free) {
            const px = x + d * TILE;
            add({ to: nodeId(px, yc), cost: 20, push: { i: bi, d }, act: { kind: 'push', d } });
          }
        }
      }
      continue;
    }
    if (deadAt(c, role, nx, yc)) continue;
    if (supported(c, g, nx, yc)) { add({ to: nodeId(nx, yc), cost: 3, act: { kind: 'walk', d } }); continue; }
    for (const stop of [0, 12, 24, 36, 48, Infinity]) {
      const o: Opts = { dir: d, start: 0, stop, jump: false, cut: Infinity };
      const r = simulate(c, g, role, nx, yc, o);
      if (r) add({ to: r.node, cost: r.frames + 2, act: { kind: 'fall', d, opts: o } });
    }
  }

  for (const dir of [-1, 0, 1]) {
    for (const cut of [Infinity, 10]) {
      for (const start of dir ? [0, 15, 30] : [0]) {
        for (const stop of dir ? [Infinity, 12, 24, 36, 48] : [Infinity]) {
          const o: Opts = { dir, start, stop, jump: true, cut };
          const r = simulate(c, g, role, x, yc, o);
          if (r) add({ to: r.node, cost: r.frames, act: { kind: 'jump', opts: o } });
        }
      }
    }
  }

  const list = [...best.values()];
  c.trans.set(ckey, list);
  return list;
}

interface St { f: number; w: number; lev: number; box: number[] }

function activeMask(c: Ctx, st: St): number {
  const fr = rectOf(nodeX(st.f), nodeYc(st.f)), wr = rectOf(nodeX(st.w), nodeYc(st.w));
  let act = 0;
  for (let g = 1; g <= 4; g++) if (st.lev & (1 << g)) act |= 1 << g;
  for (const b of c.buttons) {
    if (ov(fr, b.z) || ov(wr, b.z) || st.box.some((col, i) => ov({ l: col * TILE, r: col * TILE + TILE, t: c.boxRows[i] * TILE, b: c.boxRows[i] * TILE + TILE }, b.z))) act |= 1 << b.g;
  }
  return act;
}

function settle(c: Ctx, st: St, curAct: number, curBox: number[]): St | null {
  for (let it = 0; it < 6; it++) {
    const act = activeMask(c, st);
    if (act === curAct && st.box.every((b, i) => b === curBox[i])) return st;
    const gn = geom(c, act, st.box);
    const out: number[] = [];
    for (const [node, role] of [[st.f, 'fire'], [st.w, 'water']] as [number, Role][]) {
      const x = nodeX(node);
      let yc = nodeYc(node);
      const feet = yc + HH;
      for (const l of c.lifts) {
        const oldTop = curAct & (1 << l.g) ? l.top : l.base;
        const newTop = act & (1 << l.g) ? l.top : l.base;
        if (oldTop !== newTop && Math.abs(feet - oldTop) < 1 && x + HW > l.l && x - HW < l.r) yc = newTop - HH;
      }
      if (hitP(c, gn, x, yc)) return null;
      if (!supported(c, gn, x, yc)) {
        const r = simulate(c, gn, role, x, yc, { dir: 0, start: 0, stop: 0, jump: false, cut: Infinity });
        if (!r) return null;
        out.push(r.node);
        continue;
      }
      if (deadAt(c, role, x, yc)) return null;
      out.push(nodeId(x, yc));
    }
    st = { ...st, f: out[0], w: out[1] };
    curAct = act;
    curBox = st.box;
  }
  return st;
}

const keyOf = (st: St) => ((st.f * 8192 + st.w) * 32 + st.lev) * 1024 + st.box.reduce((k, b, i) => k + b * 32 ** i, 0);

class Heap {
  private a: [number, number][] = [];
  get size() { return this.a.length; }
  push(cost: number, id: number) {
    const a = this.a; a.push([cost, id]);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop(): [number, number] {
    const a = this.a, top = a[0], last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

interface Step extends Act { role: Role; from: number; to: number; frames: number }
interface Result { solution?: Step[]; ok: boolean; seconds: number; steps: number; expanded: number; reachF: Set<number>; reachW: Set<number>; capped: boolean }

function solve(lvIndex: number, maxStates = 3_000_000): Result {
  const c = parse(lvIndex);
  const spawn = (s: { x: number; yc: number }, role: Role) => {
    const g0 = geom(c, 0, c.boxCols0);
    const r = simulate(c, g0, role, Math.round(s.x / STEP) * STEP, s.yc, { dir: 0, start: 0, stop: 0, jump: false, cut: Infinity });
    if (!r) throw new Error(`No se pudo colocar a ${role} en su inicio`);
    return r.node;
  };
  const init0: St = { f: spawn(c.fs, 'fire'), w: spawn(c.ws, 'water'), lev: 0, box: [...c.boxCols0] };
  const init = settle(c, init0, 0, c.boxCols0);
  const reachF = new Set<number>(), reachW = new Set<number>();
  if (!init) return { ok: false, seconds: 0, steps: 0, expanded: 0, reachF, reachW, capped: false };

  const sts: St[] = [init];
  const cost: number[] = [0];
  const parent: number[] = [-1];
  const parentAct: (Step | null)[] = [null];
  const seen = new Map<number, number>([[keyOf(init), 0]]);
  const heap = new Heap();
  heap.push(0, 0);
  let expanded = 0;

  const isGoal = (st: St) => ov(rectOf(nodeX(st.f), nodeYc(st.f)), c.doorF) && ov(rectOf(nodeX(st.w), nodeYc(st.w)), c.doorW);

  while (heap.size) {
    const [cst, id] = heap.pop();
    if (cst > cost[id]) continue;
    const st = sts[id];
    reachF.add(st.f); reachW.add(st.w);
    if (isGoal(st)) {
      let steps = 0; for (let p = id; parent[p] >= 0; p = parent[p]) steps++;
      const solution: Step[] = []; for (let p = id; parent[p] >= 0; p = parent[p]) solution.unshift(parentAct[p]!);
      return { ok: true, seconds: cst / 60, steps, expanded, reachF, reachW, capped: false, solution };
    }
    if (++expanded > maxStates) return { ok: false, seconds: 0, steps: 0, expanded, reachF, reachW, capped: true };

    const act = activeMask(c, st);
    const g = geom(c, act, st.box);
    for (const role of ['fire', 'water'] as Role[]) {
      const mine = role === 'fire' ? st.f : st.w;
      for (const tr of transitions(c, g, role, mine)) {
        let lev = st.lev;
        const oldR = rectOf(nodeX(mine), nodeYc(mine)), newR = rectOf(nodeX(tr.to), nodeYc(tr.to));
        for (const lv of c.levers) if (!ov(oldR, lv.z) && ov(newR, lv.z)) lev ^= 1 << lv.g;
        const box = [...st.box];
        if (tr.push) box[tr.push.i] += tr.push.d;
        const tmp: St = { f: role === 'fire' ? tr.to : st.f, w: role === 'water' ? tr.to : st.w, lev, box };
        const ns = settle(c, tmp, act, st.box);
        if (!ns) continue;
        const k = keyOf(ns);
        const nc = cst + tr.cost;
        const old = seen.get(k);
        if (old === undefined) {
          sts.push(ns); cost.push(nc); parent.push(id); parentAct.push({ ...tr.act, role, from: mine, to: tr.to, frames: tr.cost });
          seen.set(k, sts.length - 1);
          heap.push(nc, sts.length - 1);
        } else if (nc < cost[old]) {
          cost[old] = nc; parent[old] = id; parentAct[old] = { ...tr.act, role, from: mine, to: tr.to, frames: tr.cost }; heap.push(nc, old);
        }
      }
    }
  }
  return { ok: false, seconds: 0, steps: 0, expanded, reachF, reachW, capped: false };
}

function drawMap(lvIndex: number, res: Result) {
  const rows = LEVELS[lvIndex].map.map((r) => [...r]);
  const cells = (set: Set<number>) => new Set([...set].map((n) => `${Math.floor(nodeX(n) / TILE)},${(n % 32) - 1}`));
  const f = cells(res.reachF), w = cells(res.reachW);
  for (const key of new Set([...f, ...w])) {
    const [col, r] = key.split(',').map(Number);
    if (rows[r][col] !== '.') continue;
    rows[r][col] = f.has(key) && w.has(key) ? '*' : f.has(key) ? 'f' : 'w';
  }
  console.log(rows.map((r) => r.join('')).join('\n'));
}

if (process.env.DBG) {
  const [, , lvArg, xs, feetRow, role] = process.argv;
  const c = parse(Number(lvArg) - 1);
  const g = geom(c, 0, c.boxCols0);
  const node = nodeId(Number(xs), Number(feetRow) * TILE - HH);
  console.log('nodo', nodeX(node), nodeYc(node), 'soportado', supported(c, g, nodeX(node), nodeYc(node)), 'muerto', deadAt(c, role as Role, nodeX(node), nodeYc(node)));
  if (!process.argv[6]) for (const t of transitions(c, g, role as Role, node)) console.log(' ->', nodeX(t.to), (t.to % 32), 'cost', t.cost, t.push ?? '');
  if (process.argv[6]) {
    const dir = Number(process.argv[6]), start = Number(process.argv[7] ?? 0);
    const r = simulate(c, g, role as Role, nodeX(node), nodeYc(node), { dir, start, stop: Infinity, jump: true, cut: Infinity });
    console.log('sim', dir, start, r && { x: nodeX(r.node), row: r.node % 32, frames: r.frames });
  }
  process.exit(0);
}
const args = process.argv.slice(2);
const only = args.find((a) => /^\d+$/.test(a));
const wantMap = args.includes('--map');
let failed = 0;
const pars: Record<string, number> = {};
const wantSol = args.includes('--sol');
LEVELS.forEach((lv, i) => {
  if (only && Number(only) !== i + 1) return;
  const t0 = Date.now();
  const res = solve(i);
  const ms = Date.now() - t0;
  const par = Math.round(res.seconds * 5 + 30);
  const label = `${String(i + 1).padStart(2)}. ${lv.name.padEnd(22)}`;
  if (res.ok && wantSol && res.solution) {
    mkdirSync(new URL('./solutions/', import.meta.url), { recursive: true });
    writeFileSync(new URL(`./solutions/${i + 1}.json`, import.meta.url), JSON.stringify(res.solution.map((a) => ({ ...a, x: nodeX(a.from), row: a.from % 32, tx: nodeX(a.to), trow: a.to % 32 }))));
  }
  if (res.ok) pars[String(i + 1)] = Math.round(res.seconds * 5 + 30);
  if (res.ok) console.log(`✔ ${label} resoluble · ${res.seconds.toFixed(1)}s en ${res.steps} acciones · par sugerido ${par}s (actual ${lv.par}s) · ${ms}ms`);
  else { failed++; console.log(`✘ ${label} SIN SOLUCIÓN${res.capped ? ' (búsqueda cortada)' : ''} · ${res.expanded} estados`); }
  if (wantMap || !res.ok) if (only) drawMap(i, res);
});
if (failed) { console.log(`\n${failed} nivel(es) sin solución`); process.exit(1); }
if (!only) writeFileSync(new URL('../src/data/pars.json', import.meta.url), JSON.stringify(pars, null, 2) + '\n');
console.log('\nTodos los niveles se pueden completar ✔');
