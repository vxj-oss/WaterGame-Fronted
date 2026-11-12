export type Sq = string | null;

export interface State {
  b: Sq[];
  t: 'w' | 'b';
  cas: { K: boolean; Q: boolean; k: boolean; q: boolean };
  ep: number;
  half: number;
}

export interface Move {
  from: number;
  to: number;
  promo?: string;
  kind?: 'ep' | 'ck' | 'cq' | 'dbl';
}

export const GLYPH: Record<string, string> = { k: '♚︎', q: '♛︎', r: '♜︎', b: '♝︎', n: '♞︎', p: '♟︎' };
export const isWhite = (p: string) => p === p.toUpperCase();
export const rc = (i: number): [number, number] => [Math.floor(i / 8), i % 8];
const ok = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function initial(): State {
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const b: Sq[] = Array(64).fill(null);
  back.forEach((p, c) => {
    b[c] = p;
    b[56 + c] = p.toUpperCase();
    b[8 + c] = 'p';
    b[48 + c] = 'P';
  });
  return { b, t: 'w', cas: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0 };
}

const KN: [number, number][] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG: [number, number][] = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const RK: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export function attacked(b: Sq[], sq: number, byWhite: boolean): boolean {
  const [r, c] = rc(sq);
  const pawn = byWhite ? 'P' : 'p';
  const pr = byWhite ? r + 1 : r - 1;
  for (const dc of [-1, 1]) if (ok(pr, c + dc) && b[pr * 8 + c + dc] === pawn) return true;
  const knight = byWhite ? 'N' : 'n';
  for (const [dr, dc] of KN) if (ok(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === knight) return true;
  const king = byWhite ? 'K' : 'k';
  for (const [dr, dc] of KG) if (ok(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === king) return true;
  const slide = (dirs: [number, number][], kinds: string[]) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr;
      let cc = c + dc;
      while (ok(rr, cc)) {
        const p = b[rr * 8 + cc];
        if (p) {
          if (isWhite(p) === byWhite && kinds.includes(p.toLowerCase())) return true;
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
    return false;
  };
  return slide(RK, ['r', 'q']) || slide(BS, ['b', 'q']);
}

export function kingSq(b: Sq[], white: boolean) {
  return b.indexOf(white ? 'K' : 'k');
}

export const inCheck = (s: State) => attacked(s.b, kingSq(s.b, s.t === 'w'), s.t !== 'w');

function pseudo(s: State): Move[] {
  const out: Move[] = [];
  const white = s.t === 'w';
  const b = s.b;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p || isWhite(p) !== white) continue;
    const [r, c] = rc(i);
    const t = p.toLowerCase();
    if (t === 'p') {
      const dir = white ? -1 : 1;
      const startRow = white ? 6 : 1;
      const lastRow = white ? 0 : 7;
      const push = (to: number, kind?: Move['kind']) => {
        if (rc(to)[0] === lastRow) for (const pr of ['q', 'r', 'b', 'n']) out.push({ from: i, to, promo: pr });
        else out.push({ from: i, to, kind });
      };
      if (ok(r + dir, c) && !b[(r + dir) * 8 + c]) {
        push((r + dir) * 8 + c);
        if (r === startRow && !b[(r + 2 * dir) * 8 + c]) out.push({ from: i, to: (r + 2 * dir) * 8 + c, kind: 'dbl' });
      }
      for (const dc of [-1, 1]) {
        if (!ok(r + dir, c + dc)) continue;
        const to = (r + dir) * 8 + c + dc;
        const target = b[to];
        if (target && isWhite(target) !== white) push(to);
        else if (to === s.ep) out.push({ from: i, to, kind: 'ep' });
      }
    } else if (t === 'n' || t === 'k') {
      for (const [dr, dc] of t === 'n' ? KN : KG) {
        if (!ok(r + dr, c + dc)) continue;
        const to = (r + dr) * 8 + c + dc;
        const target = b[to];
        if (!target || isWhite(target) !== white) out.push({ from: i, to });
      }
      if (t === 'k') {
        const home = white ? 60 : 4;
        if (i === home && !attacked(b, home, !white)) {
          const kSide = white ? s.cas.K : s.cas.k;
          const qSide = white ? s.cas.Q : s.cas.q;
          const rook = white ? 'R' : 'r';
          if (kSide && b[home + 3] === rook && !b[home + 1] && !b[home + 2] && !attacked(b, home + 1, !white) && !attacked(b, home + 2, !white)) out.push({ from: i, to: home + 2, kind: 'ck' });
          if (qSide && b[home - 4] === rook && !b[home - 1] && !b[home - 2] && !b[home - 3] && !attacked(b, home - 1, !white) && !attacked(b, home - 2, !white)) out.push({ from: i, to: home - 2, kind: 'cq' });
        }
      }
    } else {
      const dirs = t === 'r' ? RK : t === 'b' ? BS : [...RK, ...BS];
      for (const [dr, dc] of dirs) {
        let rr = r + dr;
        let cc = c + dc;
        while (ok(rr, cc)) {
          const to = rr * 8 + cc;
          const target = b[to];
          if (!target) out.push({ from: i, to });
          else {
            if (isWhite(target) !== white) out.push({ from: i, to });
            break;
          }
          rr += dr;
          cc += dc;
        }
      }
    }
  }
  return out;
}

export function applyMove(s: State, m: Move): State {
  const b = [...s.b];
  const p = b[m.from]!;
  const white = isWhite(p);
  const captured = b[m.to];
  b[m.to] = m.promo ? (white ? m.promo.toUpperCase() : m.promo) : p;
  b[m.from] = null;
  if (m.kind === 'ep') b[m.to + (white ? 8 : -8)] = null;
  if (m.kind === 'ck') {
    b[m.to - 1] = b[m.to + 1];
    b[m.to + 1] = null;
  }
  if (m.kind === 'cq') {
    b[m.to + 1] = b[m.to - 2];
    b[m.to - 2] = null;
  }
  const cas = { ...s.cas };
  if (p === 'K') cas.K = cas.Q = false;
  if (p === 'k') cas.k = cas.q = false;
  if (m.from === 63 || m.to === 63) cas.K = false;
  if (m.from === 56 || m.to === 56) cas.Q = false;
  if (m.from === 7 || m.to === 7) cas.k = false;
  if (m.from === 0 || m.to === 0) cas.q = false;
  const ep = m.kind === 'dbl' ? (m.from + m.to) / 2 : -1;
  const half = p.toLowerCase() === 'p' || captured ? 0 : s.half + 1;
  return { b, t: s.t === 'w' ? 'b' : 'w', cas, ep, half };
}

export function legal(s: State): Move[] {
  return pseudo(s).filter((m) => {
    const n = applyMove(s, m);
    return !attacked(n.b, kingSq(n.b, s.t === 'w'), s.t !== 'w');
  });
}

export function insufficient(b: Sq[]) {
  const rest = b.filter((p) => p && p.toLowerCase() !== 'k') as string[];
  if (!rest.length) return true;
  return rest.length === 1 && ['b', 'n'].includes(rest[0].toLowerCase());
}

export const keyOf = (s: State) => `${s.b.map((p) => p ?? '.').join('')}${s.t}${s.cas.K}${s.cas.Q}${s.cas.k}${s.cas.q}${s.ep}`;

