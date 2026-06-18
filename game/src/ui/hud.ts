import type { KAPLAYCtx, GameObj, TextComp, AreaComp } from "kaplay";
import { GAME_WIDTH } from "../config";
import { RunState } from "../systems/progress";
import { touchZones } from "../systems/inputWiring";
import { isMuted, toggleMute } from "../systems/audio";

/** Draws hearts + score (fixed to screen) and, on touch devices, button overlays. */
export function addHud(k: KAPLAYCtx, run: RunState): void {
  const hearts = k.add([
    k.text("", { size: 32 }),
    k.pos(24, 20),
    k.fixed(),
    k.z(100),
  ]) as GameObj<TextComp>;

  const score = k.add([
    k.text("", { size: 28 }),
    k.pos(GAME_WIDTH - 24, 20),
    k.anchor("topright"),
    k.fixed(),
    k.z(100),
  ]) as GameObj<TextComp>;

  // Ammo (sticker shots) below the hearts.
  const ammo = k.add([
    k.text("", { size: 24 }),
    k.pos(24, 60),
    k.fixed(),
    k.z(100),
  ]) as GameObj<TextComp>;

  hearts.onUpdate(() => { hearts.text = "♥".repeat(run.hearts); });
  score.onUpdate(() => { score.text = `Score: ${run.score}`; });
  ammo.onUpdate(() => { ammo.text = `Stickers: ${"◆".repeat(run.ammo) || "—"}`; });

  // Mute toggle (clickable on all devices).
  const mute = k.add([
    k.text(isMuted() ? "Muted" : "Sound", { size: 22 }),
    k.pos(GAME_WIDTH - 24, 56),
    k.anchor("topright"),
    k.area(),
    k.fixed(),
    k.z(100),
  ]) as GameObj<TextComp & AreaComp>;

  mute.onClick(() => { toggleMute(); mute.text = isMuted() ? "Muted" : "Sound"; });

  // Touch button overlays only when the device reports touch support.
  if (k.isTouchscreen()) {
    const z = touchZones();
    const drawBtn = (rect: [number, number, number, number], label: string) => {
      k.add([
        k.rect(rect[2], rect[3], { radius: 16 }),
        k.pos(rect[0], rect[1]),
        k.color(0, 0, 0),
        k.opacity(0.25),
        k.fixed(),
        k.z(99),
      ]);
      k.add([
        k.text(label, { size: 40 }),
        k.pos(rect[0] + rect[2] / 2, rect[1] + rect[3] / 2),
        k.anchor("center"),
        k.opacity(0.7),
        k.fixed(),
        k.z(100),
      ]);
    };
    drawBtn(z.left, "←");
    drawBtn(z.right, "→");
    drawBtn(z.jump, "↑");
    drawBtn(z.throw, "●");
  }
}
