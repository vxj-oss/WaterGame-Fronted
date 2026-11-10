// Genera los iconos de la app (PNG) sin dependencias: rombo blanco sobre vacío negro.
// Uso: node tools/make-icons.mjs
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

function png(size, draw) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = draw(x / size, y / size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// Dos rombos: uno rojo y uno azul, como los dos personajes, sobre negro.
const draw = (u, v) => {
  const d = (cx, cy) => Math.abs(u - cx) + Math.abs(v - cy);
  if (d(0.37, 0.5) < 0.2) return [255, 74, 28];
  if (d(0.63, 0.5) < 0.2) return [47, 168, 255];
  return [0, 0, 0];
};

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', png(192, draw));
writeFileSync('public/icon-512.png', png(512, draw));
console.log('Iconos creados en public/');
