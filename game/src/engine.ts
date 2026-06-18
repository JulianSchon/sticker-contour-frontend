import kaplay from "kaplay";
import type { KAPLAYCtx } from "kaplay";
import { GAME_WIDTH, GAME_HEIGHT } from "./config";

let ctx: KAPLAYCtx | null = null;

export function initEngine(root: HTMLElement): KAPLAYCtx {
  if (ctx) throw new Error("initEngine() called more than once");
  ctx = kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    letterbox: true,
    global: false,
    touchToMouse: false,
    pixelDensity: Math.min(window.devicePixelRatio, 2),
    background: [135, 183, 255],
    root,
  });

  // Kaplay binds keyboard events to the canvas, so it must hold focus for
  // controls to work — and its pointer handler preventDefaults, which blocks
  // the browser's native focus-on-click. Explicitly refocus on pointer-down so
  // clicking the game restores keyboard control. Scoped to the canvas so we
  // never hijack the host page's keyboard.
  const canvas = root.querySelector("canvas") as HTMLCanvasElement | null;
  if (canvas) {
    canvas.style.outline = "none";
    canvas.addEventListener("pointerdown", () => canvas.focus());
    canvas.focus();
  }

  return ctx;
}

