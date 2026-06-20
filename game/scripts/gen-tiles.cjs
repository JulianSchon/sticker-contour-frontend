// Generates the metallic platform tiles (public/sprites/ground-0..N.png) by
// rendering a brushed-metal panel (SVG via resvg) and compositing the real
// sticker designs from art-src/stickers onto it (white bg flood-filled away).
const { Resvg } = require("@resvg/resvg-js");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const OUT = "public/sprites";
const STK_DIR = "art-src/stickers";
const TILE = 64;
const VARIANTS = 8;

function rivet(x, y) {
  return `<circle cx="${x}" cy="${y}" r="3.2" fill="#6B7079" stroke="#4A4E55" stroke-width="1"/>
          <circle cx="${x - 1}" cy="${y - 1}" r="1" fill="#CACDD3"/>`;
}
function metalSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#BCC0C8"/><stop offset="0.5" stop-color="#9AA0AA"/><stop offset="1" stop-color="#7C828C"/>
    </linearGradient></defs>
    <rect x="0" y="0" width="64" height="64" fill="url(#m)"/>
    <g opacity="0.12" stroke="#2b2e33" stroke-width="1">
      <line x1="14" y1="2" x2="14" y2="62"/><line x1="30" y1="2" x2="30" y2="62"/><line x1="46" y1="2" x2="46" y2="62"/>
    </g>
    <line x1="0" y1="1.5" x2="64" y2="1.5" stroke="#D8DCE2" stroke-width="2.5"/>
    <line x1="1.5" y1="0" x2="1.5" y2="64" stroke="#D2D6DD" stroke-width="2"/>
    <line x1="0" y1="62.5" x2="64" y2="62.5" stroke="#5C616A" stroke-width="2.5"/>
    <line x1="62.5" y1="0" x2="62.5" y2="64" stroke="#5C616A" stroke-width="2"/>
    ${rivet(8, 9)}${rivet(56, 9)}${rivet(8, 56)}${rivet(56, 56)}
  </svg>`;
}

// flood-fill the opaque near-white background to transparent from the borders
async function keyOut(pngBuf) {
  const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const isWhite = (p) => data[p * 4] > 236 && data[p * 4 + 1] > 236 && data[p * 4 + 2] > 236;
  const visited = new Uint8Array(width * height);
  const stack = [];
  const seed = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    visited[p] = 1;
    if (isWhite(p)) stack.push(p);
  };
  for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
  for (let y = 0; y < height; y++) { seed(0, y); seed(width - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    data[p * 4 + 3] = 0;
    const x = p % width, y = (p / width) | 0;
    seed(x + 1, y); seed(x - 1, y); seed(x, y + 1); seed(x, y - 1);
  }
  return sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }).png().toBuffer();
}

const rnd = (a, b) => a + Math.random() * (b - a);

(async () => {
  const metal = new Resvg(metalSVG(), { fitTo: { mode: "width", value: TILE } }).render().asPng();

  // prepare transparent, trimmed stickers
  const files = fs.readdirSync(STK_DIR).filter((f) => f.endsWith(".png"));
  const stickers = [];
  for (const f of files) {
    const keyed = await keyOut(fs.readFileSync(path.join(STK_DIR, f)));
    stickers.push(await sharp(keyed).trim().toBuffer());
  }
  console.log(`loaded ${stickers.length} stickers`);

  for (let i = 0; i < VARIANTS; i++) {
    const n = 3 + Math.floor(Math.random() * 2); // 3-4 stickers per tile
    const composites = [];
    for (let j = 0; j < n; j++) {
      const src = stickers[Math.floor(Math.random() * stickers.length)];
      const size = Math.round(rnd(16, 26));
      const deg = Math.round(rnd(-22, 22));
      const sbuf = await sharp(src)
        .resize(size, size, { fit: "inside" })
        .rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      const m = await sharp(sbuf).metadata();
      const w = Math.min(m.width, TILE);
      const h = Math.min(m.height, TILE);
      const left = Math.round(rnd(0, TILE - w));
      const top = Math.round(rnd(0, TILE - h));
      composites.push({ input: sbuf, left, top });
    }
    const out = await sharp(metal).composite(composites).png().toBuffer();
    fs.writeFileSync(path.join(OUT, `ground-${i}.png`), out);
  }
  console.log(`wrote ${VARIANTS} ground tiles`);
})();
