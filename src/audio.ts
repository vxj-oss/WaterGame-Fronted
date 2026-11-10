let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem('waterfire-muted') === '1';
} catch {
}

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, to?: number, delay = 0) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur);
}

export const sfx = {
  jump: () => tone(320, 0.12, 'square', 0.04, 560),
  gem: () => {
    tone(880, 0.1, 'sine', 0.07);
    tone(1320, 0.15, 'sine', 0.07, undefined, 0.08);
  },
  die: () => tone(330, 0.5, 'sawtooth', 0.08, 60),
  door: () => tone(520, 0.15, 'triangle', 0.07, 780),
  click: () => tone(220, 0.05, 'square', 0.04),
  lever: () => tone(150, 0.12, 'square', 0.06, 90),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, undefined, i * 0.12)),
  isMuted: () => muted,
  toggleMute: () => {
    muted = !muted;
    try {
      localStorage.setItem('waterfire-muted', muted ? '1' : '0');
    } catch {
    }
    return muted;
  },
};
