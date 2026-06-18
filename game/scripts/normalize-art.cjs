// Normalizes hand-drawn Stickan/enemy sprite strips (in public/sprites/incoming)
// into tidy per-character animation sheets in public/sprites:
//  - splits each strip into equal frames
//  - trims transparent margins per frame
//  - scales ALL of a character's frames by ONE factor (so the character keeps a
//    consistent size across idle/run/jump/etc.)
//  - composites each frame bottom-centered onto a uniform cell (feet on a common
//    baseline), then packs frames into a grid sheet
// Emits art-manifest.json with sliceX/sliceY + per-anim frame ranges.
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const IN = "art-src";
const OUT = "public/sprites";
const SLICE_X = 6; // frames per row in the packed sheet

// character -> { targetRun, anims:[{name,file,frames}] }  (order defines frame indices)
// targetRun = desired head/body width in px (longest solid horizontal pixel run),
// used to normalize each frame so the body is a consistent size across poses.
const CHARS = {
  stickan: {
    targetRun: 150,
    anims: [
      { name: "idle", file: "stickan-idle.png", frames: 3 },
      { name: "run", file: "stickan-run.png", frames: 6 },
      { name: "jump", file: "stickan-jump.png", frames: 2 },
      { name: "throw", file: "stickan-throw.png", frames: 3, flip: true }, // drawn throwing right; flip to match left-facing run/idle
      { name: "hurt", file: "stickan-hurt.png", frames: 1 },
    ],
  },
  janitor: {
    targetRun: 150,
    anims: [
      { name: "idle", file: "janitor-idle.png", frames: 3 },
      { name: "run", file: "janitor-run.png", frames: 6 },
    ],
  },
  granny: {
    targetRun: 150,
    anims: [
      { name: "idle", file: "granny-idle.png", frames: 3 },
      { name: "run", file: "granny-run.png", frames: 6 },
    ],
  },
  boss: {
    targetRun: 260,
    anims: [
      { name: "idle", file: "boss-idle.png", frames: 3 },
      { name: "charge", file: "boss-charge.png", frames: 6 },
    ],
  },
};

// Remove an opaque (near-)white background by flooding transparency in from the
// image borders. Interior whites sealed inside the black outline (e.g. gloves)
// are NOT border-connected, so they're preserved.
async function keyOutWhiteBg(pngBuf) {
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
    const x = p % width;
    const y = (p / width) | 0;
    seed(x + 1, y); seed(x - 1, y); seed(x, y + 1); seed(x, y - 1);
  }
  return sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// Split a strip into frames by detecting blank (near-white/transparent) column
// gaps between characters — robust to however many frames the file actually has.
async function splitTrim(anim) {
  const buf = fs.readFileSync(path.join(IN, anim.file));
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const colHasContent = new Array(width).fill(false);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      // a content pixel = opaque and not near-white
      if (data[i + 3] > 40 && (data[i] <= 235 || data[i + 1] <= 235 || data[i + 2] <= 235)) {
        colHasContent[x] = true;
        break;
      }
    }
  }
  const runs = [];
  let start = -1;
  for (let x = 0; x < width; x++) {
    if (colHasContent[x]) {
      if (start < 0) start = x;
    } else if (start >= 0) {
      runs.push([start, x - 1]);
      start = -1;
    }
  }
  if (start >= 0) runs.push([start, width - 1]);
  const frames = runs.filter((r) => r[1] - r[0] >= 25); // drop noise specks

  const out = [];
  for (const [x0, x1] of frames) {
    const region = await sharp(buf)
      .extract({ left: x0, top: 0, width: x1 - x0 + 1, height })
      .png()
      .toBuffer();
    const keyed = await keyOutWhiteBg(region);
    const t = await sharp(keyed).trim().toBuffer({ resolveWithObject: true });
    out.push({ data: t.data, w: t.info.width, h: t.info.height });
  }
  return out;
}

// longest solid horizontal run of opaque pixels ~= head/body width
async function headWidth(pngBuf) {
  const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let best = 0;
  for (let y = 0; y < height; y++) {
    let run = 0;
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 40) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
  }
  return best || 1;
}

async function buildChar(name, def) {
  const frames = [];
  const counts = [];
  for (const a of def.anims) {
    const fr = await splitTrim(a);
    if (a.flip) {
      for (const f of fr) f.data = await sharp(f.data).flop().png().toBuffer();
    }
    counts.push({ name: a.name, n: fr.length });
    fr.forEach((f) => frames.push(f));
  }
  console.log("  " + name + " detected frames:", counts.map((c) => `${c.name}:${c.n}`).join("  "));
  // Normalize EACH frame so its head/body width == def.targetRun, keeping the
  // body a consistent size regardless of how the pose was drawn/scaled.
  for (const f of frames) {
    const run = await headWidth(f.data);
    const s = def.targetRun / run;
    const nw = Math.max(1, Math.round(f.w * s));
    const nh = Math.max(1, Math.round(f.h * s));
    f.data = await sharp(f.data).resize(nw, nh).png().toBuffer();
    f.w = nw;
    f.h = nh;
  }
  const cellW = Math.max(...frames.map((f) => f.w)) + 16;
  const cellH = Math.max(...frames.map((f) => f.h)) + 10;
  const sliceY = Math.ceil(frames.length / SLICE_X);
  const composites = frames.map((f, idx) => {
    const col = idx % SLICE_X;
    const row = Math.floor(idx / SLICE_X);
    return {
      input: f.data,
      left: col * cellW + Math.round((cellW - f.w) / 2),
      top: row * cellH + (cellH - f.h - 5), // feet 5px from cell bottom
    };
  });
  const sheet = await sharp({
    create: { width: cellW * SLICE_X, height: cellH * sliceY, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(OUT, name + ".png"), sheet);

  let idx = 0;
  const ranges = {};
  for (const c of counts) {
    ranges[c.name] = { from: idx, to: idx + c.n - 1 };
    idx += c.n;
  }
  return { sliceX: SLICE_X, sliceY, cellW, cellH, frameCount: frames.length, anims: ranges };
}

// A spinning prop (e.g. the thrown sticker): center-aligned, single uniform
// scale (no head-width/feet logic), packed in one row as anim "spin".
async function buildProp(name, file, target) {
  const frames = await splitTrim({ file });
  console.log("  " + name + " detected frames:", frames.length);
  const maxDim = Math.max(...frames.map((f) => Math.max(f.w, f.h)));
  const scale = target / maxDim;
  for (const f of frames) {
    const nw = Math.max(1, Math.round(f.w * scale));
    const nh = Math.max(1, Math.round(f.h * scale));
    f.data = await sharp(f.data).resize(nw, nh).png().toBuffer();
    f.w = nw;
    f.h = nh;
  }
  const cellW = Math.max(...frames.map((f) => f.w)) + 8;
  const cellH = Math.max(...frames.map((f) => f.h)) + 8;
  const composites = frames.map((f, i) => ({
    input: f.data,
    left: i * cellW + Math.round((cellW - f.w) / 2),
    top: Math.round((cellH - f.h) / 2), // centered (spinning)
  }));
  const sheet = await sharp({
    create: { width: cellW * frames.length, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(OUT, name + ".png"), sheet);
  return { sliceX: frames.length, sliceY: 1, cellW, cellH, frameCount: frames.length, anims: { spin: { from: 0, to: frames.length - 1 } } };
}

(async () => {
  const manifest = {};
  for (const [name, def] of Object.entries(CHARS)) {
    manifest[name] = await buildChar(name, def);
    console.log(name, JSON.stringify(manifest[name]));
  }
  manifest.throwsticker = await buildProp("throwsticker", "throwsticker.png", 96);
  console.log("throwsticker", JSON.stringify(manifest.throwsticker));
  fs.writeFileSync(path.join(OUT, "art-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("done");
})();
