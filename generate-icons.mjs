import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { deflateSync } from 'zlib';

function createPNG(size) {
  const pixels = new Uint8Array(size * size * 4);
  const s = size;

  function setPixel(x, y, r, g, b, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= s || y < 0 || y >= s) return;
    const i = (y * s + x) * 4;
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
  }

  function fillRect(x1, y1, w, h, r, g, b) {
    for (let y = Math.round(y1); y < Math.round(y1 + h); y++)
      for (let x = Math.round(x1); x < Math.round(x1 + w); x++)
        setPixel(x, y, r, g, b);
  }

  function fillRoundedRect(x1, y1, w, h, rad, r, g, b) {
    for (let y = Math.round(y1); y < Math.round(y1 + h); y++) {
      for (let x = Math.round(x1); x < Math.round(x1 + w); x++) {
        const lx = x - x1, ly = y - y1;
        let inside = true;
        if (lx < rad && ly < rad) inside = ((lx-rad)**2 + (ly-rad)**2) <= rad*rad;
        else if (lx > w-rad && ly < rad) inside = ((lx-(w-rad))**2 + (ly-rad)**2) <= rad*rad;
        else if (lx < rad && ly > h-rad) inside = ((lx-rad)**2 + (ly-(h-rad))**2) <= rad*rad;
        else if (lx > w-rad && ly > h-rad) inside = ((lx-(w-rad))**2 + (ly-(h-rad))**2) <= rad*rad;
        if (inside) setPixel(x, y, r, g, b);
      }
    }
  }

  const sc = s / 512;

  // Background
  fillRoundedRect(0, 0, s, s, 80*sc, 0x1a, 0x1a, 0x1a);

  // Calendar body outline
  fillRoundedRect(86*sc, 130*sc, 340*sc, 300*sc, 28*sc, 255, 255, 255);
  fillRoundedRect(108*sc, 230*sc, 296*sc, 180*sc, 12*sc, 0x1a, 0x1a, 0x1a);

  // Calendar header (white bar)
  fillRoundedRect(86*sc, 130*sc, 340*sc, 90*sc, 28*sc, 255, 255, 255);

  // Rings
  fillRoundedRect(170*sc, 100*sc, 24*sc, 70*sc, 12*sc, 255, 255, 255);
  fillRoundedRect(318*sc, 100*sc, 24*sc, 70*sc, 12*sc, 255, 255, 255);

  // Day number "23" - draw with simple pixel font
  const num = "23";
  const digitWidth = 52 * sc;
  const digitHeight = 90 * sc;
  const startX = s/2 - (num.length * digitWidth + 10*sc) / 2;
  const startY = 260 * sc;

  function drawDigit(digit, ox, oy, w, h, t) {
    // 7-segment style
    const segs = {
      '0': [1,1,1,0,1,1,1], '1': [0,0,1,0,0,1,0], '2': [1,0,1,1,1,0,1],
      '3': [1,0,1,1,0,1,1], '4': [0,1,1,1,0,1,0], '5': [1,1,0,1,0,1,1],
      '6': [1,1,0,1,1,1,1], '7': [1,0,1,0,0,1,0], '8': [1,1,1,1,1,1,1],
      '9': [1,1,1,1,0,1,1]
    };
    const s = segs[digit] || segs['0'];
    // top, top-left, top-right, middle, bottom-left, bottom-right, bottom
    if (s[0]) fillRect(ox+t, oy, w-2*t, t, 255,255,255);
    if (s[1]) fillRect(ox, oy+t, t, h/2-t, 255,255,255);
    if (s[2]) fillRect(ox+w-t, oy+t, t, h/2-t, 255,255,255);
    if (s[3]) fillRect(ox+t, oy+h/2-t/2, w-2*t, t, 255,255,255);
    if (s[4]) fillRect(ox, oy+h/2+t/2, t, h/2-t, 255,255,255);
    if (s[5]) fillRect(ox+w-t, oy+h/2+t/2, t, h/2-t, 255,255,255);
    if (s[6]) fillRect(ox+t, oy+h-t, w-2*t, t, 255,255,255);
  }

  const thick = Math.max(8 * sc, 3);
  for (let i = 0; i < num.length; i++) {
    drawDigit(num[i], startX + i * (digitWidth + 10*sc), startY, digitWidth, digitHeight, thick);
  }

  // Encode PNG
  const rawData = new Uint8Array(s * (s * 4 + 1));
  for (let y = 0; y < s; y++) {
    rawData[y * (s * 4 + 1)] = 0;
    rawData.set(pixels.subarray(y * s * 4, (y + 1) * s * 4), y * (s * 4 + 1) + 1);
  }

  const compressed = deflateSync(Buffer.from(rawData), { level: 6 });
  const chunks = [];
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  chunks.push(sig);

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function writeChunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    chunks.push(len, td, crc);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(s, 0); ihdr.writeUInt32BE(s, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  writeChunk('IHDR', ihdr);
  writeChunk('IDAT', compressed);
  writeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat(chunks);
}

const dir = 'public/icons';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

for (const size of [192, 512]) {
  const png = createPNG(size);
  const path = `${dir}/icon-${size}.png`;
  const ws = createWriteStream(path);
  ws.write(png);
  ws.end();
  console.log(`Generated ${path} (${png.length} bytes)`);
}
