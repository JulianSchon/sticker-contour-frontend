import type { KAPLAYCtx } from "kaplay";

// Stickan PNGs live in game/public/sprites and are served at /sprites/*.
// NOTE: "stickan-idle" is intentionally backed by stickan-wave.png (placeholder).
// When real art is added, give idle its own file and update this mapping.
export function loadAssets(k: KAPLAYCtx): void {
  k.loadSprite("stickan-idle", "sprites/stickan-wave.png");
  k.loadSprite("stickan-run", "sprites/stickan-run.png");
  k.loadSprite("stickan-jump", "sprites/stickan-jump.png");
  k.loadSprite("stickan-think", "sprites/stickan-think.png");
}
