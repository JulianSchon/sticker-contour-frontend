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
  return ctx;
}

