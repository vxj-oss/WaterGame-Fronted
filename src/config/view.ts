import Phaser from 'phaser';

export const VIEW = { w: 960, h: 584, ox: 0, oy: 0, z: 1, cw: 960, ch: 584 };

const BASE_W = 960;
const BASE_H = 584;

export function computeView() {
  const aspect = Math.max(0.6, Math.min(2.6, window.innerWidth / Math.max(1, window.innerHeight)));
  let w = BASE_W;
  let h = BASE_H;
  if (aspect > BASE_W / BASE_H) w = Math.round(BASE_H * aspect);
  else h = Math.round(BASE_W / aspect);
  w = Math.min(w, 1560);
  h = Math.min(h, 1000);
  w = Math.round(w / 8) * 8;
  h = Math.round(h / 8) * 8;
  const dpr = window.devicePixelRatio || 1;
  const z = Math.min(2.5, Math.max(0.5, (window.innerHeight * dpr) / h));
  const cw = Math.round(w * z);
  const ch = Math.round(h * z);
  const changed = cw !== VIEW.cw || ch !== VIEW.ch || w !== VIEW.w || h !== VIEW.h;
  VIEW.w = w;
  VIEW.h = h;
  VIEW.ox = Math.round((w - BASE_W) / 2);
  VIEW.oy = Math.round((h - BASE_H) / 2);
  VIEW.z = z;
  VIEW.cw = cw;
  VIEW.ch = ch;
  return changed;
}

export function applyCamera(scene: Phaser.Scene, cx: number, cy: number) {
  const cam = scene.cameras.main;
  cam.setZoom(VIEW.z);
  cam.centerOn(cx, cy);
}
