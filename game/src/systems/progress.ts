import { PLAYER, MAGIC } from "../config";

// RunState is the single shared, deliberately-mutable game-run object. The
// scene layer holds one instance (via getRun/setRun) and these helpers mutate
// it in place. Intentional exception to the immutability preference so all
// scenes observe the same live run without threading return values.
export interface RunState {
  levelId: number;
  hearts: number;
  score: number;
  magic: number;          // ninja-magic charges
  hostagesFreed: number;
  hostagesTotal: number;
}

export function createRun(): RunState {
  return {
    levelId: 1,
    hearts: PLAYER.startHearts,
    score: 0,
    magic: MAGIC.startCharges,
    hostagesFreed: 0,
    hostagesTotal: 0,
  };
}

/** Consume one magic charge; returns false when empty. */
export function useMagic(run: RunState): boolean {
  if (run.magic <= 0) return false;
  run.magic -= 1;
  return true;
}

/** Refill one magic charge, capped at the max. */
export function addMagic(run: RunState): void {
  run.magic = Math.min(MAGIC.maxCharges, run.magic + 1);
}

/** Record a freed hostage (never exceeds the total). */
export function freeHostage(run: RunState): void {
  run.hostagesFreed = Math.min(run.hostagesTotal, run.hostagesFreed + 1);
}

/** True once every hostage is freed (a mission with zero hostages is "open"). */
export function allHostagesFreed(run: RunState): boolean {
  return run.hostagesTotal <= 0 ? true : run.hostagesFreed >= run.hostagesTotal;
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

/** Refill hearts + magic to retry the mission (keeps score + hostage progress). */
export function resetHearts(run: RunState): void {
  run.hearts = PLAYER.startHearts;
  run.magic = MAGIC.maxCharges;
}
