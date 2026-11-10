import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { LevelScene } from './scenes/LevelScene';
import { setupTouchControls } from './touch';
import { autoFullscreenOnTouch } from './fullscreen';
import { COLS, ROWS, TILE, TOP } from './config';

setupTouchControls();
autoFullscreenOnTouch();

// App instalable (pantalla completa en el celular). Solo en producción.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}

// Espera a que carguen las tipografías (Inter y JetBrains Mono) para que el texto del lienzo salga bien.
const fontsReady = Promise.race([
  Promise.all([document.fonts.load('400 40px Inter'), document.fonts.load('400 13px "JetBrains Mono"')]),
  new Promise((resolve) => setTimeout(resolve, 2500)),
]).catch(() => undefined);

void fontsReady.then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: COLS * TILE,
    height: ROWS * TILE + TOP,
    backgroundColor: '#000000',
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 900 }, debug: false } },
    // El fondo es negro y el lienzo se ajusta a toda la pantalla: las franjas sobrantes se funden con el vacío.
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, LevelSelectScene, LevelScene],
  });

  // Solo en desarrollo: permite inspeccionar el juego desde la consola del navegador.
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
});
