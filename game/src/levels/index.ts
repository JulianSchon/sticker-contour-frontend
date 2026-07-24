import type { LevelDef } from "../types";

// Single hand-authored Shinobi mission. Legend:
//   @ spawn  = ground  ^ pit  j rusher  g thrower  s magic pickup
//   H hostage (free all to open the gate)  G boss gate  B boss  (space) empty
// The mission reads left-to-right but the player holds ground and faces both
// ways as enemies advance; the gate blocks the boss until all H are freed.
const mission: LevelDef = {
  id: 1,
  name: "Cleaner's Compound",
  reward: "golden",
  isBoss: true,
  map: [
    "                                                            ",
    "                                                            ",
    "                                                            ",
    "        s              s                 s                  ",
    "     H        j     H        g      H        j        G   B ",
    "  @                                                      G  ",
    "===========^^^====================^^^=======================",
    "============================================================",
  ],
};

export const LEVELS: LevelDef[] = [mission];

export function getLevel(id: number): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`No level with id ${id}`);
  return level;
}
