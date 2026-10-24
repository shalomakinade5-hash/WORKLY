import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Standard CRC32 implementation
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    scanlines[rowOffset] = 0; // filter byte: none
    const srcOffset = y * width * 4;
    rgbaBuffer.copy(scanlines, rowOffset + 1, srcOffset, srcOffset + width * 4);
  }

  const compressedData = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Brand Colors
// Navy: #202C39 -> (32, 44, 57)
// Soft White: #F7F7F4 -> (247, 247, 244)
// Steel Blue: #8293A5 -> (130, 147, 165)
// Amber: #D5A34B -> (213, 163, 75)

function renderWorklyIcon(size, isMaskable = false) {
  const buffer = Buffer.alloc(size * size * 4);

  // Default color: Navy full-bleed
  const navy = [32, 44, 57, 255];
  const softWhite = [247, 247, 244, 255];
  const amber = [213, 163, 75, 255];
  const steel = [130, 147, 165, 255];

  // Helper to set pixel with alpha blending
  function setPixel(x, y, r, g, b, a = 1) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (Math.floor(y) * size + Math.floor(x)) * 4;
    const currentA = buffer[idx + 3] / 255;
    const finalA = a + currentA * (1 - a);
    if (finalA > 0) {
      buffer[idx] = Math.round((r * a + buffer[idx] * currentA * (1 - a)) / finalA);
      buffer[idx + 1] = Math.round((g * a + buffer[idx + 1] * currentA * (1 - a)) / finalA);
      buffer[idx + 2] = Math.round((b * a + buffer[idx + 2] * currentA * (1 - a)) / finalA);
      buffer[idx + 3] = Math.round(finalA * 255);
    }
  }

  // Draw background
  const radius = isMaskable ? 0 : size * 0.22; // rounded squircle for non-maskable, full-bleed for maskable
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (radius > 0) {
        // Rounded corners
        let inside = true;
        let d = 0;
        if (x < radius && y < radius) d = Math.hypot(x - radius, y - radius);
        else if (x > size - 1 - radius && y < radius) d = Math.hypot(x - (size - 1 - radius), y - radius);
        else if (x < radius && y > size - 1 - radius) d = Math.hypot(x - radius, y - (size - 1 - radius));
        else if (x > size - 1 - radius && y > size - 1 - radius) d = Math.hypot(x - (size - 1 - radius), y - (size - 1 - radius));

        if (d > radius) {
          const edgeAlpha = Math.max(0, Math.min(1, radius + 1 - d));
          if (edgeAlpha > 0) {
            setPixel(x, y, navy[0], navy[1], navy[2], edgeAlpha);
          }
          continue;
        }
      }
      setPixel(x, y, navy[0], navy[1], navy[2], 1.0);
    }
  }

  // Safe zone scale: maskable has safe zone 15% inside
  const scale = isMaskable ? 0.72 : 0.88;
  const center = size / 2;

  // Draw stylized Workly "W" logo & amber focus dot
  // Logo points normalized in [0, 512]:
  // P1: (120, 170) -> P2: (185, 360) -> P3: (256, 230) -> P4: (327, 360) -> P5: (392, 170)
  // Amber dot: (256, 150), r: 28
  const basePoints = [
    [120, 170],
    [185, 360],
    [256, 230],
    [327, 360],
    [392, 170],
  ];

  const strokeWidth = (42 / 512) * size * scale;

  function transformPt(pt) {
    const nx = (pt[0] - 256) / 256;
    const ny = (pt[1] - 256) / 256;
    return [
      center + nx * (size / 2) * scale,
      center + ny * (size / 2) * scale,
    ];
  }

  const pts = basePoints.map(transformPt);

  // Line segment distance
  function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  // Draw segments
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let minDist = 999999;
      for (let i = 0; i < pts.length - 1; i++) {
        const d = distToSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (d < minDist) minDist = d;
      }

      if (minDist <= strokeWidth / 2 + 1) {
        const alpha = Math.max(0, Math.min(1, strokeWidth / 2 + 0.5 - minDist));
        if (alpha > 0) {
          setPixel(x, y, softWhite[0], softWhite[1], softWhite[2], alpha);
        }
      }
    }
  }

  // Draw Amber dot
  const dotCenter = transformPt([256, 150]);
  const dotRadius = (28 / 512) * size * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - dotCenter[0], y - dotCenter[1]);
      if (d <= dotRadius + 1) {
        const alpha = Math.max(0, Math.min(1, dotRadius + 0.5 - d));
        if (alpha > 0) {
          setPixel(x, y, amber[0], amber[1], amber[2], alpha);
        }
      }
    }
  }

  return encodePNG(size, size, buffer);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons...');

const icon192 = renderWorklyIcon(192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);
console.log('Created pwa-192x192.png');

const icon512 = renderWorklyIcon(512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);
console.log('Created pwa-512x512.png');

const iconMaskable512 = renderWorklyIcon(512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), iconMaskable512);
console.log('Created pwa-maskable-512x512.png');

const iconMaskable192 = renderWorklyIcon(192, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-192x192.png'), iconMaskable192);
console.log('Created pwa-maskable-192x192.png');

const appleTouchIcon = renderWorklyIcon(180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);
console.log('Created apple-touch-icon.png');

// Also create 64x64 favicon.png
const favicon64 = renderWorklyIcon(64, false);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon64);
console.log('Created favicon.ico');

console.log('All icons generated successfully!');
