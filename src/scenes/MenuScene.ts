import Phaser from 'phaser';
import { LEVELS } from '../data/levels';
import { net } from '../services/net';
import { openOnline } from '../components/screens';
import { openHub } from '../games/hub';
import { nextLevelIndex } from '../services/save';
import { sfx } from '../services/audio';
import { toggleFullscreen } from '../utils/fullscreen';
import { backgroundTexture } from '../utils/gfx';
import { CSS, EMBER, LAGOON } from '../config/theme';
import { button, circleButton, display, gradientText, modal, pill, SH, SW, text } from '../components/ui';
import { applyCamera, VIEW } from '../config/view';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    applyCamera(this, SW / 2, SH / 2);
    this.add.image(-VIEW.ox, -VIEW.oy, backgroundTexture(this, VIEW.w, VIEW.h)).setOrigin(0).setDisplaySize(VIEW.w, VIEW.h);
    this.buildAmbient();
    this.buildArt();
    this.buildTop();

    const x0 = 56 - VIEW.ox;
    pill(this, x0, 70, 236, 30, 'JUEGO EN PAREJA', { size: '13px', color: CSS.lagoon, originX: 0 });
    const fuego = gradientText(display(this, x0 - 4, 138, 'Fuego', '112px').setOrigin(0, 0.5), EMBER);
    const agua = gradientText(display(this, x0 + 26, 236, '& Agua', '112px').setOrigin(0, 0.5), LAGOON);
    [fuego, agua].forEach((t, i) => {
      t.setAlpha(0).setY(t.y + 24);
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 24, duration: 520, delay: 120 + i * 140, ease: 'Back.out' });
    });
    text(this, x0, 318, 'Dos personajes, un solo camino', { fontSize: '19px', color: CSS.mute, fontStyle: '700' });

    button(this, x0, 384, 'Jugar en pareja', () => void openOnline(this), { w: 320, h: 60, size: '24px', align: 'left' });
    button(this, x0, 448, 'Jugar local', () => openHub(this, 'local'), { w: 320, h: 48, variant: 'lagoon', size: '19px', align: 'left' });
    button(this, x0, 504, 'Ver más juegos', () => openHub(this), { w: 320, h: 48, variant: 'gold', size: '19px', align: 'left' });
    text(this, x0, 556, 'Fuego: A D W    Agua: ← → ↑    R reinicia', { fontSize: '14px', color: CSS.mute, fontStyle: '700' });

    if (net.reopenLobby) {
      net.reopenLobby = false;
      void openOnline(this);
    }
  }

  private buildTop() {
    const right = SW + VIEW.ox;
    const ty = 40 - VIEW.oy;
    circleButton(this, right - 40, ty, '⛶', () => void toggleFullscreen(), { size: 46 });
    circleButton(this, right - 96, ty, '⚙', () => this.openSettings(), { size: 46 });
    const name = net.user ? net.user.name : 'Entrar';
    const probe = text(this, 0, -100, name, { fontSize: '16px' });
    const w = Math.min(230, probe.width + 62);
    probe.destroy();
    const px = right - 124 - w;
    const chip = pill(this, px, ty, w, 40, name, { size: '16px', originX: 0 });
    chip.label.setX(px + 44).setOrigin(0, 0.5);
    const dot = this.add.circle(px + 22, ty, 11, net.token ? 0x2ed3e6 : 0xff7a3d);
    text(this, px + 22, ty, net.user ? name.charAt(0).toUpperCase() : '?', { fontSize: '13px', color: '#06222b' }).setOrigin(0.5);
    dot.setDepth(0);
    chip.img.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      sfx.click();
      if (net.token) this.openSettings();
      else void openOnline(this);
    });
  }

  private buildAmbient() {
    const rise = (x: [number, number], tint: number[]) =>
      this.add.particles(0, 0, 'spark', {
        x: { min: x[0], max: x[1] },
        y: SH + VIEW.oy + 10,
        lifespan: 7000,
        speedY: { min: -60, max: -26 },
        speedX: { min: -14, max: 14 },
        scale: { start: 0.9, end: 0.2 },
        alpha: { start: 0.55, end: 0 },
        frequency: 260,
        tint,
        blendMode: 'ADD',
      });
    rise([-VIEW.ox, 520 + VIEW.ox], [0xff7a3d, 0xffb347, 0xff4d6d]);
    rise([440 + VIEW.ox, SW + VIEW.ox], [0x2ed3e6, 0x9af3ff, 0x3b8cff]);
  }

  private buildArt() {
    const floor = 478;
    const dx = VIEW.ox;
    const start = 448 + dx;
    const tiles = Math.ceil((SW + VIEW.ox - start) / 32) + 1;
    const rows = Math.ceil((SH + VIEW.oy - floor) / 32) + 1;
    for (let i = 0; i < tiles; i++) {
      for (let r = 0; r < rows; r++) this.add.image(start + i * 32 + 16, floor + 16 + r * 32, 'wall').setTint(r ? 0xb8c6cc : 0xffffff);
    }
    this.add.image(836 + dx, floor - 52, 'door-fire').setScale(2.6);
    this.add.image(896 + dx, floor - 52, 'door-water').setScale(2.6);

    const glow = (x: number, y: number, tint: number) => {
      const g = this.add.image(x, y, 'glow').setTint(tint).setScale(3.4).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: g, alpha: 0.28, scale: 3.9, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    };
    glow(600 + dx, 420, 0xff7a3d);
    glow(716 + dx, 420, 0x2ed3e6);

    const hero = (x: number, key: string, delay: number) => {
      const s = this.add.image(x, floor - 54, key).setScale(3.6).setDepth(2);
      this.tweens.add({ targets: s, scaleY: 3.8, scaleX: 3.45, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay });
      this.tweens.add({ targets: s, y: s.y - 5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay });
      return s;
    };
    const fire = hero(600 + dx, 'fire', 0);
    const water = hero(716 + dx, 'water', 450);

    const trail = (follow: Phaser.GameObjects.Image, tint: number[]) =>
      this.add
        .particles(0, 0, 'spark', {
          follow,
          followOffset: { x: 0, y: 28 },
          frequency: 60,
          lifespan: 800,
          speedY: { min: -80, max: -30 },
          speedX: { min: -18, max: 18 },
          scale: { start: 1.5, end: 0 },
          alpha: { start: 0.9, end: 0 },
          tint,
          blendMode: 'ADD',
        })
        .setDepth(1);
    trail(fire, [0xff4a1c, 0xffa02a, 0xffd23f]);
    trail(water, [0x2fa8ff, 0x9fe0ff, 0xffffff]);

    const heart = text(this, 658 + dx, 340, '♥', { fontSize: '40px', color: '#ff5a7a' }).setOrigin(0.5).setDepth(3);
    this.tweens.add({ targets: heart, y: 316, alpha: 0.55, scale: 1.18, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const gem = (x: number, y: number, key: string, delay: number) => {
      const s = this.add.image(x, y, key).setScale(2.2).setDepth(2);
      this.tweens.add({ targets: s, y: y - 14, angle: 8, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay });
    };
    gem(520 + dx, 380, 'gem-red', 0);
    gem(790 + dx, 372, 'gem-blue', 600);
  }

  private openSettings() {
    const m = modal(this, { w: 500, h: 420, title: 'Ajustes', subtitle: 'Sonido, pantalla y cuenta', depth: 60 });
    const L = m.left;
    const W = m.w - 68;
    const rows = [
      { y: m.top + 150, label: 'Sonido', value: () => (sfx.isMuted() ? 'Apagado' : 'Encendido'), action: 'Cambiar', variant: 'lagoon' as const },
      { y: m.top + 232, label: 'Pantalla', value: () => 'Ocupa todo el dispositivo', action: 'Completa', variant: 'lagoon' as const },
      { y: m.top + 314, label: 'Cuenta', value: () => (net.user ? net.user.name : 'Sin sesión'), action: net.token ? 'Cerrar sesión' : 'Entrar', variant: net.token ? ('ghost' as const) : ('ember' as const) },
    ];
    rows.forEach((r, i) => {
      const lab = text(this, L, r.y - 14, r.label, { fontSize: '20px' }).setDepth(m.depth + 2);
      const val = text(this, L, r.y + 12, r.value(), { fontSize: '15px', color: CSS.mute, fontStyle: '700' }).setDepth(m.depth + 2);
      const act = () => {
        if (i === 0) {
          sfx.toggleMute();
          val.setText(r.value());
        } else if (i === 1) {
          void toggleFullscreen();
        } else if (net.token) {
          net.logout();
          m.close();
          this.scene.restart();
        } else {
          m.close();
          void openOnline(this);
        }
      };
      const b = button(this, L + W - 150, r.y, r.action, act, { w: 150, h: 46, variant: r.variant, size: '16px', depth: m.depth + 3, align: 'left' });
      m.track(lab, val, ...b);
    });
  }
}
