import { describe, it, expect } from "vitest";
import { selectThrowMode, throwVector } from "./throwAim";

describe("selectThrowMode", () => {
  it("prioritises aim-up over everything", () => {
    expect(selectThrowMode({ crouch: true, aimUp: true }, true)).toBe("up");
    expect(selectThrowMode({ crouch: false, aimUp: true }, false)).toBe("up");
  });
  it("returns air when not grounded (and not aiming up)", () => {
    expect(selectThrowMode({ crouch: true, aimUp: false }, false)).toBe("air");
  });
  it("returns low when crouching on the ground", () => {
    expect(selectThrowMode({ crouch: true, aimUp: false }, true)).toBe("low");
  });
  it("returns forward otherwise", () => {
    expect(selectThrowMode({ crouch: false, aimUp: false }, true)).toBe("forward");
  });
});

describe("throwVector", () => {
  it("forward goes straight in facing direction", () => {
    const v = throwVector(1, "forward", 700);
    expect(v.vx).toBe(700);
    expect(v.vy).toBe(0);
  });
  it("left facing negates vx", () => {
    expect(throwVector(-1, "forward", 700).vx).toBe(-700);
  });
  it("up mostly rises with a slight forward lean and higher spawn", () => {
    const v = throwVector(1, "up", 700);
    expect(v.vy).toBeLessThan(0);
    expect(v.vx).toBeGreaterThan(0);
    expect(v.vx).toBeLessThan(700);
    expect(v.dy).toBeLessThan(-40);
  });
  it("low spawns near the ground", () => {
    expect(throwVector(1, "low", 700).dy).toBeGreaterThan(-40);
  });
});
