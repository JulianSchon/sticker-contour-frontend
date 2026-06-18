import type { LevelDef } from "../types";
import { genLevel } from "./generate";

// Legend: = ground ^ pit j janitor g granny c checkpoint
//         s sticker-coin @ spawn > goal B boss  (space) empty
// Levels 1-3 are generated (long, stepped-height blocks + enemies); the boss
// level is a flat hand-made arena so the Head Cleaner can charge across it.

const level1 = genLevel({ id: 1, name: "Sticker Street", reward: "logo", seed: 1011, segments: 7, janitorChance: 0.55, grannyChance: 0 });
const level2 = genLevel({ id: 2, name: "Back Alley", reward: "shades", seed: 2022, segments: 9, janitorChance: 0.45, grannyChance: 0.3 });
const level3 = genLevel({ id: 3, name: "The Mall", reward: "mall", seed: 3033, segments: 11, janitorChance: 0.4, grannyChance: 0.4 });

const level4: LevelDef = {
  id: 4,
  name: "Cleaning HQ",
  reward: "golden",
  isBoss: true,
  map: [
    "                      ",
    "                      ",
    "                      ",
    "                      ",
    "                      ",
    "   @            B     ",
    "======================",
    "======================",
  ],
};

export const LEVELS: LevelDef[] = [level1, level2, level3, level4];

export function getLevel(id: number): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`No level with id ${id}`);
  return level;
}
