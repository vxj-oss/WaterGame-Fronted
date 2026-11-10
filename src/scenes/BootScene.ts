import Phaser from 'phaser';

// Genera todos los gráficos con código (formas simples) para no depender de imágenes.
// El mundo es monocromo (vacío negro y grises); el color lo ponen solo los personajes, las gemas,
// los peligros y los mecanismos, como en el sistema de diseño.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const g = this.make.graphics({}, false);
    const tex = (key: string, w: number, h: number, draw: () => void) => {
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };

    // Fondo: vacío negro con una cuadrícula casi invisible.
    tex('bg', 32, 32, () => {
      g.fillStyle(0x000000).fillRect(0, 0, 32, 32);
      g.fillStyle(0x0d0d0d).fillRect(0, 0, 32, 1).fillRect(0, 0, 1, 32);
    });

    // Pared: gris carbón con un filo claro arriba.
    tex('wall', 32, 32, () => {
      g.fillStyle(0x161516).fillRect(0, 0, 32, 32);
      g.fillStyle(0x2a292b).fillRect(1, 1, 30, 30);
      g.fillStyle(0x444345).fillRect(1, 1, 30, 2);
    });

    // Caja: gris ceniza con una cruz carbón.
    tex('box', 32, 32, () => {
      g.fillStyle(0xe2e2e2).fillRect(0, 0, 32, 32);
      g.fillStyle(0xb8bab9).fillRect(2, 2, 28, 28);
      g.lineStyle(2, 0x444345).lineBetween(4, 4, 28, 28).lineBetween(28, 4, 4, 28);
      g.lineStyle(2, 0x444345).strokeRect(2, 2, 28, 28);
    });

    tex('spark', 6, 6, () => {
      g.fillStyle(0xffffff).fillCircle(3, 3, 3);
    });

    const body = (key: string, color: number, tip: number) =>
      tex(key, 24, 30, () => {
        g.fillStyle(color).fillRoundedRect(0, 6, 24, 24, 8);
        g.fillStyle(tip).fillTriangle(12, 0, 3, 13, 21, 13);
        g.fillStyle(0xffffff).fillCircle(8, 19, 4).fillCircle(16, 19, 4);
        g.fillStyle(0x111111).fillCircle(9, 19, 2).fillCircle(17, 19, 2);
      });
    body('fire', 0xff4a1c, 0xffa02a);
    body('water', 0x2fa8ff, 0x9fe0ff);

    const gem = (key: string, color: number) =>
      tex(key, 16, 16, () => {
        g.fillStyle(color).fillPoints(
          [new Phaser.Geom.Point(8, 0), new Phaser.Geom.Point(16, 8), new Phaser.Geom.Point(8, 16), new Phaser.Geom.Point(0, 8)],
          true,
        );
        g.fillStyle(0xffffff, 0.6).fillTriangle(8, 2, 12, 8, 8, 8);
      });
    gem('gem-red', 0xff3355);
    gem('gem-blue', 0x33b6ff);

    const puddle = (key: string, base: number, top: number) =>
      tex(key, 32, 12, () => {
        g.fillStyle(base).fillRect(0, 0, 32, 12);
        g.fillStyle(top).fillRect(0, 0, 32, 4);
      });
    puddle('lava', 0xff5a1a, 0xffb02e);
    puddle('pool', 0x2f8cff, 0x9ad4ff);
    puddle('goo', 0x3fa83a, 0x9aea6a);

    const door = (key: string, frame: number, inner: number) =>
      tex(key, 28, 40, () => {
        g.fillStyle(frame).fillRoundedRect(0, 0, 28, 40, 4);
        g.fillStyle(inner).fillRoundedRect(4, 4, 20, 36, 3);
      });
    door('door-fire', 0x5a1d12, 0xff6a2a);
    door('door-water', 0x12365a, 0x2a9aff);

    g.destroy();
    this.scene.start('Menu');
  }
}
