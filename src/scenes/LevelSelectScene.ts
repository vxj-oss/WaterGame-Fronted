import Phaser from 'phaser';
import { COLS, ROWS, TILE, TOP } from '../config';
import { LEVELS } from '../levels';
import { getRecord, isUnlocked } from '../save';
import { sfx } from '../audio';
import { net } from '../net';
import { C, CSS, DISPLAY, MONO, SIZE } from '../theme';
import { display, label, navLink, text, underline } from '../ui';

const W = COLS * TILE;
const H = ROWS * TILE + TOP;

export class LevelSelectScene extends Phaser.Scene {
  private online = false;

  constructor() {
    super('LevelSelect');
  }

  init(data: { online?: boolean }) {
    this.online = !!data.online;
  }

  create() {
    this.add.rectangle(0, 0, W, H, C.void).setOrigin(0);

    // Barra superior transparente con hairline
    this.add.rectangle(0, TOP, W, 1, C.frost, 0.15).setOrigin(0, 0.5);
    this.add.rectangle(30, TOP / 2, 9, 9, C.bone).setAngle(45);
    label(this, 48, TOP / 2, 'Fuego y Agua', { fontSize: SIZE.caption }).setOrigin(0, 0.5);
    navLink(this, W - 24, TOP / 2, '← Atrás', () => this.back(), 1);

    const done = LEVELS.filter((_, i) => getRecord(i)).length;
    const title = display(this, 64, 96, 'Niveles', '56px').setOrigin(0, 0.5);
    underline(this, 64, 132, title.width * 0.5);
    label(this, W - 64, 96, `${String(done).padStart(2, '0')} / ${String(LEVELS.length).padStart(2, '0')} completados`, {
      fontSize: SIZE.caption, color: CSS.ash,
    }).setOrigin(1, 0.5);
    if (this.online) label(this, W - 64, 118, 'Los dos irán al nivel que elijas', { fontSize: '12px', color: CSS.ash }).setOrigin(1, 0.5);

    const perRow = 6;
    const cw = 132, ch = 92, gapX = 12, gapY = 12;
    const x0 = (W - (perRow * cw + (perRow - 1) * gapX)) / 2;
    const y0 = 160;

    LEVELS.forEach((lv, i) => {
      const x = x0 + (i % perRow) * (cw + gapX);
      const y = y0 + Math.floor(i / perRow) * (ch + gapY);
      const open = isUnlocked(i);
      const rec = getRecord(i);
      const stars = rec?.stars ?? 0;

      const card = this.add.rectangle(x, y, cw, ch, C.void).setOrigin(0).setStrokeStyle(1, C.frost, open ? 0.5 : 0.15);
      text(this, x + 12, y + 8, String(i + 1).padStart(2, '0'), { fontFamily: DISPLAY, fontSize: '38px', color: open ? CSS.bone : CSS.ash }).setAlpha(open ? 1 : 0.35);
      if (open) text(this, x + cw - 10, y + 14, '★'.repeat(stars) + '☆'.repeat(3 - stars), { fontSize: '14px', color: CSS.bone }).setOrigin(1, 0);
      else text(this, x + cw - 10, y + 14, '—', { fontSize: '14px', color: CSS.ash }).setOrigin(1, 0).setAlpha(0.4);
      label(this, x + 12, y + ch - 12, lv.name.slice(0, 15), { fontSize: '11px', color: CSS.ash }).setOrigin(0, 1).setAlpha(open ? 1 : 0.4);

      if (open) {
        card
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => card.setFillStyle(C.charcoal))
          .on('pointerout', () => card.setFillStyle(C.void))
          .on('pointerdown', () => {
            sfx.click();
            this.play(i);
          });
      }
    });

    this.input.keyboard!.once('keydown-ESC', () => this.back());

    // Si tu pareja elige un nivel, te lleva con ella.
    if (this.online) {
      const off = net.on('event', (e: { t: string; level?: number }) => {
        if (e.t === 'goto' && typeof e.level === 'number') this.scene.start('Level', { level: e.level, online: true });
      });
      this.events.once('shutdown', off);
    }
  }

  private play(level: number) {
    if (this.online) net.send('event', { t: 'goto', level });
    this.scene.start('Level', { level, online: this.online });
  }

  private back() {
    if (this.online) net.reopenLobby = true;
    this.scene.start('Menu');
  }
}
