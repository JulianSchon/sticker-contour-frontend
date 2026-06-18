// Generates Stickan + enemy + prop artwork as PNGs from hand-authored SVG.
// Run: node scripts/gen-art.cjs   (use --force to overwrite existing files)
// Rasterized with @resvg/resvg-js so the runtime keeps loading plain PNGs.
const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

// ---- Brand palette ---------------------------------------------------------
const C = {
  cream: "#FBEFD3",
  creamShade: "#ECDCB4",
  outline: "#161616",
  hair: "#FFE000",
  lens: "#1B1B1B",
  lensHi: "#C9CBC0",
  mouth: "#E6177F",
  glove: "#FFFFFF",
};

// ---- Reusable Stickan parts (string builders) ------------------------------
// All parts drawn in a 256x256 viewBox, body centered ~ (128,120).

function sunglasses() {
  // two rounded lenses + bridge, with a light reflection stripe
  return `
    <g>
      <rect x="50" y="92" width="66" height="46" rx="16" fill="${C.lens}" stroke="${C.outline}" stroke-width="5"/>
      <rect x="140" y="92" width="66" height="46" rx="16" fill="${C.lens}" stroke="${C.outline}" stroke-width="5"/>
      <rect x="112" y="104" width="32" height="12" rx="6" fill="${C.lens}"/>
      <path d="M60 100 L84 100 L72 124 Z" fill="${C.lensHi}" opacity="0.55"/>
      <path d="M150 100 L174 100 L162 124 Z" fill="${C.lensHi}" opacity="0.55"/>
    </g>`;
}

function hair() {
  // yellow swoosh over the top-right of the head
  return `<path d="M120 46 C 168 40 206 70 198 116 C 188 86 156 64 120 70 C 116 60 116 52 120 46 Z"
            fill="${C.hair}" stroke="${C.outline}" stroke-width="5" stroke-linejoin="round"/>`;
}

function mouth() {
  // open happy smile with magenta interior
  return `
    <g>
      <path d="M96 150 Q128 196 160 150 Q128 168 96 150 Z" fill="${C.mouth}" stroke="${C.outline}" stroke-width="5" stroke-linejoin="round"/>
    </g>`;
}

function body() {
  return `<circle cx="128" cy="120" r="80" fill="${C.cream}" stroke="${C.outline}" stroke-width="8"/>`;
}

function face() {
  return hair() + sunglasses() + mouth();
}

// limb helpers
function arm(d) {
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="14" stroke-linecap="round"/>`;
}
function glove(cx, cy) {
  return `<circle cx="${cx}" cy="${cy}" r="16" fill="${C.glove}" stroke="${C.outline}" stroke-width="5"/>`;
}
function leg(d) {
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="14" stroke-linecap="round"/>`;
}
function shoe(cx, cy, flip) {
  const dir = flip ? -1 : 1;
  return `<path d="M${cx - 22 * dir} ${cy} Q${cx - 24 * dir} ${cy + 14} ${cx - 4 * dir} ${cy + 14} L${cx + 18 * dir} ${cy + 14} Q${cx + 24 * dir} ${cy + 14} ${cx + 22 * dir} ${cy} Z"
            fill="${C.cream}" stroke="${C.outline}" stroke-width="5" stroke-linejoin="round"/>`;
}

function svgWrap(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">${inner}</svg>`;
}

function svgWrapWH(inner, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
}

// ---- Enemies ---------------------------------------------------------------
function janitor() {
  // cleaner with a mop; feet near y=206 (anchored bottom in-game)
  return svgWrapWH(`
    <line x1="44" y1="150" x2="16" y2="206" stroke="#8A5A2B" stroke-width="9" stroke-linecap="round"/>
    <g stroke="${C.outline}" stroke-width="4">
      <path d="M2 198 Q16 186 30 198 L26 214 Q16 220 6 214 Z" fill="#B9C2CC"/>
    </g>
    <path d="M74 158 L70 202" stroke="${C.outline}" stroke-width="16" stroke-linecap="round"/>
    <path d="M106 158 L110 202" stroke="${C.outline}" stroke-width="16" stroke-linecap="round"/>
    <ellipse cx="66" cy="206" rx="16" ry="8" fill="#333" stroke="${C.outline}" stroke-width="4"/>
    <ellipse cx="114" cy="206" rx="16" ry="8" fill="#333" stroke="${C.outline}" stroke-width="4"/>
    <rect x="56" y="92" width="68" height="78" rx="20" fill="#2E8B8B" stroke="${C.outline}" stroke-width="6"/>
    <path d="M60 112 L40 150" stroke="#2E8B8B" stroke-width="13" stroke-linecap="round"/>
    <path d="M120 110 L140 138" stroke="#2E8B8B" stroke-width="13" stroke-linecap="round"/>
    <circle cx="40" cy="150" r="9" fill="${C.glove}" stroke="${C.outline}" stroke-width="4"/>
    <circle cx="142" cy="140" r="9" fill="${C.glove}" stroke="${C.outline}" stroke-width="4"/>
    <circle cx="90" cy="62" r="34" fill="#F0C9A0" stroke="${C.outline}" stroke-width="6"/>
    <path d="M56 56 Q90 22 124 56 Z" fill="#214A8C" stroke="${C.outline}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M118 54 Q140 56 148 64 L118 64 Z" fill="#214A8C" stroke="${C.outline}" stroke-width="5" stroke-linejoin="round"/>
    <line x1="74" y1="56" x2="86" y2="64" stroke="${C.outline}" stroke-width="5" stroke-linecap="round"/>
    <line x1="106" y1="56" x2="94" y2="64" stroke="${C.outline}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="80" cy="70" r="3.5" fill="${C.outline}"/>
    <circle cx="100" cy="70" r="3.5" fill="${C.outline}"/>
    <path d="M80 86 Q90 80 100 86" fill="none" stroke="${C.outline}" stroke-width="4" stroke-linecap="round"/>
  `, 180, 220);
}

function granny() {
  return svgWrapWH(`
    <line x1="120" y1="118" x2="150" y2="206" stroke="#8A5A2B" stroke-width="9" stroke-linecap="round"/>
    <path d="M138 196 L162 196 L168 218 L132 218 Z" fill="#C9A24B" stroke="${C.outline}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M70 96 L110 96 L132 200 L48 200 Z" fill="#B57EDC" stroke="${C.outline}" stroke-width="6" stroke-linejoin="round"/>
    <ellipse cx="72" cy="204" rx="13" ry="7" fill="#5A3A5A" stroke="${C.outline}" stroke-width="4"/>
    <ellipse cx="104" cy="204" rx="13" ry="7" fill="#5A3A5A" stroke="${C.outline}" stroke-width="4"/>
    <path d="M78 110 L150 150" stroke="#B57EDC" stroke-width="12" stroke-linecap="round"/>
    <circle cx="150" cy="150" r="9" fill="#F0D2B8" stroke="${C.outline}" stroke-width="4"/>
    <circle cx="90" cy="64" r="32" fill="#F0D2B8" stroke="${C.outline}" stroke-width="6"/>
    <path d="M58 64 Q54 36 80 32 L82 50 Q66 54 66 70 Z" fill="#CFCFCF" stroke="${C.outline}" stroke-width="4"/>
    <path d="M122 64 Q126 36 100 32 L98 50 Q114 54 114 70 Z" fill="#CFCFCF" stroke="${C.outline}" stroke-width="4"/>
    <circle cx="90" cy="28" r="16" fill="#CFCFCF" stroke="${C.outline}" stroke-width="5"/>
    <circle cx="80" cy="64" r="9" fill="none" stroke="${C.outline}" stroke-width="3.5"/>
    <circle cx="100" cy="64" r="9" fill="none" stroke="${C.outline}" stroke-width="3.5"/>
    <line x1="89" y1="64" x2="91" y2="64" stroke="${C.outline}" stroke-width="3"/>
    <path d="M80 84 Q90 78 100 84" fill="none" stroke="${C.outline}" stroke-width="4" stroke-linecap="round"/>
  `, 180, 220);
}

function boss() {
  return svgWrapWH(`
    <ellipse cx="130" cy="214" rx="96" ry="20" fill="#3A3F47" stroke="${C.outline}" stroke-width="6"/>
    <ellipse cx="130" cy="208" rx="70" ry="13" fill="#7A8088" stroke="${C.outline}" stroke-width="5"/>
    <rect x="92" y="150" width="76" height="60" rx="16" fill="#C0392B" stroke="${C.outline}" stroke-width="6"/>
    <circle cx="130" cy="178" r="13" fill="#F0C040" stroke="${C.outline}" stroke-width="5"/>
    <path d="M168 160 L210 72" stroke="#9AA0A8" stroke-width="12" stroke-linecap="round"/>
    <line x1="196" y1="92" x2="226" y2="92" stroke="#9AA0A8" stroke-width="12" stroke-linecap="round"/>
    <rect x="84" y="84" width="86" height="82" rx="22" fill="#214A8C" stroke="${C.outline}" stroke-width="7"/>
    <path d="M158 112 L200 90" stroke="#214A8C" stroke-width="16" stroke-linecap="round"/>
    <circle cx="204" cy="88" r="11" fill="${C.glove}" stroke="${C.outline}" stroke-width="4"/>
    <circle cx="127" cy="54" r="40" fill="#F0C9A0" stroke="${C.outline}" stroke-width="7"/>
    <path d="M85 48 Q127 6 169 48 Z" fill="#7A1F17" stroke="${C.outline}" stroke-width="6" stroke-linejoin="round"/>
    <line x1="105" y1="48" x2="121" y2="58" stroke="${C.outline}" stroke-width="6" stroke-linecap="round"/>
    <line x1="149" y1="48" x2="133" y2="58" stroke="${C.outline}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="115" cy="66" r="4.5" fill="${C.outline}"/>
    <circle cx="139" cy="66" r="4.5" fill="${C.outline}"/>
    <path d="M111 84 Q127 76 143 84" fill="none" stroke="${C.outline}" stroke-width="5" stroke-linecap="round"/>
  `, 260, 240);
}

// ---- Poses -----------------------------------------------------------------
function stickanIdle() {
  return svgWrap(`
    ${leg("M112 190 L104 232")}
    ${leg("M148 190 L156 232")}
    ${shoe(100, 232, false)}
    ${shoe(160, 232, true)}
    ${arm("M64 130 L44 168")}
    ${glove(42, 174)}
    ${body()}
    ${face()}
    ${arm("M196 120 L214 72")}
    ${glove(216, 64)}
  `);
}

function stickanRun() {
  // slight forward lean, legs mid-stride, arms pumping
  return svgWrap(`
    ${leg("M120 188 L150 224")}
    ${shoe(156, 224, true)}
    ${leg("M118 188 L92 220")}
    ${shoe(86, 220, false)}
    ${arm("M192 122 L210 158")}
    ${glove(212, 164)}
    ${body()}
    ${face()}
    ${arm("M66 126 L40 150")}
    ${glove(36, 156)}
  `);
}

function stickanJump() {
  // both arms up, legs tucked
  return svgWrap(`
    ${leg("M114 192 L98 214")}
    ${shoe(92, 214, false)}
    ${leg("M150 192 L166 214")}
    ${shoe(172, 214, true)}
    ${arm("M70 122 L44 78")}
    ${glove(40, 70)}
    ${body()}
    ${face()}
    ${arm("M190 122 L216 78")}
    ${glove(220, 70)}
  `);
}

// ---- Metallic platform tiles plastered with stickers -----------------------
const STK = {
  yellow: "#FFD400", pink: "#E6177F", blue: "#1F9BFF",
  green: "#27C26B", orange: "#FF8A1E", red: "#F0322F",
};

// Die-cut sticker = white halo (fat white stroke) under a colored shape w/ hairline.
function stkCircle(x, y, r, rot, fill) {
  return `<g transform="rotate(${rot} ${x} ${y})">
    <circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#fff" stroke-width="6"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#161616" stroke-width="1.5"/></g>`;
}
function stkSquare(x, y, s, rot, fill) {
  return `<g transform="rotate(${rot} ${x} ${y})">
    <rect x="${x - s}" y="${y - s}" width="${2 * s}" height="${2 * s}" rx="4" fill="#fff" stroke="#fff" stroke-width="6"/>
    <rect x="${x - s}" y="${y - s}" width="${2 * s}" height="${2 * s}" rx="4" fill="${fill}" stroke="#161616" stroke-width="1.5"/></g>`;
}
function starPts(x, y, r) {
  let p = "";
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    p += `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)} `;
  }
  return p.trim();
}
function stkStar(x, y, r, rot, fill) {
  const pts = starPts(x, y, r);
  return `<g transform="rotate(${rot} ${x} ${y})">
    <polygon points="${pts}" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    <polygon points="${pts}" fill="${fill}" stroke="#161616" stroke-width="1.2" stroke-linejoin="round"/></g>`;
}
function stkHeart(x, y, s, rot, fill) {
  const d = `M ${x} ${y + s * 0.7} C ${x - s} ${y - s * 0.2} ${x - s * 0.5} ${y - s} ${x} ${y - s * 0.3} C ${x + s * 0.5} ${y - s} ${x + s} ${y - s * 0.2} ${x} ${y + s * 0.7} Z`;
  return `<g transform="rotate(${rot} ${x} ${y})">
    <path d="${d}" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    <path d="${d}" fill="${fill}" stroke="#161616" stroke-width="1.2" stroke-linejoin="round"/></g>`;
}

function rivet(x, y) {
  return `<circle cx="${x}" cy="${y}" r="3.2" fill="#6B7079" stroke="#4A4E55" stroke-width="1"/>
          <circle cx="${x - 1}" cy="${y - 1}" r="1" fill="#CACDD3"/>`;
}

function metalTile(stickers) {
  return svgWrapWH(`
    <defs>
      <linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#BCC0C8"/>
        <stop offset="0.5" stop-color="#9AA0AA"/>
        <stop offset="1" stop-color="#7C828C"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="64" height="64" fill="url(#m)"/>
    <g opacity="0.12" stroke="#2b2e33" stroke-width="1">
      <line x1="14" y1="2" x2="14" y2="62"/><line x1="30" y1="2" x2="30" y2="62"/>
      <line x1="46" y1="2" x2="46" y2="62"/>
    </g>
    <line x1="0" y1="1.5" x2="64" y2="1.5" stroke="#D8DCE2" stroke-width="2.5"/>
    <line x1="1.5" y1="0" x2="1.5" y2="64" stroke="#D2D6DD" stroke-width="2"/>
    <line x1="0" y1="62.5" x2="64" y2="62.5" stroke="#5C616A" stroke-width="2.5"/>
    <line x1="62.5" y1="0" x2="62.5" y2="64" stroke="#5C616A" stroke-width="2"/>
    ${rivet(8, 9)}${rivet(56, 9)}${rivet(8, 56)}${rivet(56, 56)}
    ${stickers}
  `, 64, 64);
}

// Sticker layouts per variant (some overhang edges so tiles blend together).
const GROUND_VARIANTS = [
  stkCircle(20, 26, 12, -12, STK.yellow) + stkStar(48, 46, 12, 16, STK.blue),
  stkSquare(42, 22, 12, 12, STK.pink) + stkCircle(16, 48, 10, 0, STK.green),
  stkStar(32, 30, 16, -8, STK.orange) + stkCircle(54, 14, 7, 0, STK.pink),
  stkHeart(24, 26, 12, -10, STK.red) + stkSquare(48, 50, 11, 20, STK.yellow),
  stkCircle(34, 40, 13, 8, STK.blue) + stkCircle(52, 16, 8, 0, STK.pink) + stkStar(14, 18, 9, -20, STK.yellow),
  stkSquare(22, 32, 13, -14, STK.green) + stkStar(50, 40, 11, 12, STK.yellow) + stkCircle(40, 14, 7, 0, STK.red),
  stkCircle(30, 22, 11, 6, STK.orange) + stkHeart(52, 46, 11, 14, STK.pink),
  stkStar(20, 44, 13, 10, STK.green) + stkSquare(46, 24, 11, -10, STK.blue),
];

// ---- Background ------------------------------------------------------------
function bgCity() {
  const cloud = (x, y, s) => `
    <g fill="#FFFFFF" opacity="0.92">
      <ellipse cx="${x}" cy="${y}" rx="${46 * s}" ry="${28 * s}"/>
      <ellipse cx="${x + 40 * s}" cy="${y + 6 * s}" rx="${34 * s}" ry="${22 * s}"/>
      <ellipse cx="${x - 38 * s}" cy="${y + 8 * s}" rx="${30 * s}" ry="${20 * s}"/>
      <rect x="${x - 64 * s}" y="${y + 6 * s}" width="${128 * s}" height="${22 * s}" rx="${11 * s}"/>
    </g>`;

  // a building with simple window grid
  const bldg = (x, w, h, fill, win) => {
    let windows = "";
    const cols = Math.max(1, Math.floor(w / 26));
    const rows = Math.max(1, Math.floor(h / 34));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 3 === 0) continue; // some dark windows
        windows += `<rect x="${x + 10 + c * 26}" y="${720 - h + 16 + r * 34}" width="12" height="16" rx="2" fill="${win}" opacity="0.85"/>`;
      }
    }
    return `<rect x="${x}" y="${720 - h}" width="${w}" height="${h}" fill="${fill}"/>${windows}`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5E9BE6"/>
        <stop offset="0.7" stop-color="#9CC8F5"/>
        <stop offset="1" stop-color="#CFE7FF"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="1280" height="720" fill="url(#sky)"/>
    <circle cx="1060" cy="150" r="110" fill="#FFEFA8" opacity="0.35"/>
    <circle cx="1060" cy="150" r="66" fill="#FFE07A"/>
    ${cloud(230, 150, 1.1)}
    ${cloud(560, 100, 0.8)}
    ${cloud(880, 200, 1.0)}
    <!-- far skyline (hazy) -->
    <g opacity="0.6">
      ${bldg(60, 90, 200, "#9DBBDD", "#EAF3FF")}
      ${bldg(180, 70, 150, "#9DBBDD", "#EAF3FF")}
      ${bldg(420, 110, 240, "#9DBBDD", "#EAF3FF")}
      ${bldg(700, 80, 180, "#9DBBDD", "#EAF3FF")}
      ${bldg(980, 120, 230, "#9DBBDD", "#EAF3FF")}
      ${bldg(1180, 80, 160, "#9DBBDD", "#EAF3FF")}
    </g>
    <!-- near skyline -->
    ${bldg(0, 130, 280, "#5E7CA8", "#FFE07A")}
    ${bldg(150, 100, 200, "#52709C", "#FFE07A")}
    ${bldg(290, 140, 320, "#5E7CA8", "#FFE07A")}
    ${bldg(470, 90, 230, "#52709C", "#FFE07A")}
    ${bldg(600, 150, 300, "#5E7CA8", "#FFE07A")}
    ${bldg(800, 110, 250, "#52709C", "#FFE07A")}
    ${bldg(960, 140, 330, "#5E7CA8", "#FFE07A")}
    ${bldg(1140, 160, 270, "#52709C", "#FFE07A")}
    <!-- haze/ground band behind platforms -->
    <rect x="0" y="628" width="1280" height="92" fill="#3F4F70"/>
  </svg>`;
}

// ---- Render ----------------------------------------------------------------
const ASSETS = [
  { name: "stickan-wave", svg: stickanIdle(), width: 256 },
  { name: "stickan-run", svg: stickanRun(), width: 256 },
  { name: "stickan-jump", svg: stickanJump(), width: 256 },
  { name: "janitor", svg: janitor(), width: 180 },
  { name: "granny", svg: granny(), width: 180 },
  { name: "boss", svg: boss(), width: 260 },
  { name: "bg-city", svg: bgCity(), width: 1280 },
];

// Metallic sticker platform tiles: ground-0 .. ground-N
GROUND_VARIANTS.forEach((stickers, i) => {
  ASSETS.push({ name: `ground-${i}`, svg: metalTile(stickers), width: 64 });
});
module.exports = { GROUND_COUNT: GROUND_VARIANTS.length };

const force = process.argv.includes("--force");
const dir = path.join("public", "sprites");
fs.mkdirSync(dir, { recursive: true });

for (const a of ASSETS) {
  const file = path.join(dir, a.name + ".png");
  if (fs.existsSync(file) && !force) {
    console.log("skip (exists): " + file + "  (use --force)");
    continue;
  }
  const png = new Resvg(a.svg, { fitTo: { mode: "width", value: a.width } }).render().asPng();
  fs.writeFileSync(file, png);
  console.log("wrote " + file);
}
console.log("done");
