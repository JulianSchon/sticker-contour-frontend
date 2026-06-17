import { describe, it, expect } from "vitest";
import { createRun, loseHeart, addScore, isGameOver, advanceLevel } from "./progress";

describe("run progress", () => {
  it("starts on level 1 with full hearts and zero score", () => {
    const run = createRun();
    expect(run.levelId).toBe(1);
    expect(run.hearts).toBe(3);
    expect(run.score).toBe(0);
  });
  it("loses a heart and reports game over at zero", () => {
    const run = createRun();
    loseHeart(run);
    expect(run.hearts).toBe(2);
    expect(isGameOver(run)).toBe(false);
    loseHeart(run);
    loseHeart(run);
    expect(run.hearts).toBe(0);
    expect(isGameOver(run)).toBe(true);
  });
  it("adds score", () => {
    const run = createRun();
    addScore(run, 50);
    addScore(run, 25);
    expect(run.score).toBe(75);
  });
  it("advances to the next level and refills hearts", () => {
    const run = createRun();
    loseHeart(run);
    advanceLevel(run);
    expect(run.levelId).toBe(2);
    expect(run.hearts).toBe(3);
  });
});
