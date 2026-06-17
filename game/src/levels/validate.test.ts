import { describe, it, expect } from "vitest";
import { LEVELS } from "./index";
import { validateLevel, LEGAL_TILES } from "./validate";

describe("level data", () => {
  it("has four levels with ascending ids", () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4]);
  });
  it("every level passes validation", () => {
    for (const level of LEVELS) {
      expect(validateLevel(level)).toEqual([]);
    }
  });
  it("only the last level is a boss level", () => {
    expect(LEVELS.filter((l) => l.isBoss).map((l) => l.id)).toEqual([4]);
  });
});

describe("validateLevel", () => {
  it("reports a missing player spawn", () => {
    const errors = validateLevel({ id: 9, name: "x", map: ["==="], reward: "logo" });
    expect(errors).toContain("missing exactly one player spawn '@'");
  });
  it("reports unknown tiles", () => {
    const errors = validateLevel({ id: 9, name: "x", map: ["@ ?", ">  "], reward: "logo" });
    expect(errors.some((e) => e.includes("unknown tile '?'"))).toBe(true);
  });
  it("requires a goal on non-boss levels", () => {
    const errors = validateLevel({ id: 9, name: "x", map: ["@  "], reward: "logo" });
    expect(errors).toContain("non-boss level needs exactly one goal '>'");
  });
  it("accepts legal tiles", () => {
    expect(LEGAL_TILES.has("=")).toBe(true);
  });
});
