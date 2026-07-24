import type { KAPLAYCtx, GameObj } from "kaplay";
import { RunState, useMagic } from "./progress";
import { defeatEnemy } from "../entities/enemies";
import { play } from "./audio";

/**
 * Cast the "Sticker Storm": if a charge is available, flash the screen, shake,
 * and clear every on-screen enemy (bosses take a single hit instead of dying).
 * Returns whether it fired.
 */
export function castStickerStorm(k: KAPLAYCtx, run: RunState): boolean {
  if (!useMagic(run)) return false;

  k.add([
    k.rect(k.width(), k.height()),
    k.color(255, 255, 255),
    k.opacity(0.75),
    k.fixed(),
    k.z(200),
    k.lifespan(0.35, { fade: 0.35 }),
  ]);
  k.shake(12);
  play("stomp");

  k.get("enemy").forEach((e: GameObj) => {
    if (e.is("boss")) {
      (e as unknown as { takeHit?: () => void }).takeHit?.();
    } else {
      defeatEnemy(k, e);
    }
  });
  return true;
}
