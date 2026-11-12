import { api, net } from './net';

export interface Records {
  versus: Record<string, { fire: number; water: number }>;
  best: Record<string, number>;
}

const LOCAL_KEY = 'wf-local-records';

let remote: Records = { versus: {}, best: {} };

function readLocal(): Record<string, [number, number]> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as Record<string, [number, number]>;
  } catch {
    return {};
  }
}

export async function loadRecords() {
  if (!net.token) return remote;
  try {
    const r = await api<{ versus: { game: string; role: 'fire' | 'water'; wins: number }[]; best: { game: string; best: number }[] }>('/records');
    const next: Records = { versus: {}, best: {} };
    for (const v of r.versus) (next.versus[v.game] ??= { fire: 0, water: 0 })[v.role] = v.wins;
    for (const b of r.best) next.best[b.game] = b.best;
    remote = next;
  } catch {
    return remote;
  }
  return remote;
}

export function addOnlineWin(game: string, winner: 'fire' | 'water', post: boolean) {
  (remote.versus[game] ??= { fire: 0, water: 0 })[winner]++;
  if (post) void api('/records/match', 'POST', { game, winner }).catch(() => undefined);
}

export function addOnlineBest(game: string, score: number, post: boolean) {
  remote.best[game] = Math.max(remote.best[game] ?? 0, score);
  if (post) void api('/records/best', 'POST', { game, score }).catch(() => undefined);
}

export function addLocalWin(game: string, winner: 0 | 1) {
  const all = readLocal();
  const cur = all[game] ?? [0, 0];
  cur[winner]++;
  all[game] = cur;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch {
    return;
  }
}

export function onlineVersus(game: string): [number, number] | null {
  const r = remote.versus[game];
  const me = net.role;
  if (!r || !me) return null;
  return me === 'fire' ? [r.fire, r.water] : [r.water, r.fire];
}

export function localVersus(game: string): [number, number] | null {
  return readLocal()[game] ?? null;
}

export function onlineBest(game: string) {
  return remote.best[game] ?? null;
}
