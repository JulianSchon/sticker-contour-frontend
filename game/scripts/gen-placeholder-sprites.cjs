// Generates placeholder Stickan sprite PNGs into public/sprites.
// Replace these files with real art later (same filenames).
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const W = 220, H = 220;

const T = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function makePixels() {
  const px = Buffer.alloc(W * H * 4, 0); // transparent RGBA
  const cx = W / 2, cy = H / 2, R = 95, ring = 8;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - cx, y - cy);
    const i = (y * W + x) * 4;
    if (d <= R) {
      px[i] = 0xf5; px[i + 1] = 0xec; px[i + 2] = 0xd2; px[i + 3] = 255; // cream body
      if (d > R - ring) { px[i] = 0x11; px[i + 1] = 0x11; px[i + 2] = 0x11; } // black ring
      if (y > cy - 18 && y < cy + 6 && x > cx - 55 && x < cx + 55) { // sunglasses bar
        px[i] = 0x11; px[i + 1] = 0x11; px[i + 2] = 0x11; px[i + 3] = 255;
      }
    }
  }
  return px;
}
function encodePNG(px) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (W * 4 + 1));
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const force = process.argv.includes("--force");
const dir = path.join("public", "sprites");
fs.mkdirSync(dir, { recursive: true });
const png = encodePNG(makePixels());
for (const n of ["stickan-wave", "stickan-run", "stickan-jump", "stickan-think"]) {
  const file = path.join(dir, n + ".png");
  if (fs.existsSync(file) && !force) {
    console.log("skip (exists): " + file + "  (use --force to overwrite)");
    continue;
  }
  fs.writeFileSync(file, png);
  console.log("wrote " + file);
}
