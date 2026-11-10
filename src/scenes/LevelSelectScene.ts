import Phaser from 'phaser';
import { LEVELS } from '../levels';
import { getRecord, isUnlocked } from '../save';
import { sfx } from '../audio';
import { net } from '../net';
import { backgroundTexture, cardTexture, inv } from '../gfx';
import { CSS, DISPLAY } from '../theme';
import { modal, SH, SW, text } from '../ui';
import { applyCamera, VIEW } from '../view';

export class LevelSelectScene extends Phaser.Scene {
  private online = false;

  constructor() {
    super('LevelSelect');
  }

  init(data?: { online?: boolean }) {
    this.online = !!data?.online;
  }

  create() {
    applyCamera(this, SW / 2, SH / 2);
    this.add.image(-VIEW.ox, -VIEW.oy, backgroundTexture(this, VIEW.w, VIEW.h)).setOrigin(0).setDisplaySize(VIEW.w, VIEW.h);
    const done = LEVELS.filter((_, i) => getRecord(i)).length;
    const sub = this.online ? 'Los dos irán al nivel que elijas' : `${done} de ${LEVELS.length} completados`;
    const m = modal(this, { w: 880, h: 520, title: 'Elige un nivel', subtitle: sub, depth: 10, fixed: false, onClose: () => this.back() });

    const perRow = 6;
    const cw = 124;
    const ch = 80;
    const gap = 12;
    const x0 = m.cx - (perRow * cw + (perRow - 1) * gap) / 2;
    const y0 = m.top + 118;

    LEVELS.forEach((lv, i) => {
      const x = x0 + (i % perRow) * (cw + gap) + cw / 2;
      const y = y0 + Math.floor(i / perRow) * (ch + gap) + ch / 2;
      const open = isUnlocked(i);
      const rec = getRecord(i);
      const stars = rec?.stars ?? 0;
      const state = !open ? 'locked' : rec ? 'done' : 'open';
      const card = this.add.image(x, y, cardTexture(this, cw, ch, state)).setDepth(m.depth + 2).setScale(inv());
      const num = text(this, x - cw / 2 + 14, y - 14, String(i + 1), { fontFamily: DISPLAY, fontStyle: '400', fontSize: '34px', color: open ? CSS.text : CSS.mute }).setOrigin(0, 0.5).setDepth(m.depth + 3);
      const name = text(this, x - cw / 2 + 14, y + 24, lv.name.slice(0, 16), { fontSize: '12px', color: CSS.mute, fontStyle: '700' }).setOrigin(0, 0.5).setDepth(m.depth + 3);
      const right = open
        ? text(this, x + cw / 2 - 12, y - 14, '★'.repeat(stars) + '☆'.repeat(3 - stars), { fontSize: '15px', color: CSS.gold }).setOrigin(1, 0.5).setDepth(m.depth + 3)
        : text(this, x + cw / 2 - 14, y - 14, '🔒', { fontSize: '16px' }).setOrigin(1, 0.5).setDepth(m.depth + 3);
      if (!open) [num, name, right].forEach((o) => o.setAlpha(0.45));
      m.track(card, num, name, right);
      if (open) {
        const to = (s: number) => {
          this.tweens.add({ targets: card, scale: inv() * s, duration: 110, ease: 'Back.out' });
          this.tweens.add({ targets: [num, name, right], scale: s, duration: 110, ease: 'Back.out' });
        };
        card
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => to(1.07))
          .on('pointerout', () => to(1))
          .on('pointerdown', () => {
            sfx.click();
            this.play(i);
          });
      }
    });

    this.input.keyboard!.once('keydown-ESC', () => m.close());

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
