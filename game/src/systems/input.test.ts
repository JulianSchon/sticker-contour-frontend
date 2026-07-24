import { describe, it, expect } from "vitest";
import { createInputState, setAxis, press, consumePress, setCrouch, setAimUp } from "./input";

describe("input state", () => {
  it("starts neutral", () => {
    const s = createInputState();
    expect(s.moveX).toBe(0);
    expect(s.jumpQueued).toBe(false);
    expect(s.throwQueued).toBe(false);
  });
  it("sets horizontal axis clamped to -1..1", () => {
    const s = createInputState();
    setAxis(s, -5);
    expect(s.moveX).toBe(-1);
    setAxis(s, 5);
    expect(s.moveX).toBe(1);
  });
  it("stores a fractional axis value unchanged within range", () => {
    const s = createInputState();
    setAxis(s, 0.7);
    expect(s.moveX).toBe(0.7);
  });
  it("queues and consumes a jump press once", () => {
    const s = createInputState();
    press(s, "jump");
    expect(consumePress(s, "jump")).toBe(true);
    expect(consumePress(s, "jump")).toBe(false);
  });
  it("queues and consumes a throw press once", () => {
    const s = createInputState();
    press(s, "throw");
    expect(consumePress(s, "throw")).toBe(true);
    expect(consumePress(s, "throw")).toBe(false);
  });
});

describe("shinobi input additions", () => {
  it("starts with crouch/aimUp false and magic unqueued", () => {
    const s = createInputState();
    expect(s.crouch).toBe(false);
    expect(s.aimUp).toBe(false);
    expect(consumePress(s, "magic")).toBe(false);
  });

  it("setCrouch / setAimUp store held booleans", () => {
    const s = createInputState();
    setCrouch(s, true);
    setAimUp(s, true);
    expect(s.crouch).toBe(true);
    expect(s.aimUp).toBe(true);
  });

  it("magic is edge-triggered like other actions", () => {
    const s = createInputState();
    press(s, "magic");
    expect(consumePress(s, "magic")).toBe(true);
    expect(consumePress(s, "magic")).toBe(false);
  });
});
