import type { KAPLAYCtx } from "kaplay";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { InputState, press, setAxis } from "./input";

// On-screen touch control geometry (game space, drawn by the HUD).
export const touchUI = {
  joy: { x: 175, y: GAME_HEIGHT - 150, r: 95 },
  knob: { x: 175, y: GAME_HEIGHT - 150 }, // live knob position while dragging
  jump: { x: GAME_WIDTH - 120, y: GAME_HEIGHT - 145, r: 74 },
  shoot: { x: GAME_WIDTH - 285, y: GAME_HEIGHT - 110, r: 62 },
};

// Generic "screen tapped" edge flag, consumed by menus (onAnyProceed). Touch is
// handled with native DOM listeners because Kaplay's onTouchStart proved
// unreliable in embeds; this gives us full control over coordinate mapping.
let tapFlag = false;
export function consumeTap(): boolean {
  const v = tapFlag;
  tapFlag = false;
  return v;
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

export function wireInput(k: KAPLAYCtx, state: InputState): void {
  let joyId: number | null = null;

  // --- Keyboard (native + Kaplay), persists across scenes via stay() ---
  const nativeKeysDown = new Set<string>();
  const canvas = k.canvas as HTMLCanvasElement | undefined;
  if (canvas) {
    canvas.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.repeat) return;
      nativeKeysDown.add(e.code);
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") press(state, "jump");
      if (e.code === "KeyX" || e.code === "KeyJ" || e.code === "ShiftLeft" || e.code === "ShiftRight") press(state, "throw");
    });
    canvas.addEventListener("keyup", (e: KeyboardEvent) => { nativeKeysDown.delete(e.code); });
  }

  k.add([
    k.stay(),
    {
      update() {
        if (joyId !== null) return; // joystick drives the axis when active
        let axis = 0;
        if (k.isKeyDown("left") || k.isKeyDown("a") || nativeKeysDown.has("ArrowLeft") || nativeKeysDown.has("KeyA")) axis -= 1;
        if (k.isKeyDown("right") || k.isKeyDown("d") || nativeKeysDown.has("ArrowRight") || nativeKeysDown.has("KeyD")) axis += 1;
        setAxis(state, axis);
      },
    },
  ]);

  k.onKeyPress(["space", "up", "w"], () => press(state, "jump"));
  k.onKeyPress(["x", "j", "shift"], () => press(state, "throw"));

  // --- Touch: native listeners mapping to game space ---
  const J = touchUI.joy;
  const moveKnob = (gx: number, gy: number) => {
    const dx = gx - J.x;
    const dy = gy - J.y;
    const d = Math.hypot(dx, dy) || 1;
    const clamp = Math.min(1, J.r / d);
    touchUI.knob.x = J.x + dx * clamp;
    touchUI.knob.y = J.y + dy * clamp;
    let axis = (touchUI.knob.x - J.x) / J.r;
    if (Math.abs(axis) < 0.28) axis = 0;
    setAxis(state, axis);
  };
  const releaseJoy = () => {
    joyId = null;
    touchUI.knob.x = J.x;
    touchUI.knob.y = J.y;
    setAxis(state, 0);
  };

  if (canvas) {
    // Map a client (CSS px) point to game coordinates, accounting for letterbox.
    const toGame = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      const s = Math.min(r.width / GAME_WIDTH, r.height / GAME_HEIGHT) || 1;
      const ox = (r.width - GAME_WIDTH * s) / 2;
      const oy = (r.height - GAME_HEIGHT * s) / 2;
      return { x: (clientX - r.left - ox) / s, y: (clientY - r.top - oy) / s };
    };

    canvas.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        tapFlag = true; // any tap proceeds menus
        const g = toGame(t.clientX, t.clientY);
        if (joyId === null && dist(g.x, g.y, J.x, J.y) <= J.r * 1.7) {
          joyId = t.identifier;
          moveKnob(g.x, g.y);
        } else if (dist(g.x, g.y, touchUI.jump.x, touchUI.jump.y) <= touchUI.jump.r) {
          press(state, "jump");
        } else if (dist(g.x, g.y, touchUI.shoot.x, touchUI.shoot.y) <= touchUI.shoot.r) {
          press(state, "throw");
        }
      }
    }, { passive: false });

    canvas.addEventListener("touchmove", (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId) {
          const g = toGame(t.clientX, t.clientY);
          moveKnob(g.x, g.y);
        }
      }
    }, { passive: false });

    const onEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId) releaseJoy();
      }
    };
    canvas.addEventListener("touchend", onEnd);
    canvas.addEventListener("touchcancel", onEnd);
  }
}
