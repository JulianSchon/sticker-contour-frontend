import type { KAPLAYCtx, GameObj, TextComp, AreaComp } from "kaplay";
import { GAME_WIDTH, MAGIC } from "../config";
import { RunState } from "../systems/progress";
import { touchUI } from "../systems/inputWiring";
import { isMuted, toggleMute } from "../systems/audio";

/** Hearts + score + magic charges + hostage counter, plus touch controls. */
export function addHud(k: KAPLAYCtx, run: RunState): void {
  const hearts = k.add([k.text("", { size: 32 }), k.pos(24, 20), k.fixed(), k.z(100)]) as GameObj<TextComp>;
  const score = k.add([k.text("", { size: 28 }), k.pos(GAME_WIDTH - 24, 20), k.anchor("topright"), k.fixed(), k.z(100)]) as GameObj<TextComp>;

  // Magic charges: a row of sticker icons that dim when spent.
  k.add([k.text("Magic:", { size: 24 }), k.pos(24, 60), k.fixed(), k.z(100)]);
  for (let i = 0; i < MAGIC.maxCharges; i++) {
    const icon = k.add([
      k.sprite("stickericon"),
      k.pos(140 + i * 42, 74),
      k.anchor("center"),
      k.scale(0.34),
      k.opacity(1),
      k.fixed(),
      k.z(100),
    ]) as GameObj<{ opacity: number }>;
    icon.onUpdate(() => { icon.opacity = i < run.magic ? 1 : 0.22; });
  }

  const hostages = k.add([k.text("", { size: 24 }), k.pos(24, 108), k.fixed(), k.z(100)]) as GameObj<TextComp>;

  hearts.onUpdate(() => { hearts.text = "♥".repeat(run.hearts); });
  score.onUpdate(() => { score.text = `Score: ${run.score}`; });
  hostages.onUpdate(() => { hostages.text = `Freed: ${run.hostagesFreed}/${run.hostagesTotal}`; });

  const mute = k.add([
    k.text(isMuted() ? "Muted" : "Sound", { size: 22 }),
    k.pos(GAME_WIDTH - 24, 56), k.anchor("topright"), k.area(), k.fixed(), k.z(100),
  ]) as GameObj<TextComp & AreaComp>;
  mute.onClick(() => { toggleMute(); mute.text = isMuted() ? "Muted" : "Sound"; });

  if (k.isTouchscreen()) {
    const J = touchUI.joy;
    k.add([k.circle(J.r), k.pos(J.x, J.y), k.anchor("center"), k.color(0, 0, 0), k.opacity(0.2), k.fixed(), k.z(98)]);
    const knob = k.add([
      k.circle(48), k.pos(J.x, J.y), k.anchor("center"), k.color(255, 255, 255),
      k.opacity(0.55), k.outline(4, k.rgb(0, 0, 0)), k.fixed(), k.z(99),
    ]);
    knob.onUpdate(() => { knob.pos = k.vec2(touchUI.knob.x, touchUI.knob.y); });

    const btn = (x: number, y: number, r: number) =>
      k.add([k.circle(r), k.pos(x, y), k.anchor("center"), k.color(0, 0, 0), k.opacity(0.25), k.fixed(), k.z(98)]);

    const jb = touchUI.jump; btn(jb.x, jb.y, jb.r);
    k.add([k.text("JUMP", { size: 26 }), k.pos(jb.x, jb.y), k.anchor("center"), k.opacity(0.85), k.fixed(), k.z(99)]);

    const sb = touchUI.shoot; btn(sb.x, sb.y, sb.r);
    k.add([k.sprite("stickericon"), k.pos(sb.x, sb.y), k.anchor("center"), k.scale(0.42), k.fixed(), k.z(99)]);

    const mb = touchUI.magic; btn(mb.x, mb.y, mb.r);
    k.add([k.text("MAGIC", { size: 20 }), k.pos(mb.x, mb.y), k.anchor("center"), k.opacity(0.85), k.fixed(), k.z(99)]);
  }
}
