import { PLAYER } from "../config";

// RunState is the single shared, deliberately-mutable game-run object. The
// scene layer holds one instance (via getRun/setRun) and these helpers mutate
// it in place. This is an intentional exception to the general immutability
// preference, chosen so all scenes observe the same live run without threading
// return values through every call site.
export interface RunState {
  levelId: number;
  hearts: number;
  score: number;
  ammo: number;
}

export function createRun(): RunState {
  return { levelId: 1, hearts: PLAYER.startHearts, score: 0, ammo: PLAYER.ammoMax };
}

/** Consume one sticker shot; returns false (and shoots nothing) when empty. */
export function useAmmo(run: RunState): boolean {
  if (run.ammo <= 0) return false;
  run.ammo -= 1;
  return true;
}

/** Replenish one sticker shot from a pickup, capped at the max. */
export function addAmmo(run: RunState): void {
  run.ammo = Math.min(PLAYER.ammoMax, run.ammo + 1);
}

/** Lose one heart, floored at 0 (idempotent once already at 0). */
export function loseHeart(run: RunState): void {
  run.hearts = Math.max(0, run.hearts - 1);
}

export function isGameOver(run: RunState): boolean {
  return run.hearts <= 0;
}

export function addScore(run: RunState, points: number): void {
  run.score += points;
}

/** Refill hearts + ammo to retry the current level (keeps levelId and score). */
export function resetHearts(run: RunState): void {
  run.hearts = PLAYER.startHearts;
  run.ammo = PLAYER.ammoMax;
}

/**
 * Advance to the next level and refill hearts.
 * Precondition: only call when a next level exists. The reward scene checks
 * `levelId >= LEVELS.length` and routes to the win screen instead of advancing,
 * so this is never called past the final level.
 */
export function advanceLevel(run: RunState): void {
  run.levelId += 1;
  run.hearts = PLAYER.startHearts;
  run.ammo = PLAYER.ammoMax;
}
