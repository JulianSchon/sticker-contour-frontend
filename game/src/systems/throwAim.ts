export type ThrowMode = "forward" | "low" | "up" | "air";

/** Choose a throw mode from held aim inputs and whether the player is grounded. */
export function selectThrowMode(
  input: { crouch: boolean; aimUp: boolean },
  grounded: boolean,
): ThrowMode {
  if (input.aimUp) return "up";
  if (!grounded) return "air";
  if (input.crouch) return "low";
  return "forward";
}

/**
 * Velocity + spawn-y-offset for a throw. `dy` is added to the player's feet
 * position (anchor "bot"), so more-negative = higher up the body.
 */
export function throwVector(
  facing: number,
  mode: ThrowMode,
  speed: number,
): { vx: number; vy: number; dy: number } {
  switch (mode) {
    case "up": return { vx: facing * speed * 0.35, vy: -speed * 0.95, dy: -60 };
    case "low": return { vx: facing * speed, vy: 0, dy: -14 };
    case "air": return { vx: facing * speed, vy: 0, dy: -40 };
    case "forward":
    default: return { vx: facing * speed, vy: 0, dy: -40 };
  }
}
