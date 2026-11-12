import Phaser from 'phaser';
import { glowTexture, grad, makeCanvas, rr } from '../utils/gfx';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    glowTexture(this);
    const tex = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => makeCanvas(this, key, w, h, draw, false);

    tex('wall', 32, 32, (ctx) => {
      ctx.fillStyle = '#143240';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = grad(ctx, 0, 0, 0, 32, [[0, '#2c6580'], [1, '#1f4a5e']]);
      ctx.fillRect(1, 1, 30, 29);
      ctx.fillStyle = '#58b4cf';
      ctx.fillRect(1, 1, 30, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(1, 16, 30, 1);
      ctx.fillRect(16, 17, 1, 13);
      ctx.fillRect(8, 4, 1, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(1, 4, 30, 1);
    });

    tex('box', 32, 32, (ctx) => {
      rr(ctx, 0, 0, 32, 32, 5);
      ctx.fillStyle = '#7a4a1f';
      ctx.fill();
      rr(ctx, 2, 2, 28, 28, 4);
      ctx.fillStyle = grad(ctx, 0, 0, 0, 32, [[0, '#e8b36c'], [1, '#c98a4b']]);
      ctx.fill();
      ctx.strokeStyle = '#9a622b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(5, 5);
      ctx.lineTo(27, 27);
      ctx.moveTo(27, 5);
      ctx.lineTo(5, 27);
      ctx.stroke();
      ctx.fillStyle = '#7a4a1f';
      [[5, 5], [27, 5], [5, 27], [27, 27]].forEach(([x, y]) => ctx.fillRect(x - 1, y - 1, 3, 3));
    });

    tex('spark', 6, 6, (ctx) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(3, 3, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    const eyes = (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(8.5, 19, 3.8, 4.4, 0, 0, Math.PI * 2);
      ctx.ellipse(15.5, 19, 3.8, 4.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1020';
      ctx.beginPath();
      ctx.arc(9.4, 19.6, 2, 0, Math.PI * 2);
      ctx.arc(16.4, 19.6, 2, 0, Math.PI * 2);
      ctx.fill();
    };

    tex('fire', 24, 30, (ctx) => {
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.bezierCurveTo(14, 7, 23, 10, 23, 19);
      ctx.bezierCurveTo(23, 26, 18, 30, 12, 30);
      ctx.bezierCurveTo(6, 30, 1, 26, 1, 19);
      ctx.bezierCurveTo(1, 12, 7, 9, 9, 4);
      ctx.bezierCurveTo(10, 6, 11, 5, 12, 0);
      ctx.fillStyle = grad(ctx, 0, 0, 0, 30, [[0, '#ffd86b'], [0.45, '#ff8a3d'], [1, '#ff3d55']]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath();
      ctx.ellipse(7, 14, 2, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx);
    });

    tex('water', 24, 30, (ctx) => {
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.bezierCurveTo(13, 6, 23, 13, 23, 20);
      ctx.bezierCurveTo(23, 26.5, 18, 30, 12, 30);
      ctx.bezierCurveTo(6, 30, 1, 26.5, 1, 20);
      ctx.bezierCurveTo(1, 13, 11, 6, 12, 0);
      ctx.fillStyle = grad(ctx, 0, 0, 0, 30, [[0, '#c4f8ff'], [0.45, '#3ccaff'], [1, '#2f7bff']]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath();
      ctx.ellipse(7, 15, 2, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx);
    });

    const gem = (key: string, a: string, b: string) =>
      tex(key, 18, 18, (ctx) => {
        ctx.beginPath();
        ctx.moveTo(9, 0.5);
        ctx.lineTo(17.5, 7);
        ctx.lineTo(9, 17.5);
        ctx.lineTo(0.5, 7);
        ctx.closePath();
        ctx.fillStyle = grad(ctx, 0, 0, 0, 18, [[0, a], [1, b]]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(9, 1.5);
        ctx.lineTo(13, 7);
        ctx.lineTo(5, 7);
        ctx.closePath();
        ctx.fill();
      });
    gem('gem-red', '#ff9aa8', '#e0204a');
    gem('gem-blue', '#9cecff', '#1f86ff');

    const puddle = (key: string, a: string, b: string) =>
      tex(key, 32, 12, (ctx) => {
        ctx.fillStyle = grad(ctx, 0, 0, 0, 12, [[0, a], [1, b]]);
        ctx.fillRect(0, 0, 32, 12);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(0, 0, 32, 2);
      });
    puddle('lava', '#ffd25e', '#ff4a1a');
    puddle('pool', '#b4ecff', '#2f86ff');
    puddle('goo', '#cdf393', '#3ea437');

    const door = (key: string, a: string, b: string, frame: string) =>
      tex(key, 28, 40, (ctx) => {
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(0, 14);
        ctx.arc(14, 14, 14, Math.PI, 0);
        ctx.lineTo(28, 40);
        ctx.closePath();
        ctx.fillStyle = frame;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, 40);
        ctx.lineTo(4, 15);
        ctx.arc(14, 15, 10, Math.PI, 0);
        ctx.lineTo(24, 40);
        ctx.closePath();
        ctx.fillStyle = grad(ctx, 0, 0, 0, 40, [[0, a], [1, b]]);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(19, 27, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    door('door-fire', '#ffd15e', '#ff4d2d', '#6a2414');
    door('door-water', '#a4f1ff', '#2f7bff', '#14396a');

    this.scene.start('Menu');
  }
}
