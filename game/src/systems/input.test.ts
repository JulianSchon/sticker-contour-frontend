import { describe, it, expect } from "vitest";
import { createInputState, setAxis, press, consumePress } from "./input";

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
