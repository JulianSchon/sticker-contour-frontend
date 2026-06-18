import type { KAPLAYCtx } from "kaplay";

// In WordPress, window.NIMSTICK_GAME_BASE points at the plugin's dist/ folder.
// In dev/preview it is undefined, so assets resolve relative to the page root.
// Sprites are authored as SVG and rasterized to PNG by scripts/gen-art.cjs.
// "stickan-idle" uses the waving pose.
declare global {
  interface Window {
    NIMSTICK_GAME_BASE?: string;
  }
}

const BASE =
  (typeof window !== "undefined" && window.NIMSTICK_GAME_BASE) || "";

export function loadAssets(k: KAPLAYCtx): void {
  k.loadSprite("stickan-idle", BASE + "sprites/stickan-wave.png");
  k.loadSprite("stickan-run", BASE + "sprites/stickan-run.png");
  k.loadSprite("stickan-jump", BASE + "sprites/stickan-jump.png");
  k.loadSprite("janitor", BASE + "sprites/janitor.png");
  k.loadSprite("granny", BASE + "sprites/granny.png");
  k.loadSprite("boss", BASE + "sprites/boss.png");
  k.loadSprite("bg-city", BASE + "sprites/bg-city.png");

  k.loadSound("jump", BASE + "sfx/jump.wav");
  k.loadSound("throw", BASE + "sfx/throw.wav");
  k.loadSound("stomp", BASE + "sfx/stomp.wav");
  k.loadSound("coin", BASE + "sfx/coin.wav");
  k.loadSound("hurt", BASE + "sfx/hurt.wav");
  k.loadSound("peel", BASE + "sfx/peel.wav");
}
