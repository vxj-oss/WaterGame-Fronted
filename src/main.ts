import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { LevelScene } from './scenes/LevelScene';
import { setupTouchControls } from './utils/touch';
import { autoFullscreenOnTouch } from './utils/fullscreen';
import { computeView, VIEW } from './config/view';
import { setQuality } from './utils/gfx';
import { app } from './services/app';
import { initSwitcher } from './services/switcher';
import { initCall } from './components/call';

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
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 900 }, debug: false, overlapBias: 8 } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, LevelSelectScene, LevelScene],
  });

  app.game = game;
  const calm = () => {
    if (document.getElementById('games') || document.getElementById('ui')?.style.display === 'flex') window.setTimeout(() => game.loop.sleep(), 0);
  };
  game.events.on(Phaser.Core.Events.VISIBLE, calm);
  game.events.on(Phaser.Core.Events.FOCUS, calm);
  initSwitcher();
  initCall();

  let timer: number | undefined;
  const sync = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (computeView()) {
        game.scale.setGameSize(VIEW.cw, VIEW.ch);
        for (const key of ['Menu', 'LevelSelect']) {
          const scene = game.scene.getScene(key);
          if (game.scene.isActive(key)) scene.scene.restart();
        }
      }
      game.scale.refresh();
    }, 250);
  };
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  document.addEventListener('fullscreenchange', sync);
  window.visualViewport?.addEventListener('resize', sync);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sync();
  });

  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
});
