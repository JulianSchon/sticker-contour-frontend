import type { KAPLAYCtx } from "kaplay";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { InputState, press, setAxis } from "./input";

/**
 * Wires keyboard + raw multi-touch into the shared InputState.
 * Touch buttons are virtual rectangles in the lower corners of the screen.
 * Exposed for the HUD to draw matching button graphics.
 */
export interface TouchZones {
  left: [number, number, number, number];   // x, y, w, h (screen space)
  right: [number, number, number, number];
  jump: [number, number, number, number];
  throw: [number, number, number, number];
}

export function touchZones(): TouchZones {
  const pad = 24;
  const size = 120;
  const y = GAME_HEIGHT - size - pad;
  return {
    left: [pad, y, size, size],
    right: [pad * 2 + size, y, size, size],
    throw: [GAME_WIDTH - pad * 2 - size * 2, y, size, size],
    jump: [GAME_WIDTH - pad - size, y, size, size],
  };
}

function inZone(z: [number, number, number, number], x: number, y: number): boolean {
  return x >= z[0] && x <= z[0] + z[2] && y >= z[1] && y <= z[1] + z[3];
}

export function wireInput(k: KAPLAYCtx, state: InputState): void {
  const zones = touchZones();
  const activeTouches = new Map<number, string>();

  const recomputeAxis = () => {
    const buttons = new Set(activeTouches.values());
    let axis = 0;
    if (buttons.has("left")) axis -= 1;
    if (buttons.has("right")) axis += 1;
    setAxis(state, axis);
  };

  // Keyboard held axis — only when touch isn't driving the axis.
  k.onUpdate(() => {
    if (activeTouches.size > 0) return;
    let axis = 0;
    if (k.isKeyDown("left") || k.isKeyDown("a")) axis -= 1;
    if (k.isKeyDown("right") || k.isKeyDown("d")) axis += 1;
    setAxis(state, axis);
  });

  k.onKeyPress(["space", "up", "w"], () => press(state, "jump"));
  k.onKeyPress(["x", "j", "shift"], () => press(state, "throw"));

  k.onTouchStart((pos, t) => {
    let hit = "";
    if (inZone(zones.left, pos.x, pos.y)) hit = "left";
    else if (inZone(zones.right, pos.x, pos.y)) hit = "right";
    else if (inZone(zones.jump, pos.x, pos.y)) { press(state, "jump"); hit = "jump"; }
    else if (inZone(zones.throw, pos.x, pos.y)) { press(state, "throw"); hit = "throw"; }
    if (hit) activeTouches.set(t.identifier, hit);
    recomputeAxis();
  });

  k.onTouchEnd((_pos, t) => {
    activeTouches.delete(t.identifier);
    recomputeAxis();
  });
}
