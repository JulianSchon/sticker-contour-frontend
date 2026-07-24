import { describe, it, expect } from "vitest";
import {
  createRun, useMagic, addMagic, freeHostage, allHostagesFreed,
  loseHeart, isGameOver, addScore,
} from "./progress";
import { MAGIC } from "../config";

describe("magic charges", () => {
  it("starts with MAGIC.startCharges", () => {
    expect(createRun().magic).toBe(MAGIC.startCharges);
  });
  it("useMagic consumes one and fails at zero", () => {
    const run = createRun();
    run.magic = 1;
    expect(useMagic(run)).toBe(true);
    expect(run.magic).toBe(0);
    expect(useMagic(run)).toBe(false);
  });
  it("addMagic refills capped at maxCharges", () => {
    const run = createRun();
    run.magic = MAGIC.maxCharges;
    addMagic(run);
    expect(run.magic).toBe(MAGIC.maxCharges);
  });
});

describe("hostages", () => {
  it("freeHostage increments up to total", () => {
    const run = createRun();
    run.hostagesTotal = 2;
    freeHostage(run);
    expect(run.hostagesFreed).toBe(1);
    expect(allHostagesFreed(run)).toBe(false);
    freeHostage(run);
    expect(allHostagesFreed(run)).toBe(true);
    freeHostage(run); // cannot overshoot
    expect(run.hostagesFreed).toBe(2);
  });
  it("with no hostages the gate is considered open", () => {
    const run = createRun();
    run.hostagesTotal = 0;
    expect(allHostagesFreed(run)).toBe(true);
  });
});

describe("hearts still work", () => {
  it("loseHeart floors at zero and flags game over", () => {
    const run = createRun();
    run.hearts = 1;
    loseHeart(run);
    expect(run.hearts).toBe(0);
    expect(isGameOver(run)).toBe(true);
  });
  it("addScore accumulates", () => {
    const run = createRun();
    addScore(run, 50);
    expect(run.score).toBe(50);
  });
});
