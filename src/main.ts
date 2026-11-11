import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { LevelScene } from './scenes/LevelScene';
import { setupTouchControls } from './touch';
import { autoFullscreenOnTouch } from './fullscreen';
import { computeView, VIEW } from './view';
import { setQuality } from './gfx';
import { app } from './app';
import { initSwitcher } from './switcher';
import { initCall } from './call';

setupTouchControls();
autoFullscreenOnTouch();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}

const fontsReady = Promise.race([
  Promise.all([document.fonts.load('400 40px "Lilita One"'), document.fonts.load('800 18px Nunito'), document.fonts.load('700 18px Nunito')]),
  new Promise((resolve) => setTimeout(resolve, 2500)),
]).catch(() => undefined);

void fontsReady.then(() => {
  computeView();
  setQuality(VIEW.z);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: VIEW.cw,
    height: VIEW.ch,
    backgroundColor: '#0b1b24',
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 900 }, debug: false, fps: 120, overlapBias: 8 } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, LevelSelectScene, LevelScene],
  });

  app.game = game;
  initSwitcher();
  initCall();

  let timer: number | undefined;
  window.addEventListener('resize', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!computeView()) return;
      game.scale.setGameSize(VIEW.cw, VIEW.ch);
      for (const key of ['Menu', 'LevelSelect']) {
        const scene = game.scene.getScene(key);
        if (game.scene.isActive(key)) scene.scene.restart();
      }
    }, 350);
  });

  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
});
