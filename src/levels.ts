// Niveles del juego. Cada mapa mide 30 columnas x 17 filas (tiles de 32px).
//
//  #  pared               .  vacío
//  F  spawn fuego         W  spawn agua
//  D  puerta fuego        E  puerta agua
//  R  gema roja (fuego)   B  gema azul (agua)
//  r  lava (mata al agua) w  agua (mata al fuego)   g  barro (mata a ambos)
//  X  caja empujable
//  1-4  botón del grupo 1-4 (activo mientras alguien/algo lo pisa)
//  5-8  palanca del grupo 1-4 (alterna al tocarla)
//  a-d  compuerta del grupo 1-4 (abierta cuando el grupo está activo)
//  Ascensores: se declaran en `lifts` (suben cuando su grupo está activo)
//
// Para agregar un nivel: créalo con `new G()`, añádelo a LEVELS y ejecuta `npm run verify`:
// el verificador comprueba que se pueda completar y calcula el tiempo meta (par).

import { COLS, Level, ROWS } from './config';
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
  row(r: number, c1: number, c2: number, ch: string) {
    for (let c = c1; c <= c2; c++) this.g[r][c] = ch;
    return this;
  }
  col(c: number, r1: number, r2: number, ch = '#') {
    for (let r = r1; r <= r2; r++) this.g[r][c] = ch;
    return this;
  }
  /** Plataforma sólida en la fila r (se camina por encima, en la fila r-1). */
  plat(r: number, c1: number, c2: number) {
    return this.row(r, c1, c2, '#');
  }
  map() {
    return this.g.map((r) => r.join(''));
  }
}

// 1 · Primer paso: moverse, saltar, gemas y puertas.
const l1 = [
  '##############################',
  '#............................#',
  '#...................D.E......#',
  '#.............###########....#',
  '#........B...................#',
  '#......######................#',
  '#...............w............#',
  '#.............######.........#',
  '#.....................gg.R...#',
  '#...................######...#',
  '#..............r..B..........#',
  '#............######..........#',
  '#.......R....................#',
  '#.....######.................#',
  '#............................#',
  '#.F.W....rrr...www....gg.....#',
  '##############################',
];

// 2 · Cruces: cada uno cruza su elemento, el otro salta.
const l2 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .row(15, 6, 8, 'r').row(15, 11, 13, 'w').row(15, 16, 17, 'g')
  .plat(14, 19, 23).row(13, 20, 21, 'w')
  .plat(12, 24, 28)
  .put(11, 25, 'D').put(11, 27, 'E')
  .put(14, 7, 'R').put(14, 12, 'B').put(13, 22, 'R').put(11, 26, 'B');

// 3 · Uno sostiene el botón mientras el otro pasa; luego se invierten los papeles.
const l3 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .col(14, 1, 13).col(14, 14, 15, 'a')
  .plat(14, 6, 11).put(13, 8, '1')
  .put(15, 18, '1')
  .plat(14, 19, 23).plat(12, 24, 28)
  .put(11, 25, 'D').put(11, 27, 'E')
  .put(13, 10, 'R').put(13, 21, 'B').put(15, 27, 'R');

// 4 · Ascensor con palanca: uno sube, baja la palanca de arriba, y suben juntos.
const l4 = new G()
  .put(15, 2, 'F').put(15, 4, 'W')
  .put(15, 8, '5')
  .plat(7, 13, 28).put(6, 14, '5')
  .row(6, 19, 20, 'g').put(6, 24, 'D').put(6, 26, 'E')
  .row(15, 17, 18, 'w').row(15, 23, 24, 'r')
  .put(15, 21, 'B').put(15, 27, 'R').put(6, 22, 'R');

// 5 · Cajas: una sirve de escalón, la otra se empuja sobre el botón.
const l5 = new G()
  .put(15, 2, 'F').put(15, 4, 'W')
  .col(14, 12, 15)
  .put(15, 10, 'X').put(15, 18, 'X')
  .put(15, 22, '1')
  .col(25, 1, 11).col(25, 12, 15, 'a')
  .put(15, 26, 'D').put(15, 28, 'E')
  .put(11, 14, 'R').put(14, 20, 'B');

// 6 · Caja sobre el botón + ascensor con palanca.
const l6 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .col(14, 1, 11).col(14, 12, 15, 'a')
  .put(15, 6, 'X').put(15, 11, '1').put(14, 9, 'B')
  .put(15, 17, '6')
  .plat(8, 22, 28).put(7, 23, '6')
  .put(7, 24, 'g').put(7, 26, 'D').put(7, 28, 'E')
  .row(15, 23, 24, 'w').put(15, 26, 'R').put(7, 22, 'B');

// 7 · Tres pozas: puro salto, cada uno cruza su elemento.
const l7 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .row(15, 7, 9, 'r').row(15, 13, 15, 'w').row(15, 19, 20, 'g')
  .plat(14, 24, 28).put(13, 26, 'D').put(13, 28, 'E')
  .put(14, 8, 'R').put(14, 14, 'B').put(14, 21, 'R').put(13, 25, 'B');

// 8 · Dos puertas: dos compuertas seguidas, cada una con un botón a cada lado.
const l8 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .col(10, 1, 12).col(10, 13, 15, 'a').put(15, 6, '1').put(15, 13, '1')
  .col(20, 1, 12).col(20, 13, 15, 'b').put(15, 16, '2').put(15, 23, '2')
  .put(15, 26, 'D').put(15, 28, 'E')
  .put(14, 8, 'R').put(14, 12, 'B').put(14, 18, 'R').put(14, 25, 'B');

// 9 · Escalera: peldaños con un charco en cada uno.
const l9 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .plat(13, 5, 11).row(12, 7, 8, 'w')
  .plat(11, 14, 20).row(10, 16, 17, 'r')
  .plat(9, 23, 28).put(8, 25, 'g')
  .put(8, 27, 'D').put(8, 28, 'E')
  .put(12, 6, 'R').put(10, 15, 'B').put(8, 24, 'R');

// 10 · Doble ascensor: dos tramos con palancas.
const l10 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .put(15, 6, '5')
  .plat(10, 11, 20).put(9, 12, '5').put(9, 18, '6')
  .plat(5, 24, 28).put(4, 24, '6').put(4, 26, 'D').put(4, 28, 'E')
  .put(9, 15, 'R').put(4, 27, 'B');

// 11 · Llave y lava: compuerta con botón a cada lado y charcos después.
const l11 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .col(12, 1, 12).col(12, 13, 15, 'a')
  .plat(14, 4, 9).put(13, 6, '1')
  .put(15, 16, '1')
  .row(15, 18, 19, 'r').row(15, 22, 23, 'w')
  .plat(14, 25, 28).put(13, 26, 'D').put(13, 28, 'E')
  .put(13, 8, 'R').put(14, 20, 'B');

// 12 · El muro: una caja de escalón, un charco de lava y una compuerta con palanca.
const l12 = new G()
  .put(15, 2, 'F').put(15, 4, 'W')
  .col(10, 12, 15)
  .put(15, 7, 'X')
  .row(15, 14, 16, 'r')
  .put(15, 19, '5')
  .col(22, 1, 11).col(22, 12, 15, 'a')
  .put(15, 25, 'D').put(15, 27, 'E')
  .put(11, 10, 'R').put(14, 12, 'B').put(14, 20, 'R');

// 13 · Subida: ascensor con palanca y charcos arriba.
const l13 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .put(15, 6, '5')
  .plat(8, 11, 28).put(7, 12, '5')
  .row(7, 16, 17, 'r').row(7, 20, 21, 'w').put(7, 24, 'g').put(7, 26, 'D').put(7, 28, 'E')
  .row(15, 17, 18, 'w').row(15, 23, 24, 'r').put(15, 21, 'B').put(15, 27, 'R').put(7, 14, 'R');

// 14 · La compuerta: solo una caja sobre el botón la mantiene abierta.
const l14 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .put(15, 6, 'X').put(15, 11, '1')
  .col(15, 1, 15, 'a')
  .plat(14, 18, 21).put(13, 19, 'w')
  .plat(12, 24, 28).put(11, 25, 'D').put(11, 27, 'E')
  .put(14, 13, 'B').put(13, 20, 'R');

// 15 · Dos cajas: dos compuertas, cada una abierta por su caja (una cruza lava).
const l15 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .put(15, 6, 'X').put(15, 10, '1').col(12, 1, 15, 'a')
  .put(15, 15, 'X').row(15, 16, 17, 'r').put(15, 20, '2').col(22, 1, 15, 'b')
  .put(15, 25, 'D').put(15, 27, 'E')
  .put(14, 8, 'B').put(14, 18, 'R');

// 16 · Doble desafío: compuerta con dos botones y luego un ascensor con palanca.
const l16 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .col(9, 1, 12).col(9, 13, 15, 'a').put(15, 5, '1').put(15, 12, '1')
  .put(15, 15, '6')
  .plat(9, 20, 28).put(8, 21, '6').put(8, 25, 'D').put(8, 27, 'E')
  .put(14, 7, 'R').put(14, 11, 'B').put(8, 23, 'R');

// 17 · Muro y palanca: caja de escalón y luego un ascensor.
const l17 = new G()
  .put(15, 2, 'F').put(15, 4, 'W')
  .col(9, 12, 15).put(15, 6, 'X')
  .put(15, 12, '5')
  .plat(9, 18, 28).put(8, 19, '5').put(8, 23, 'D').put(8, 26, 'E')
  .put(11, 9, 'R').put(14, 21, 'B');

// 18 · Triple prueba: compuerta, charcos y ascensor.
const l18 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .col(8, 1, 12).col(8, 13, 15, 'a').put(15, 4, '1').put(15, 11, '1')
  .row(15, 13, 14, 'r').row(15, 17, 18, 'w')
  .put(15, 20, '5')
  .plat(9, 25, 28).put(8, 25, '5').put(8, 26, 'D').put(8, 28, 'E')
  .put(14, 6, 'R').put(14, 16, 'B');

// 19 · La torre: tres ascensores encadenados con palancas.
const l19 = new G()
  .put(15, 2, 'F').put(15, 3, 'W')
  .put(15, 5, '5')
  .plat(11, 10, 16).put(10, 11, '5').put(10, 15, '6')
  .plat(7, 20, 26).put(6, 21, '6').put(6, 25, '7')
  .plat(3, 20, 26).put(2, 25, '7').put(2, 22, 'D').put(2, 24, 'E')
  .put(10, 13, 'R').put(6, 23, 'B');

type Def = Omit<Level, 'par'>;
const defs: Def[] = [
  { name: 'Primer paso', map: l1 },
  { name: 'Cruces', map: l2.map() },
  { name: 'Ayúdame a pasar', map: l3.map() },
  { name: 'Ascensor', map: l4.map(), lifts: [{ col: 10, row: 15, width: 3, rise: 8, group: 1 }] },
  { name: 'Cajas', map: l5.map() },
  { name: 'Caja y ascensor', map: l6.map(), lifts: [{ col: 19, row: 15, width: 3, rise: 7, group: 2 }] },
  { name: 'Tres pozas', map: l7.map() },
  { name: 'Dos puertas', map: l8.map() },
  { name: 'Escalera', map: l9.map() },
  {
    name: 'Doble ascensor',
    map: l10.map(),
    lifts: [
      { col: 8, row: 15, width: 3, rise: 5, group: 1 },
      { col: 21, row: 10, width: 3, rise: 5, group: 2 },
    ],
  },
  { name: 'Llave y lava', map: l11.map() },
  { name: 'El muro', map: l12.map() },
  { name: 'Subida', map: l13.map(), lifts: [{ col: 8, row: 15, width: 3, rise: 7, group: 1 }] },
  { name: 'La compuerta', map: l14.map() },
  { name: 'Dos cajas', map: l15.map() },
  { name: 'Doble desafío', map: l16.map(), lifts: [{ col: 17, row: 15, width: 3, rise: 6, group: 2 }] },
  { name: 'Muro y palanca', map: l17.map(), lifts: [{ col: 15, row: 15, width: 3, rise: 6, group: 1 }] },
  { name: 'Triple prueba', map: l18.map(), lifts: [{ col: 22, row: 15, width: 3, rise: 6, group: 1 }] },
  {
    name: 'La torre',
    map: l19.map(),
    lifts: [
      { col: 7, row: 15, width: 3, rise: 4, group: 1 },
      { col: 17, row: 11, width: 3, rise: 4, group: 2 },
      { col: 27, row: 7, width: 2, rise: 4, group: 3 },
    ],
  },
];

// El tiempo meta (par) lo calcula `npm run verify` y se guarda en pars.json.
export const LEVELS: Level[] = defs.map((d, i) => ({ ...d, par: (pars as Record<string, number>)[String(i + 1)] ?? 90 }));

// Validación: si te equivocas al editar un nivel, avisa en la consola.
for (const lv of LEVELS) {
  const flat = lv.map.join('');
  if (lv.map.length !== ROWS || lv.map.some((r) => r.length !== COLS)) throw new Error(`"${lv.name}" debe medir ${COLS}x${ROWS}`);
  if (!/^[#.FWDERBrwgX1-8a-d]+$/.test(flat)) throw new Error(`"${lv.name}" tiene símbolos desconocidos`);
  for (const ch of 'FWDE') if (flat.split(ch).length !== 2) throw new Error(`"${lv.name}" necesita exactamente un "${ch}"`);
}
