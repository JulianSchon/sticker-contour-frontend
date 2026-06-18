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

  const hitZone = (x: number, y: number): string => {
    if (inZone(zones.left, x, y)) return "left";
    if (inZone(zones.right, x, y)) return "right";
    if (inZone(zones.jump, x, y)) return "jump";
    if (inZone(zones.throw, x, y)) return "throw";
    return "";
  };

  const recomputeAxis = () => {
    const buttons = new Set(activeTouches.values());
    let axis = 0;
    if (buttons.has("left")) axis -= 1;
    if (buttons.has("right")) axis += 1;
    setAxis(state, axis);
  };

  // Keyboard held axis — only when touch isn't driving the axis.
  // NOTE: this global onUpdate is registered in main.ts BEFORE any scene/entity
  // is created, so it runs before entity onUpdate handlers each frame. Keep that
  // ordering: wireInput() must be called before registerScenes().
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
    const zone = hitZone(pos.x, pos.y);
    if (zone === "jump") press(state, "jump");
    else if (zone === "throw") press(state, "throw");
    if (zone) activeTouches.set(t.identifier, zone);
    recomputeAxis();
  });

  // Dragging a finger between the left/right zones updates the axis live.
  // Jump/throw are NOT re-triggered on move (edge-trigger on start only).
  k.onTouchMove((pos, t) => {
    if (!activeTouches.has(t.identifier)) return;
    const zone = hitZone(pos.x, pos.y);
    if (zone === "left" || zone === "right") activeTouches.set(t.identifier, zone);
    else activeTouches.delete(t.identifier);
    recomputeAxis();
  });

  k.onTouchEnd((_pos, t) => {
    activeTouches.delete(t.identifier);
    recomputeAxis();
  });
}
