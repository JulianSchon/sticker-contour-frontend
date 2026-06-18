import type { KAPLAYCtx } from "kaplay";

let ctx: KAPLAYCtx | null = null;
let muted = false;

export function initAudio(k: KAPLAYCtx): void {
  ctx = k;
  const stored = localStorage.getItem("nimstick.muted");
  muted = stored === "1";
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): void {
  muted = !muted;
  localStorage.setItem("nimstick.muted", muted ? "1" : "0");
}

export type Sfx = "jump" | "throw" | "stomp" | "coin" | "hurt" | "peel";

export function play(name: Sfx): void {
  if (muted || !ctx) return;
  try {
    ctx.play(name, { volume: 0.6 });
  } catch {
    // Sound not loaded yet; ignore silently.
  }
}
