import { describe, it, expect } from "vitest";
import { validateLevel } from "./validate";
import { LEVELS } from "./index";
import type { LevelDef } from "../types";

describe("validateLevel", () => {
  it("passes the shipped mission(s)", () => {
    for (const lvl of LEVELS) {
      expect(validateLevel(lvl)).toEqual([]);
    }
  });

  it("flags an unknown tile", () => {
    const bad: LevelDef = { id: 9, name: "x", reward: "logo", map: ["@ >Z"] };
    expect(validateLevel(bad)).toContain("unknown tile 'Z'");
  });

  it("requires exactly one spawn", () => {
    const bad: LevelDef = { id: 9, name: "x", reward: "logo", map: ["= >"] };
    expect(validateLevel(bad)).toContain("missing exactly one player spawn '@'");
  });

  it("requires gate + hostage on a boss mission", () => {
    const bad: LevelDef = { id: 9, name: "x", reward: "golden", isBoss: true, map: ["@ B"] };
    const errs = validateLevel(bad);
    expect(errs).toContain("boss mission needs a boss gate 'G'");
    expect(errs).toContain("boss mission needs at least one hostage 'H'");
  });
});
