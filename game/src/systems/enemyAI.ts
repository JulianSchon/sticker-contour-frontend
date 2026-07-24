/** Direction (-1/0/1) an enemy should move to approach targetX, with a deadzone. */
export function chaseDir(selfX: number, targetX: number, deadzone: number): number {
  const d = targetX - selfX;
  if (Math.abs(d) <= deadzone) return 0;
  return d > 0 ? 1 : -1;
}

/** A thrower stops and attacks when the player is within `range` horizontal px. */
export function grannyShouldThrow(distX: number, range: number): boolean {
  return distX <= range;
}
