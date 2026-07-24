import type { LevelDef } from "../types";

export const LEGAL_TILES = new Set<string>([
  "=", "|", "^", "j", "g", "f", "c", "s", "@", ">", "B", "H", "G", " ",
]);

function countChar(map: string[], ch: string): number {
  return map.reduce((sum, row) => sum + [...row].filter((c) => c === ch).length, 0);
}

/** Returns a list of human-readable problems; empty array means valid. */
export function validateLevel(level: LevelDef): string[] {
  const errors: string[] = [];

  if (level.map.length === 0) {
    errors.push("map has no rows");
    return errors;
  }

  const unknown = new Set<string>();
  for (const row of level.map) {
    for (const ch of row) {
      if (!LEGAL_TILES.has(ch)) unknown.add(ch);
    }
  }
  for (const ch of unknown) errors.push(`unknown tile '${ch}'`);

  if (countChar(level.map, "@") !== 1) {
    errors.push("missing exactly one player spawn '@'");
  }

  if (level.isBoss) {
    if (countChar(level.map, "B") !== 1) {
      errors.push("boss mission needs exactly one boss spawn 'B'");
    }
    if (countChar(level.map, "G") < 1) {
      errors.push("boss mission needs a boss gate 'G'");
    }
    if (countChar(level.map, "H") < 1) {
      errors.push("boss mission needs at least one hostage 'H'");
    }
  } else if (countChar(level.map, ">") !== 1) {
    errors.push("non-boss level needs exactly one goal '>'");
  }

  return errors;
}
