import { PLAYER } from "../config";

export interface RunState {
  levelId: number;
  hearts: number;
  score: number;
}

export function createRun(): RunState {
  return { levelId: 1, hearts: PLAYER.startHearts, score: 0 };
}

export function loseHeart(run: RunState): void {
  run.hearts = Math.max(0, run.hearts - 1);
}

export function isGameOver(run: RunState): boolean {
  return run.hearts <= 0;
}

export function addScore(run: RunState, points: number): void {
  run.score += points;
}

export function advanceLevel(run: RunState): void {
  run.levelId += 1;
  run.hearts = PLAYER.startHearts;
}
