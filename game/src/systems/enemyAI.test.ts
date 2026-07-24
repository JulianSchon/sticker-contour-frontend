import { describe, it, expect } from "vitest";
import { chaseDir, grannyShouldThrow } from "./enemyAI";

describe("chaseDir", () => {
  it("moves right toward a target to the right", () => {
    expect(chaseDir(100, 400, 20)).toBe(1);
  });
  it("moves left toward a target to the left", () => {
    expect(chaseDir(400, 100, 20)).toBe(-1);
  });
  it("stops inside the deadzone", () => {
    expect(chaseDir(200, 210, 20)).toBe(0);
  });
});

describe("grannyShouldThrow", () => {
  it("throws when the player is within range", () => {
    expect(grannyShouldThrow(200, 320)).toBe(true);
  });
  it("does not throw when out of range", () => {
    expect(grannyShouldThrow(500, 320)).toBe(false);
  });
});
