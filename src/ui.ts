import Phaser from 'phaser';
import { sfx } from './audio';
import { buttonTexture, circleTexture, gradientText, inv, panelTexture, pillTexture, RENDER, Variant } from './gfx';
import { BODY, CSS, DISPLAY, EMBER, LAGOON } from './theme';
import { TOP } from './config';
import { VIEW } from './view';

export const SW = 960;
export const SH = 584;
export { gradientText };

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;
type Obj = Phaser.GameObjects.GameObject;

export function text(scene: Phaser.Scene, x: number, y: number, s: string, style: TextStyle = {}) {
  return scene.add.text(x, y, s, { resolution: RENDER.q, fontFamily: BODY, fontStyle: '800', fontSize: '18px', color: CSS.text, ...style });
}

export function display(scene: Phaser.Scene, x: number, y: number, s: string, size = '48px', style: TextStyle = {}) {
  return text(scene, x, y, s, { fontFamily: DISPLAY, fontStyle: '400', fontSize: size, ...style });
}

interface ButtonOpts {
  w?: number;
  h?: number;
  variant?: Variant;
  size?: string;
  depth?: number;
  fixed?: boolean;
  align?: 'center' | 'left';
}

function pressable(scene: Phaser.Scene, hit: Phaser.GameObjects.Image, targets: [Obj, number][], onClick: () => void) {
  const to = (s: number, d = 120) => targets.forEach(([o, b]) => scene.tweens.add({ targets: o, scale: b * s, duration: d, ease: 'Back.out' }));
  hit.setInteractive({ useHandCursor: true });
  hit.on('pointerover', () => to(1.06));
  hit.on('pointerout', () => to(1));
  hit.on('pointerdown', () => {
    to(0.94, 80);
    sfx.click();
    scene.time.delayedCall(110, onClick);
  });
}

export function button(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void, opts: ButtonOpts = {}): Obj[] {
  const { w = 280, h = 56, variant = 'ember', size = '20px', depth = 0, fixed = false, align = 'center' } = opts;
  const cx = align === 'left' ? x + w / 2 : x;
  const img = scene.add.image(cx, y, buttonTexture(scene, variant, w, h)).setDepth(depth).setScale(inv());
  const t = text(scene, cx, y - 1, caption, { fontSize: size }).setOrigin(0.5).setDepth(depth + 1);
  if (variant === 'gold') t.setColor('#4a2a00');
  pressable(scene, img, [[img, inv()], [t, 1]], onClick);
  return [img, t];
}

export function circleButton(scene: Phaser.Scene, x: number, y: number, glyph: string, onClick: () => void, opts: { size?: number; variant?: Variant; depth?: number; fixed?: boolean } = {}): Obj[] {
  const { size = 46, variant = 'ghost', depth = 0, fixed = false } = opts;
  const img = scene.add.image(x, y, circleTexture(scene, size, variant)).setDepth(depth).setScale(inv());
  const t = text(scene, x, y, glyph, { fontSize: `${Math.round(size * 0.5)}px` }).setOrigin(0.5).setDepth(depth + 1);
  pressable(scene, img, [[img, inv()], [t, 1]], onClick);
  return [img, t];
}

export function pill(scene: Phaser.Scene, x: number, y: number, w: number, h: number, caption: string, opts: { size?: string; color?: string; depth?: number; fixed?: boolean; fill?: string; edge?: string; originX?: number } = {}): { img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text } {
  const { size = '15px', color = CSS.text, depth = 0, fixed = false, fill, edge, originX = 0.5 } = opts;
  const cx = x + (0.5 - originX) * w;
  const img = scene.add.image(cx, y, pillTexture(scene, w, h, fill, edge)).setDepth(depth).setScale(inv());
  const label = text(scene, cx, y, caption, { fontSize: size, color }).setOrigin(0.5).setDepth(depth + 1);
  return { img, label };
}

export interface Modal {
  objs: Obj[];
  cx: number;
  cy: number;
  left: number;
  top: number;
  w: number;
  h: number;
  depth: number;
  fixed: boolean;
  track: (...o: Obj[]) => Obj[];
  close: () => void;
}

export function modal(scene: Phaser.Scene, o: { w: number; h: number; title: string; subtitle?: string; onClose?: () => void; depth?: number; fixed?: boolean; closable?: boolean }): Modal {
  const { w, h, title, subtitle, onClose, depth = 40, fixed = true, closable = true } = o;
  const dy = fixed ? TOP : 0;
  const cx = SW / 2;
  const cy = SH / 2 - dy;
  const objs: Obj[] = [];
  const track = (...list: Obj[]) => {
    list.forEach((e) => {
      const g = e as unknown as Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Alpha;
      objs.push(e);
      g.setAlpha(0);
      scene.tweens.add({ targets: e, alpha: 1, duration: 220 });
    });
    return list;
  };

  const dim = scene.add.rectangle(-VIEW.ox, -VIEW.oy - dy, VIEW.w, VIEW.h, 0x061219, 0.78).setOrigin(0).setDepth(depth).setInteractive();
  const panel = scene.add.image(cx, cy, panelTexture(scene, w, h)).setDepth(depth + 1);
  const head = display(scene, cx - w / 2 + 34, cy - h / 2 + 44, title, '38px').setOrigin(0, 0.5).setDepth(depth + 2);
  gradientText(head, [[0, '#ffd36b'], [0.5, '#ff7a3d'], [1, '#ff4d6d']]);
  track(dim, panel, head);
  if (subtitle) {
    const sub = text(scene, cx - w / 2 + 34, cy - h / 2 + 78, subtitle, { fontSize: '15px', color: CSS.mute, fontStyle: '700' }).setOrigin(0, 0.5).setDepth(depth + 2);
    track(sub);
  }

  const m: Modal = {
    objs,
    cx,
    cy,
    left: cx - w / 2 + 34,
    top: cy - h / 2,
    w,
    h,
    depth,
    fixed,
    track,
    close: () => {
      objs.forEach((e) => e.destroy());
      objs.length = 0;
      onClose?.();
    },
  };

  if (closable) {
    track(...circleButton(scene, cx + w / 2 - 38, cy - h / 2 + 40, '✕', () => m.close(), { size: 40, depth: depth + 3, fixed }));
  }

  panel.setScale(inv() * 0.9);
  scene.tweens.add({ targets: panel, scale: inv(), duration: 260, ease: 'Back.out' });
  return m;
}

export { EMBER, LAGOON };
