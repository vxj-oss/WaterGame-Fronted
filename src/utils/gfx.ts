import Phaser from 'phaser';

export type Stops = [number, string][];
export type Variant = 'ember' | 'lagoon' | 'gold' | 'ghost';

export const RENDER = { q: 1 };

export function setQuality(zoom: number) {
  RENDER.q = Math.min(3, Math.max(1, Math.ceil(zoom)));
}

export const inv = () => 1 / RENDER.q;

export function makeCanvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, hq = true) {
  if (scene.textures.exists(key)) return key;
  const q = hq ? RENDER.q : 1;
  const tex = scene.textures.createCanvas(key, Math.round(w * q), Math.round(h * q))!;
  const ctx = tex.getContext();
  ctx.scale(q, q);
  draw(ctx);
  tex.refresh();
  return key;
}

export function grad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: Stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

export function gradientText(t: Phaser.GameObjects.Text, stops: Stops) {
  const g = t.context.createLinearGradient(0, 0, 0, t.height);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  t.setFill(g);
  return t;
}

export function backgroundTexture(scene: Phaser.Scene, W = 960, H = 584) {
  const key = `bg-${W}x${H}`;
  if (!scene.textures.exists(key)) {
    for (const k of scene.textures.getTextureKeys()) if (k.startsWith('bg-') && k !== key) scene.textures.remove(k);
  }
  return makeCanvas(scene, key, W, H, (ctx) => {
    ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#0f2c39'], [1, '#09171f']]);
    ctx.fillRect(0, 0, W, H);
    const glow = (x: number, y: number, r: number, c: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    };
    glow(0, H, 560, 'rgba(255,106,61,0.26)');
    glow(W, 0, 620, 'rgba(46,211,230,0.22)');
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < Math.round((W * H) / 6000); i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.06 + rnd() * 0.16})`;
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * H, 0.6 + rnd() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, false);
}

export function panelTexture(scene: Phaser.Scene, w: number, h: number, r = 28) {
  return makeCanvas(scene, `panel-${w}x${h}`, w + 60, h + 60, (ctx) => {
    ctx.translate(30, 30);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    rr(ctx, 0, 0, w, h, r);
    ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#1e4d63'], [1, '#0f2e3b']]);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    rr(ctx, 0.75, 0.75, w - 1.5, h - 1.5, r);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = grad(ctx, 0, 0, w, h, [[0, 'rgba(255,122,61,0.8)'], [0.5, 'rgba(255,255,255,0.16)'], [1, 'rgba(46,211,230,0.8)']]);
    ctx.stroke();
    rr(ctx, 3, 3, w - 6, h * 0.3, r - 3);
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fill();
  });
}

const VARIANTS: Record<Variant, { top: string; bot: string; glow: string; edge: string }> = {
  ember: { top: '#ffa862', bot: '#ff4d6d', glow: 'rgba(255,96,72,0.55)', edge: 'rgba(255,225,190,0.9)' },
  lagoon: { top: '#62e8f4', bot: '#3b8cff', glow: 'rgba(46,170,235,0.5)', edge: 'rgba(205,248,255,0.9)' },
  gold: { top: '#ffe48f', bot: '#ffae2b', glow: 'rgba(255,190,60,0.5)', edge: 'rgba(255,244,205,0.95)' },
  ghost: { top: 'rgba(255,255,255,0.10)', bot: 'rgba(255,255,255,0.05)', glow: 'rgba(0,0,0,0)', edge: 'rgba(255,255,255,0.28)' },
};

export function buttonTexture(scene: Phaser.Scene, variant: Variant, w: number, h: number) {
  const pad = 22;
  return makeCanvas(scene, `btn-${variant}-${w}x${h}`, w + pad * 2, h + pad * 2, (ctx) => {
    const v = VARIANTS[variant];
    ctx.translate(pad, pad);
    ctx.shadowColor = v.glow;
    ctx.shadowBlur = variant === 'ghost' ? 0 : 18;
    ctx.shadowOffsetY = variant === 'ghost' ? 0 : 6;
    rr(ctx, 0, 0, w, h, h * 0.36);
    ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, v.top], [1, v.bot]]);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    rr(ctx, 1, 1, w - 2, h - 2, h * 0.36);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = v.edge;
    ctx.globalAlpha = variant === 'ghost' ? 1 : 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (variant !== 'ghost') {
      rr(ctx, 4, 3, w - 8, h * 0.42, h * 0.3);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();
    }
  });
}

export function pillTexture(scene: Phaser.Scene, w: number, h: number, fill = 'rgba(8,24,32,0.72)', edge = 'rgba(255,255,255,0.16)') {
  return makeCanvas(scene, `pill-${w}x${h}-${fill}-${edge}`, w, h, (ctx) => {
    rr(ctx, 0.5, 0.5, w - 1, h - 1, h / 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = edge;
    ctx.stroke();
  });
}

export function circleTexture(scene: Phaser.Scene, size: number, variant: Variant = 'ghost') {
  const pad = 14;
  return makeCanvas(scene, `circle-${variant}-${size}`, size + pad * 2, size + pad * 2, (ctx) => {
    const v = VARIANTS[variant];
    ctx.translate(pad, pad);
    ctx.shadowColor = v.glow;
    ctx.shadowBlur = variant === 'ghost' ? 0 : 12;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fillStyle = grad(ctx, 0, 0, 0, size, [[0, v.top], [1, v.bot]]);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = v.edge;
    ctx.globalAlpha = variant === 'ghost' ? 1 : 0.55;
    ctx.stroke();
  });
}

export function cardTexture(scene: Phaser.Scene, w: number, h: number, state: 'open' | 'done' | 'locked') {
  return makeCanvas(scene, `card-${state}-${w}x${h}`, w + 24, h + 24, (ctx) => {
    ctx.translate(12, 12);
    if (state !== 'locked') {
      ctx.shadowColor = state === 'done' ? 'rgba(255,190,60,0.35)' : 'rgba(46,211,230,0.25)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
    }
    rr(ctx, 0, 0, w, h, 18);
    ctx.fillStyle = state === 'locked'
      ? 'rgba(255,255,255,0.04)'
      : grad(ctx, 0, 0, 0, h, [[0, state === 'done' ? '#2d5c70' : '#25566c'], [1, '#173e50']]);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    rr(ctx, 0.75, 0.75, w - 1.5, h - 1.5, 18);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = state === 'done' ? 'rgba(255,209,102,0.7)' : state === 'open' ? 'rgba(46,211,230,0.55)' : 'rgba(255,255,255,0.10)';
    ctx.stroke();
  });
}

export function glowTexture(scene: Phaser.Scene) {
  return makeCanvas(scene, 'glow', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }, false);
}
