import type { KAPLAYCtx } from "kaplay";

// In WordPress, window.NIMSTICK_GAME_BASE points at the plugin's dist/ folder.
// In dev/preview it is undefined, so assets resolve relative to the page root.
// NOTE: "stickan-idle" is intentionally backed by stickan-wave.png (placeholder).
// When real art is added, give idle its own file and update this mapping.
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
  k.loadSprite("stickan-think", BASE + "sprites/stickan-think.png");

  k.loadSound("jump", BASE + "sfx/jump.wav");
  k.loadSound("throw", BASE + "sfx/throw.wav");
  k.loadSound("stomp", BASE + "sfx/stomp.wav");
  k.loadSound("coin", BASE + "sfx/coin.wav");
  k.loadSound("hurt", BASE + "sfx/hurt.wav");
  k.loadSound("peel", BASE + "sfx/peel.wav");
}
