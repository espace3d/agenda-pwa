import { createWriteStream, mkdirSync, existsSync, writeFileSync } from 'fs';
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
  fillRoundedRect(0, 0, s, s, 108*sc, 0x13, 0x13, 0x16);

  // Calendar body outline (white outer, dark inner cutout)
  fillRoundedRect(110*sc, 150*sc, 292*sc, 264*sc, 34*sc, 255, 255, 255);
  fillRoundedRect(130*sc, 170*sc, 252*sc, 224*sc, 14*sc, 0x13, 0x13, 0x16);

  // Header separator line
  fillRect(110*sc, 222*sc, 292*sc, 20*sc, 255, 255, 255);

  // Left ring
  fillRoundedRect(190*sc, 106*sc, 20*sc, 88*sc, 10*sc, 255, 255, 255);
  // Right ring
  fillRoundedRect(302*sc, 106*sc, 20*sc, 88*sc, 10*sc, 255, 255, 255);

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

function createAlarmWav() {
  const sampleRate = 44100;
  const duration = 3;
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const beepLen = 0.3;
  const silenceLen = 0.15;
  const freq = 880;
  const amp = 28000;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const cycle = beepLen + silenceLen;
    const inCycle = t % cycle;
    let sample = 0;

    if (inCycle < beepLen) {
      const env = Math.min(1, inCycle / 0.01) * Math.min(1, (beepLen - inCycle) / 0.01);
      sample = Math.sin(2 * Math.PI * freq * t) * amp * env;
    }

    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample))), 44 + i * 2);
  }

  return buffer;
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

const alarm = createAlarmWav();
writeFileSync('public/alarm.wav', alarm);
console.log(`Generated public/alarm.wav (${alarm.length} bytes)`);
