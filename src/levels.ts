import { COLS, Level, LiftDef, ROWS } from './config';
import pars from './pars.json';

class G {
  private g: string[][];

  constructor() {
    this.g = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1 ? '#' : '.')),
    );
  }
  put(r: number, c: number, ch: string) {
    this.g[r][c] = ch;
    return this;
  }
  at(r: number, c: number) {
    return this.g[r][c];
  }
  row(r: number, c1: number, c2: number, ch: string) {
    for (let c = c1; c <= c2; c++) this.g[r][c] = ch;
    return this;
  }
  col(c: number, r1: number, r2: number, ch = '#') {
    for (let r = r1; r <= r2; r++) this.g[r][c] = ch;
    return this;
  }
  plat(r: number, c1: number, c2: number) {
    return this.row(r, c1, c2, '#');
  }
  map() {
    return this.g.map((r) => r.join(''));
  }
}

const conflicts: string[] = [];

const TIER: Record<string, number> = { C: 5, B: 10, G: 15, S: 7 };

const spec = (g: G, text: string) => {
  for (const part of text.split('|')) {
    const [tier, ...tokens] = part.trim().split(/\s+/);
    const r = TIER[tier];
    for (const t of tokens) {
      const m = /^([A-Za-z0-9])(\d+)(?:-(\d+))?$/.exec(t);
      if (!m) throw new Error('spec: ' + t);
      const c1 = Number(m[2]);
      const c2 = m[3] ? Number(m[3]) : c1;
      for (let c = c1; c <= c2; c++) {
        if (g.at(r, c) !== '.') conflicts.push('fila ' + r + ' col ' + c + ' (' + g.at(r, c) + '<-' + m[1] + ') en: ' + text.slice(0, 40));
        g.put(r, c, m[1]);
      }
    }
  }
  return g;
};

interface Opt {
  lift1?: boolean;
  lift2?: boolean;
  flip?: boolean;
  down?: boolean;
}

type Def = Omit<Level, 'par'>;

const mirror = (d: Def): Def => ({
  ...d,
  map: d.map.map((r) => [...r].reverse().join('')),
  lifts: d.lifts?.map((l): LiftDef => ({ ...l, col: COLS - l.col - l.width })),
});

const make = (name: string, o: Opt, add: (g: G) => void): Def => {
  const g = new G().plat(11, o.lift1 ? 7 : 6, 22).plat(6, 1, o.lift2 ? 22 : 21);
  if (!o.lift1) g.plat(13, 3, 5);
  if (!o.lift2) g.plat(8, 23, 27);
  if (o.down) g.put(5, 2, 'F').put(5, 3, 'W').put(15, 26, 'D').put(15, 28, 'E');
  else g.put(15, 1, 'F').put(15, 2, 'W').put(5, 3, 'D').put(5, 5, 'E');
  const lifts: LiftDef[] = [];
  if (o.lift1) {
    lifts.push({ col: 4, row: 15, width: 3, rise: 4, group: 3 });
    g.put(15, 3, '7').put(10, 8, '7');
  }
  if (o.lift2) {
    lifts.push({ col: 23, row: 11, width: 3, rise: 5, group: 4 });
    g.put(10, 21, '8').put(5, 21, '8');
  }
  add(g);
  const free = (r: number, c: number) => g.at(r, c) === '.';
  const gem = (r: number, c: number, ch: string) => {
    if (free(r, c)) g.put(r, c, ch);
  };
  if (!o.lift1) {
    g.plat(10, 1, 2);
    gem(9, 1, 'R');
    gem(9, 2, 'B');
  }
  if (o.lift2) {
    g.plat(3, 26, 28);
    gem(2, 26, 'R');
    gem(2, 28, 'B');
  } else {
    g.put(5, 28, '#');
    gem(4, 28, 'R');
  }
  if (!o.down && g.at(15, 26) !== '1') {
    g.plat(13, 25, 27);
    gem(12, 26, 'B');
  }
  const d: Def = { name, map: g.map(), lifts: lifts.length ? lifts : undefined };
  return o.flip ? mirror(d) : d;
};

const gateC = (g: G) => g.col(12, 1, 5, 'a');
const gateB = (g: G) => g.col(15, 7, 10, 'b');

const defs: Def[] = [
  make('Ruinas', {}, (g) => spec(g, 'C r9-10 w15-16 R7 B11 R19 | B r12-13 w17-18 B9 R15 B20 | G r9-10 w15-16 g21 R12 B18 R25 B27')),
  make('Aguas turbias', {}, (g) => spec(g, 'C r8-10 w14-16 g19 B7 R11 B18 | B r11-12 w15-16 g19 R8 B14 R21 | G w8-10 r14-16 g20-21 B12 R18 B25')),
  make('La compuerta', {}, (g) => spec(gateC(g), 'C 110 114 r7-8 w17-19 R6 B16 | B r11-12 w16-17 B9 R20 | G r9-10 w15-16 R13 B19')),
  make('Ascensor de piedra', { lift1: true }, (g) => spec(g, 'C r9-10 w14-15 g19 R7 B11 R17 | B w11-12 r16-17 B9 R14 B19 | G r11-12 w17-18 R9 B15 R21 B26')),
  make('Torre móvil', { lift2: true }, (g) => spec(g, 'C r8-10 w13-15 g18 B7 R11 B17 | B r10-11 w15-16 g19 R9 B13 R18 | G w9-10 r14-15 g19-20 B12 R17 B25')),
  make('Bajada', { down: true }, (g) => spec(g, 'C r9-10 w15-16 g19 R6 B11 R14 B17 | B w10-11 r15-16 B9 R13 B18 | G r10-11 w15-16 g20 R12 B18 R23')),
  make('Doble ascensor', { lift1: true, lift2: true }, (g) => spec(g, 'C w8-9 r12-14 w16 g19 B6 R10 B15 | B r10-11 w13-14 g17 R9 B12 R16 | G r9-10 w13-15 g18-19 w22-23 R12 B17 R21 B26')),
  make('Dos compuertas', {}, (g) => spec(gateB(gateC(g)), 'C 110 114 r7-8 w17-18 r20 R6 B16 | B 212 218 r9-10 w19-20 B8 R14 R21 | G r9-10 w14-15 g19 R12 B17 R24')),
  make('Un favor desde abajo', {}, (g) => spec(gateC(g), 'C 110 r7-8 w14-15 r18-19 R6 B13 R17 | B r10-11 w15-16 B9 R14 B20 | G 126 r9-10 w14-16 g20 R12 B18 R24')),
  make('Cruce de pozas', { flip: true }, (g) => spec(gateC(g), 'C 110 r7-8 w13-14 g17 w20 R6 B11 R16 | B r9-10 w13-14 g17 r20 B8 R12 B16 | G 126 w9-10 r13-15 g18-19 R12 B17 R22')),
  make('Cascada', { down: true }, (g) => spec(gateC(g), 'C 110 114 r7-8 w15-16 g19 R6 B11 R13 B17 | B w10-11 r14-15 g18 B9 R12 B20 | G r9-10 w14-15 g19-20 R12 B17 R23')),
  make('Elevador y ayuda', { lift1: true }, (g) => spec(gateC(g), 'C 110 114 r7-8 w15-16 g19 R6 B11 R13 B17 | B w10-11 r14-15 g18 B9 R12 B20 | G r10-11 w15-16 g20 R12 B17 R23')),
  make('Puente de agua', { lift2: true }, (g) => spec(gateB(g), 'C r8-9 w13-15 g18 B7 R11 B16 | B 612 r9-10 w18 B8 R13 B16 | G r9-10 w15-16 g20 R12 B17 R24')),
  make('Torres gemelas', { lift1: true, lift2: true, flip: true }, (g) => spec(gateC(g), 'C 110 114 r7-8 w16-17 g20 R6 B11 R15 | B w10-11 r13-14 g17 w20 R9 B12 R16 | G r9-10 w13-15 g18-19 R12 B17 R23')),
  make('La cadena', { lift1: true, lift2: true }, (g) => spec(gateC(g), 'C 110 114 r7-8 w15-16 g19 R6 B11 R13 B17 | B w10-11 r13-14 g17 B9 R12 B16 | G r9-10 w13-15 g19-20 R12 B17 R22')),
  make('Equipo perfecto', {}, (g) => spec(gateB(gateC(g)), 'C 110 r7-8 w15-16 g19 R6 B11 R13 B17 | B r10-11 613 w18-19 B9 R12 B20 | G 126 r9-10 w15-17 g20-21 R12 B18 R23')),
  make('Caída libre', { down: true }, (g) => spec(gateB(gateC(g)), 'C 110 114 r7-8 w15-16 g19 R6 B11 R13 B17 | B 212 218 w10-11 r19-20 R9 B14 R21 | G r9-10 w14-16 g19-20 R12 B17 R23')),
  make('Subida difícil', { lift1: true }, (g) => spec(gateB(gateC(g)), 'C 110 114 r7-8 w16-17 g20 R6 B11 R15 | B 212 218 w10-11 r19-20 R9 B14 R21 | G r9-10 w13-15 g18-19 R12 B16 R22')),
  make('Dos pisos, dos favores', { lift2: true }, (g) => spec(gateB(gateC(g)), 'C 110 114 r7-8 w15-16 g19 R6 B11 R13 B17 | B r10-11 613 w18-19 B9 R12 B17 | G r9-10 w15-16 g20 R12 B18 R23')),
  make('Laberinto doble', { lift1: true, lift2: true, flip: true }, (g) => spec(gateB(gateC(g)), 'C 110 114 r7-8 w15-16 g19 R6 B11 R13 B17 | B r10-11 613 w18-19 B9 R12 B17 | G r9-10 w15-17 g20-21 R12 B18 R23')),
  make('Abismo', { down: true, flip: true }, (g) => spec(gateB(gateC(g)), 'C 110 114 r7-8 w15-16 g19 R6 B11 R13 B17 | B 212 218 r10-11 w19-20 R9 B14 R21 | G w9-10 r14-15 g19-20 R12 B17 R23')),
  make('Torre de fuego', { lift1: true, lift2: true }, (g) => spec(gateB(gateC(g)), 'C 110 114 r7-8 w15-16 g19 R6 B11 R13 B17 | B w10-11 613 r18-19 B9 R12 B17 | G w9-10 r15-17 g20-21 R12 B18 R23')),
  make('El gran reto', { lift1: true, lift2: true, flip: true }, (g) => spec(gateB(gateC(g)), 'C 110 114 r7-8 w15-16 g19 R6 B11 R13 B17 | B w10-11 613 r18-19 B9 R12 B17 | G w8-10 r13-15 g19-20 R12 B17 R24')),
  make('Fuego y Agua', { lift1: true, lift2: true }, (g) => spec(gateB(gateC(g)), 'C 110 114 r7-8 w15-16 g19 R6 B11 R13 B17 | B r10-11 613 w18-19 B9 R12 B17 | G r9-10 w14-16 g24-25 R12 B20 R23')),
];

export const LEVELS: Level[] = defs.map((d, i) => ({ ...d, par: (pars as Record<string, number>)[String(i + 1)] ?? 90 }));

if (conflicts.length) throw new Error(conflicts.join(' ; '));

for (const lv of LEVELS) {
  const flat = lv.map.join('');
  if (lv.map.length !== ROWS || lv.map.some((r) => r.length !== COLS)) throw new Error(`"${lv.name}" debe medir ${COLS}x${ROWS}`);
  if (!/^[#.FWDERBrwgX1-8a-d]+$/.test(flat)) throw new Error(`"${lv.name}" tiene símbolos desconocidos`);
  for (const ch of 'FWDE') if (flat.split(ch).length !== 2) throw new Error(`"${lv.name}" necesita exactamente un "${ch}"`);
}
