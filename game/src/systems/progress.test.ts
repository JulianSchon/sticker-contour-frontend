import { describe, it, expect } from "vitest";
import { createRun, loseHeart, addScore, isGameOver, advanceLevel, resetHearts, useAmmo, addAmmo } from "./progress";

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
  it("loseHeart stays at 0 when already at 0", () => {
    const run = createRun();
    loseHeart(run); loseHeart(run); loseHeart(run);
    loseHeart(run);
    expect(run.hearts).toBe(0);
  });
  it("resetHearts refills hearts + ammo without changing level or score", () => {
    const run = createRun();
    run.levelId = 3; run.score = 250; run.ammo = 0;
    loseHeart(run); loseHeart(run); loseHeart(run);
    resetHearts(run);
    expect(run.hearts).toBe(3);
    expect(run.ammo).toBe(3);
    expect(run.levelId).toBe(3);
    expect(run.score).toBe(250);
  });
  it("starts with full ammo and consumes it down to empty", () => {
    const run = createRun();
    expect(run.ammo).toBe(3);
    expect(useAmmo(run)).toBe(true);
    expect(useAmmo(run)).toBe(true);
    expect(useAmmo(run)).toBe(true);
    expect(run.ammo).toBe(0);
    expect(useAmmo(run)).toBe(false); // empty: no shot
  });
  it("addAmmo replenishes but is capped at the max", () => {
    const run = createRun();
    run.ammo = 0;
    addAmmo(run);
    expect(run.ammo).toBe(1);
    addAmmo(run); addAmmo(run); addAmmo(run); // try to overfill
    expect(run.ammo).toBe(3);
  });
});
