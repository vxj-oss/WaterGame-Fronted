export interface LevelRecord {
  stars: number;
  bestMs: number;
  gems: number;
}
interface SaveData {
  levels: Record<string, LevelRecord>;
}

const KEY = 'waterfire-save-v1';

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as SaveData;
  } catch {
  }
  return { levels: {} };
}

function store(d: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
  }
}

export function getRecord(i: number): LevelRecord | undefined {
  return load().levels[String(i)];
}

export function record(i: number, ms: number, gems: number, stars: number) {
  const d = load();
  const prev = d.levels[String(i)];
  d.levels[String(i)] = {
    stars: Math.max(stars, prev?.stars ?? 0),
    bestMs: Math.min(ms, prev?.bestMs ?? Infinity),
    gems: Math.max(gems, prev?.gems ?? 0),
  };
  store(d);
}

export const isUnlocked = (i: number) => i === 0 || !!getRecord(i - 1);

export function nextLevelIndex(total: number): number {
  for (let i = 0; i < total; i++) if (!getRecord(i)) return i;
  return 0;
}
