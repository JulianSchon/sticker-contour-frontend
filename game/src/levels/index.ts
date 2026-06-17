import type { LevelDef } from "../types";

// Maps are read top-to-bottom; each char is one TILE_SIZE cell.
// Legend: = ground | wall ^ pit j janitor g granny c checkpoint
//         s sticker-coin @ spawn > goal B boss  (space) empty

const level1: LevelDef = {
  id: 1,
  name: "Sticker Street",
  reward: "logo",
  map: [
    "                              ",
    "                              ",
    "          s                   ",
    "                        s     ",
    "   @           j              ",
    "=======      ========     ===>",
    "=======^^^^^^========^^^^^====",
  ],
};

const level2: LevelDef = {
  id: 2,
  name: "Back Alley",
  reward: "shades",
  map: [
    "                                   ",
    "        s            s             ",
    "   @        j     c        g       ",
    "======   =====   ====   ========   ",
    "======^^^=====^^^====^^^========  >",
    "======^^^=====^^^====^^^===========",
  ],
};

const level3: LevelDef = {
  id: 3,
  name: "The Mall",
  reward: "mall",
  map: [
    "                                     ",
    "     s      g      s      g          ",
    "  @      c       =====        j      ",
    "=====   ===   ==     ==   =========  ",
    "=====^^^===^^^==     ==^^^=========  >",
    "=====^^^===^^^=========^^^===========",
  ],
};

const level4: LevelDef = {
  id: 4,
  name: "Cleaning HQ",
  reward: "golden",
  isBoss: true,
  map: [
    "                              ",
    "                              ",
    "                              ",
    "   @                  B       ",
    "==============================",
    "==============================",
  ],
};

export const LEVELS: LevelDef[] = [level1, level2, level3, level4];

export function getLevel(id: number): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`No level with id ${id}`);
  return level;
}
