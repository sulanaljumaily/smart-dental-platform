const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal pure-Node PNG decoder (supports 8-bit RGBA / RGB PNGs)
function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 8; // skip PNG signature
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const idatChunks = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  const compressed = Buffer.concat(idatChunks);
  const raw = zlib.inflateSync(compressed);
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 4;
  const stride = width * bpp;
  const pixels = new Uint8Array(width * height * 4);

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  const recon = new Uint8Array(height * stride);
  let inPos = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[inPos++];
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[inPos++];
      const a = x >= bpp ? recon[y * stride + x - bpp] : 0;
      const b = y > 0 ? recon[(y - 1) * stride + x] : 0;
      const c = y > 0 && x >= bpp ? recon[(y - 1) * stride + x - bpp] : 0;

      let val = rawByte;
      if (filter === 1) val = (rawByte + a) & 0xff;
      else if (filter === 2) val = (rawByte + b) & 0xff;
      else if (filter === 3) val = (rawByte + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) val = (rawByte + paeth(a, b, c)) & 0xff;

      recon[y * stride + x] = val;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = y * stride + x * bpp;
      const dstIdx = (y * width + x) * 4;
      pixels[dstIdx] = recon[srcIdx];
      pixels[dstIdx + 1] = recon[srcIdx + 1];
      pixels[dstIdx + 2] = recon[srcIdx + 2];
      pixels[dstIdx + 3] = bpp === 4 ? recon[srcIdx + 3] : 255;
    }
  }

  return { width, height, pixels };
}

// Writes a 24-bit uncompressed Windows BMP file
function writeBmp24(filePath, width, height, getPixelRGB) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  // BMP Header (14 bytes)
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);

  // DIB Header BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // positive = bottom-up
  buf.writeUInt16LE(1, 26); // planes
  buf.writeUInt16LE(24, 28); // 24-bit RGB
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38); // 72 DPI
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  // Write pixels bottom-up
  for (let y = 0; y < height; y++) {
    const bmpRow = height - 1 - y;
    const rowStart = 54 + bmpRow * rowSize;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixelRGB(x, y);
      const pxOffset = rowStart + x * 3;
      buf[pxOffset] = Math.max(0, Math.min(255, Math.round(b)));
      buf[pxOffset + 1] = Math.max(0, Math.min(255, Math.round(g)));
      buf[pxOffset + 2] = Math.max(0, Math.min(255, Math.round(r)));
    }
  }

  fs.writeFileSync(filePath, buf);
}

// 5x7 pixel bitmap font for clean crisp English banner text ("DENTAL PLATFORM" / "PRO DESKTOP")
const FONT_5X7 = {
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
};

function isTextPixel(text, x, y, startX, startY, scale = 2, spacing = 1) {
  const charW = 5 * scale;
  const charH = 7 * scale;
  const stepX = (5 + spacing) * scale;
  if (y < startY || y >= startY + charH) return false;
  const relX = x - startX;
  if (relX < 0) return false;
  const charIdx = Math.floor(relX / stepX);
  if (charIdx < 0 || charIdx >= text.length) return false;
  const inCharX = relX % stepX;
  if (inCharX >= charW) return false;
  const glyph = FONT_5X7[text[charIdx]];
  if (!glyph) return false;
  const gx = Math.floor(inCharX / scale);
  const gy = Math.floor((y - startY) / scale);
  return glyph[gy] && glyph[gy][gx] === '1';
}

function measureTextWidth(text, scale = 2, spacing = 1) {
  return text.length * (5 + spacing) * scale - spacing * scale;
}

const projectRoot = path.resolve(__dirname, '..');
const iconsDir = path.join(projectRoot, 'src-tauri', 'icons');
const logo96Path = path.join(projectRoot, 'public', 'icons', 'icon-96x96.png');
const logo48Path = path.join(projectRoot, 'public', 'icons', 'icon-48x48.png');

const logo96 = decodePng(logo96Path);
const logo48 = decodePng(logo48Path);

// Helper to sample RGBA from decoded PNG and blend onto background [r, g, b]
function blendLogo(logo, x, y, destX, destY, bgRGB) {
  const lx = x - destX;
  const ly = y - destY;
  if (lx < 0 || ly < 0 || lx >= logo.width || ly >= logo.height) return bgRGB;
  const idx = (ly * logo.width + lx) * 4;
  const alpha = logo.pixels[idx + 3] / 255;
  if (alpha <= 0) return bgRGB;
  return [
    logo.pixels[idx] * alpha + bgRGB[0] * (1 - alpha),
    logo.pixels[idx + 1] * alpha + bgRGB[1] * (1 - alpha),
    logo.pixels[idx + 2] * alpha + bgRGB[2] * (1 - alpha),
  ];
}

// Render the luxury 164px wide sidebar panel at (x, y) given height H
function getSidebarPixel(x, y, H) {
  const t = y / H;
  // Deep navy (#04142C) to royal medical blue (#0D47A1 -> #0284C7) gradient
  let r = 4 + t * 14;
  let g = 20 + t * 58;
  let b = 44 + t * 98;

  // Soft glowing circular halo behind the logo at (82, 82)
  const dxHalo = x - 82;
  const dyHalo = y - 82;
  const distHalo = Math.sqrt(dxHalo * dxHalo + dyHalo * dyHalo);
  if (distHalo < 68) {
    const glow = Math.pow(1 - distHalo / 68, 2) * 0.35;
    r += 35 * glow;
    g += 130 * glow;
    b += 220 * glow;
  }

  // Decorative subtle geometric arcs at bottom of sidebar
  const dxArc = x - 20;
  const dyArc = y - (H - 30);
  const distArc = Math.sqrt(dxArc * dxArc + dyArc * dyArc);
  if (Math.abs(distArc - 90) < 1.8 || Math.abs(distArc - 115) < 1.2) {
    r += 25;
    g += 65;
    b += 110;
  }

  // White rounded card frame behind the 96x96 logo
  const logoX = Math.floor((164 - logo96.width) / 2);
  const logoY = 34;
  let rgb = blendLogo(logo96, x, y, logoX, logoY, [r, g, b]);

  // "DENTAL" and "PLATFORM" crisp titles below the logo
  const line1 = 'DENTAL';
  const line1W = measureTextWidth(line1, 2, 2);
  const line1X = Math.floor((164 - line1W) / 2);
  if (isTextPixel(line1, x, y, line1X, 148, 2, 2)) {
    return [255, 255, 255];
  }

  const line2 = 'PLATFORM';
  const line2W = measureTextWidth(line2, 2, 1);
  const line2X = Math.floor((164 - line2W) / 2);
  if (isTextPixel(line2, x, y, line2X, 170, 2, 1)) {
    return [56, 189, 248]; // Cyan-blue highlight (#38bdf8)
  }

  // Subtle horizontal divider pill at y = 196..198
  if (y >= 196 && y <= 197 && x >= 52 && x <= 112) {
    return [56, 189, 248];
  }

  // Feature badges ("CLINIC SYSTEM")
  const line3 = 'CLINIC SYSTEM';
  const line3W = measureTextWidth(line3, 1, 2);
  const line3X = Math.floor((164 - line3W) / 2);
  if (isTextPixel(line3, x, y, line3X, 212, 1, 2)) {
    return [203, 213, 225];
  }

  // Right border accent line (x = 162..163)
  if (x >= 162 && x < 164) {
    return [14, 165, 233];
  }

  return rgb;
}

// 1. Generate NSIS Sidebar: 164 x 314
writeBmp24(path.join(iconsDir, 'nsis-sidebar.bmp'), 164, 314, (x, y) => {
  return getSidebarPixel(x, y, 314);
});

// 2. Generate WiX Dialog Image: 493 x 312 (left 164px sidebar + right 329px white dialog area)
writeBmp24(path.join(iconsDir, 'wix-dialog.bmp'), 493, 312, (x, y) => {
  if (x < 164) {
    return getSidebarPixel(x, y, 312);
  }
  return [255, 255, 255];
});

// 3. Generate WiX Top Banner: 493 x 58 (white header with bottom blue accent line & Dental Platform 48x48 icon on the right)
writeBmp24(path.join(iconsDir, 'wix-banner.bmp'), 493, 58, (x, y) => {
  if (y >= 56) {
    return [13, 138, 188]; // #0D8ABC bottom accent border
  }
  const bg = [255, 255, 255];
  const logoX = 493 - logo48.width - 14;
  const logoY = Math.floor((56 - logo48.height) / 2);
  return blendLogo(logo48, x, y, logoX, logoY, bg);
});

// 4. Generate NSIS Top Header: 150 x 57
writeBmp24(path.join(iconsDir, 'nsis-header.bmp'), 150, 57, (x, y) => {
  if (y >= 55) {
    return [13, 138, 188];
  }
  const bg = [255, 255, 255];
  const logoX = 150 - logo48.width - 8;
  const logoY = Math.floor((55 - logo48.height) / 2);
  return blendLogo(logo48, x, y, logoX, logoY, bg);
});

console.log('[generate-installer-assets] Successfully generated nsis-sidebar.bmp, wix-dialog.bmp, wix-banner.bmp, and nsis-header.bmp!');
