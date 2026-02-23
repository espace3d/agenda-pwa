import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { deflateSync } from 'zlib';

function createPNG(size) {
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      pixels[i] = 0x1a;
      pixels[i + 1] = 0x1a;
      pixels[i + 2] = 0x1a;
      pixels[i + 3] = 255;
    }
  }

  const cx = size / 2, cy = size / 2;
  const scale = size / 512;

  function setPixel(x, y, r, g, b) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = 255;
  }

  function fillCircle(centerX, centerY, radius, r, g, b) {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= r2) {
          setPixel(centerX + dx, centerY + dy, r, g, b);
        }
      }
    }
  }

  function drawThickLine(x1, y1, x2, y2, thickness, r, g, b) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(len * 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t, py = y1 + dy * t;
      fillCircle(px, py, thickness / 2, r, g, b);
    }
  }

  const lw = 10 * scale;

  drawThickLine(cx - 80 * scale, cy - 140 * scale, cx + 80 * scale, cy - 140 * scale, lw, 255, 255, 255);
  drawThickLine(cx - 80 * scale, cy + 140 * scale, cx + 80 * scale, cy + 140 * scale, lw, 255, 255, 255);

  drawThickLine(cx - 70 * scale, cy - 130 * scale, cx - 70 * scale, cy - 100 * scale, lw, 255, 255, 255);
  drawThickLine(cx + 70 * scale, cy - 130 * scale, cx + 70 * scale, cy - 100 * scale, lw, 255, 255, 255);

  for (let t = 0; t <= 1; t += 0.01) {
    const lx = cx - 70 * scale + t * 70 * scale;
    const ly = cy - 100 * scale + t * 100 * scale;
    const rx = cx + 70 * scale - t * 70 * scale;
    const ry = cy - 100 * scale + t * 100 * scale;
    drawThickLine(lx, ly, lx, ly, lw, 255, 255, 255);
    drawThickLine(rx, ry, rx, ry, lw, 255, 255, 255);
  }

  drawThickLine(cx - 70 * scale, cy + 130 * scale, cx - 70 * scale, cy + 100 * scale, lw, 255, 255, 255);
  drawThickLine(cx + 70 * scale, cy + 130 * scale, cx + 70 * scale, cy + 100 * scale, lw, 255, 255, 255);

  for (let t = 0; t <= 1; t += 0.01) {
    const lx = cx - 70 * scale + t * 70 * scale;
    const ly = cy + 100 * scale - t * 100 * scale;
    const rx = cx + 70 * scale - t * 70 * scale;
    const ry = cy + 100 * scale - t * 100 * scale;
    drawThickLine(lx, ly, lx, ly, lw, 255, 255, 255);
    drawThickLine(rx, ry, rx, ry, lw, 255, 255, 255);
  }

  fillCircle(cx, cy + 80 * scale, 6 * scale, 255, 255, 255);
  fillCircle(cx - 15 * scale, cy + 95 * scale, 5 * scale, 255, 255, 255);
  fillCircle(cx + 15 * scale, cy + 95 * scale, 5 * scale, 255, 255, 255);

  const rawData = new Uint8Array(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rawData[y * (size * 4 + 1)] = 0;
    rawData.set(pixels.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1);
  }

  const compressed = deflateSync(Buffer.from(rawData), { level: 6 });

  const chunks = [];

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  chunks.push(sig);

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function writeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    chunks.push(len, typeAndData, crc);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
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
