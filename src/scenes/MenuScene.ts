import Phaser from 'phaser';
import { COLS, ROWS, TILE, TOP } from '../config';
import { LEVELS } from '../levels';
import { net } from '../net';
import { openOnline } from '../screens';
import { nextLevelIndex } from '../save';
import { toggleFullscreen } from '../fullscreen';
import { C, CSS, SIZE } from '../theme';
import { display, label, makeButton, navLink, underline } from '../ui';

const W = COLS * TILE;
const H = ROWS * TILE + TOP;

/** Portada: título apilado a la izquierda con la marca de subrayado, y un diorama a la derecha. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.add.rectangle(0, 0, W, H, C.void).setOrigin(0);
    this.buildArt();
    this.buildNav();

    // Título apilado: Inter 400, interlineado ajustado y una línea hairline bajo cada renglón.
    const x0 = 64;
    ['Fuego', 'y', 'Agua'].forEach((word, i) => {
      const y = 140 + i * 84;
      const t = display(this, x0, y, word).setOrigin(0, 0.5);
      underline(this, x0, y + 38, Math.max(70, t.width * 0.5));
    });
    label(this, x0, 392, 'Un juego cooperativo para dos', { fontSize: SIZE.caption, color: CSS.ash });

    const play = () => this.scene.start('Level', { level: nextLevelIndex(LEVELS.length) });
    const o = { w: 300, h: 40, size: '15px', align: 'left' as const };
    makeButton(this, x0, 440, 'Jugar en pareja', () => void openOnline(this), o);
    makeButton(this, x0, 486, 'Jugar local', play, o);
    makeButton(this, x0, 532, 'Niveles', () => this.scene.start('LevelSelect'), o);

    label(this, W - 24, H - 22, 'Fuego A D W · Agua ← → ↑ · R reiniciar', { fontSize: '12px', color: CSS.ash }).setOrigin(1, 0.5);

    if (net.reopenLobby) {
      net.reopenLobby = false;
      void openOnline(this);
    }
  }

  private buildNav() {
    this.add.rectangle(0, TOP, W, 1, C.frost, 0.15).setOrigin(0, 0.5);
    this.add.rectangle(30, TOP / 2, 9, 9, C.bone).setAngle(45);
    label(this, 48, TOP / 2, 'Fuego y Agua', { fontSize: SIZE.caption }).setOrigin(0, 0.5);

    const fs = navLink(this, W - 24, TOP / 2, 'Pantalla completa', () => void toggleFullscreen(), 1);
    const who = net.user ? net.user.name : 'Sin sesión';
    const sess = label(this, fs.x - fs.width - 36, TOP / 2, who, { fontSize: SIZE.caption, color: CSS.ash }).setOrigin(1, 0.5);
    this.add.rectangle(sess.x + 18, TOP / 2, 1, 14, C.frost, 0.3);
  }

  /** Diorama: dos puertas, los dos personajes sobre un suelo de piedra y un par de gemas. */
  private buildArt() {
    const floorY = 470;
    for (let i = 0; i < 14; i++) this.add.image(500 + i * 32 + 16, floorY + 16, 'wall');
    this.add.image(842, floorY - 48, 'door-fire').setScale(2.4);
    this.add.image(902, floorY - 48, 'door-water').setScale(2.4);

    const fire = this.add.image(640, floorY - 51, 'fire').setScale(3.4).setDepth(2);
    const water = this.add.image(748, floorY - 51, 'water').setScale(3.4).setDepth(2);
    this.tweens.add({ targets: fire, scaleY: 3.55, scaleX: 3.3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: water, scaleY: 3.55, scaleX: 3.3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 450 });

    const trail = (follow: Phaser.GameObjects.Image, tint: number[]) =>
      this.add
        .particles(0, 0, 'spark', {
          follow, followOffset: { x: 0, y: 20 }, frequency: 70, lifespan: 700,
          speedY: { min: -70, max: -25 }, speedX: { min: -14, max: 14 },
          scale: { start: 1.4, end: 0 }, alpha: { start: 0.8, end: 0 }, tint, blendMode: 'ADD',
        })
        .setDepth(1);
    trail(fire, [0xff4a1c, 0xffa02a, 0xffd23f]);
    trail(water, [0x2fa8ff, 0x9fe0ff, 0xffffff]);

    const gem = (x: number, y: number, key: string, delay: number) => {
      const s = this.add.image(x, y, key).setScale(2);
      this.tweens.add({ targets: s, y: y - 12, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay });
    };
    gem(694, 330, 'gem-red', 0);
    gem(796, 350, 'gem-blue', 500);
  }
}
