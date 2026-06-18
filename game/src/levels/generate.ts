import type { LevelDef, StickerId } from "../types";

// Deterministic PRNG so each level is fixed across plays but varied between levels.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GenOpts {
  id: number;
  name: string;
  reward: StickerId;
  seed: number;
  segments: number; // number of platform blocks (controls length)
  janitorChance: number;
  grannyChance: number;
}

const ROWS = 8; // map height; floor sits near the bottom, sky above
const MIN_TOP = 3; // highest a platform top can be (smaller row = higher)
const MAX_TOP = 6; // lowest (ground level)

/**
 * Build a side-scrolling level as a row of solid "pillar" blocks of varying
 * height, separated by jumpable gaps (with kill-pits below). Adjacent blocks
 * differ by at most one tile in height so every jump is reachable.
 */
export function genLevel(o: GenOpts): LevelDef {
  const rng = mulberry32(o.seed);
  type Seg = { start: number; width: number; top: number };
  const segs: Seg[] = [];
  let col = 0;
  let prevTop = MAX_TOP;
  for (let i = 0; i < o.segments; i++) {
    const width = 4 + Math.floor(rng() * 5); // 4-8 tiles
    let top = i === 0 ? MAX_TOP : prevTop + (Math.floor(rng() * 3) - 1); // step -1/0/+1
    if (top < MIN_TOP) top = MIN_TOP;
    if (top > MAX_TOP) top = MAX_TOP;
    segs.push({ start: col, width, top });
    col += width;
    if (i < o.segments - 1) col += 2 + Math.floor(rng() * 2); // 2-3 tile gap
    prevTop = top;
  }
  const width = col;
  const grid: string[][] = Array.from({ length: ROWS }, () => Array(width).fill(" "));
  const set = (r: number, c: number, ch: string) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < width) grid[r][c] = ch;
  };

  // solid blocks (pillars from their top down to the bottom row)
  for (const s of segs) {
    for (let c = s.start; c < s.start + s.width; c++) {
      for (let r = s.top; r < ROWS; r++) set(r, c, "=");
    }
  }
  // kill-pits in the gap columns (bottom row)
  for (let c = 0; c < width; c++) {
    if (grid[ROWS - 1][c] === " ") set(ROWS - 1, c, "^");
  }

  const first = segs[0];
  const last = segs[segs.length - 1];
  set(first.top - 1, first.start + 1, "@");
  set(last.top - 1, last.start + last.width - 2, ">");

  // checkpoint roughly mid-way
  const mid = segs[Math.floor(segs.length / 2)];
  set(mid.top - 1, mid.start + 1, "c");

  // enemies + floating coins on the intermediate blocks (never the spawn/goal block)
  for (let i = 1; i < segs.length - 1; i++) {
    const s = segs[i];
    const cx = s.start + Math.floor(s.width / 2);
    const roll = rng();
    if (roll < o.janitorChance) set(s.top - 1, cx, "j");
    else if (roll < o.janitorChance + o.grannyChance) set(s.top - 1, cx, "g");
    if (rng() < 0.6) set(s.top - 3, s.start + Math.max(1, s.width - 2), "s");
  }

  return { id: o.id, name: o.name, reward: o.reward, map: grid.map((r) => r.join("")) };
}
