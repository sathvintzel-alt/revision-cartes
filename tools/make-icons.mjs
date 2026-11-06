// Génère les icônes PNG (carte blanche sur fond bleu) sans dépendance. Usage : node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const t = Buffer.from(type); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); };

function png(size) {
  const bg = [0x3b, 0x5b, 0xdb], fg = [255, 255, 255], acc = [0xe8, 0x59, 0x0c];
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cw = size * 0.56, ch = size * 0.42, cx = size / 2, cy = size / 2, rad = size * 0.06;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let px = bg;
      const dx = Math.abs(x - cx) - (cw / 2 - rad), dy = Math.abs(y - cy) - (ch / 2 - rad);
      const inCard = dx <= 0 && dy <= 0 || (dx > 0 && dy > 0 ? dx * dx + dy * dy <= rad * rad : (dx <= rad && dy <= 0) || (dy <= rad && dx <= 0));
      if (inCard) px = fg;
      if (inCard && Math.hypot(x - (cx + cw * 0.12), y - cy) < size * 0.07) px = acc;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = px[0]; raw[o + 1] = px[1]; raw[o + 2] = px[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('icons', { recursive: true });
for (const s of [180, 192, 512]) writeFileSync(`icons/icon-${s}.png`, png(s));
console.log('icônes générées');
