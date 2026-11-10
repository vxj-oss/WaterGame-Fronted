import Phaser from 'phaser';
import { sfx } from './audio';
import { C, CSS, DISPLAY, MONO, SIZE } from './theme';

// Texto nítido en pantallas de alta densidad.
export const dpr = Math.min(2, window.devicePixelRatio || 1);

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

export function text(scene: Phaser.Scene, x: number, y: number, s: string, style: TextStyle = {}) {
  return scene.add.text(x, y, s, { resolution: dpr, color: CSS.bone, fontFamily: MONO, fontSize: SIZE.chrome, ...style });
}

/** Rótulo de interfaz: monoespaciada, mayúsculas. */
export function label(scene: Phaser.Scene, x: number, y: number, s: string, style: TextStyle = {}) {
  return text(scene, x, y, s.toUpperCase(), style);
}

/** Texto de título: Inter 400. */
export function display(scene: Phaser.Scene, x: number, y: number, s: string, size = SIZE.display, style: TextStyle = {}) {
  return text(scene, x, y, s, { fontFamily: DISPLAY, fontSize: size, ...style });
}

/** Marca de subrayado de 1px (firma del sistema de diseño). */
export function underline(scene: Phaser.Scene, x: number, y: number, w: number, alpha = 1) {
  return scene.add.rectangle(x, y, w, 1, C.frost, alpha).setOrigin(0, 0.5);
}

interface ButtonOpts {
  w?: number;
  h?: number;
  size?: string;
  depth?: number;
  fixed?: boolean; // true = no se mueve con la cámara (HUD y overlays)
  align?: 'center' | 'left'; // 'left': (x,y) es el borde izquierdo
}

/** Botón: relleno carbón, borde hairline y rótulo mono en mayúsculas. Sin sombras ni degradados. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  caption: string,
  onClick: () => void,
  opts: ButtonOpts = {},
): Phaser.GameObjects.GameObject[] {
  const { w = 300, h = 48, size = SIZE.chrome, depth = 0, fixed = false, align = 'center' } = opts;
  const cx = align === 'left' ? x + w / 2 : x;
  const rect = scene.add.rectangle(cx, y, w, h, C.charcoal).setStrokeStyle(1, C.frost).setDepth(depth);
  const t = label(scene, cx, y, caption, { fontSize: size }).setOrigin(0.5).setDepth(depth + 1);
  if (fixed) {
    rect.setScrollFactor(0);
    t.setScrollFactor(0);
  }
  rect
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => rect.setFillStyle(0x5a585b))
    .on('pointerout', () => rect.setFillStyle(C.charcoal))
    .on('pointerdown', () => {
      sfx.click();
      onClick();
    });
  return [rect, t];
}

/** Enlace de texto de la barra superior: al pasar el cursor aparece una línea de 1px. */
export function navLink(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void, originX = 0) {
  const t = label(scene, x, y, caption, { fontSize: SIZE.caption }).setOrigin(originX, 0.5);
  const line = scene.add.rectangle(t.x - t.width * originX, y + 12, t.width, 1, C.frost).setOrigin(0, 0.5).setVisible(false);
  t.setInteractive({ useHandCursor: true })
    .on('pointerover', () => line.setVisible(true))
    .on('pointerout', () => line.setVisible(false))
    .on('pointerdown', () => {
      sfx.click();
      onClick();
    });
  return t;
}
