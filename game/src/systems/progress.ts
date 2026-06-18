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
}

export function createRun(): RunState {
  return { levelId: 1, hearts: PLAYER.startHearts, score: 0 };
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

/** Refill hearts to full to retry the current level (keeps levelId and score). */
export function resetHearts(run: RunState): void {
  run.hearts = PLAYER.startHearts;
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
}
