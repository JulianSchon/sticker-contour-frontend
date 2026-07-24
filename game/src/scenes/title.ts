import type { KAPLAYCtx, GameObj, TextComp } from "kaplay";
import { RunState, createRun } from "../systems/progress";
import { onAnyProceed } from "./sceneUtils";
import { isMuted, toggleMute } from "../systems/audio";

export function registerTitleScene(k: KAPLAYCtx, setRun: (r: RunState) => void): void {
  k.scene("title", () => {
    const cx = k.center().x;
    k.add([k.rect(k.width(), k.height()), k.color(135, 183, 255)]);
    k.add([k.text("Stickan: Sticker Shinobi", { size: 48 }), k.pos(cx, 70), k.anchor("center")]);
    k.add([k.sprite("stickan", { anim: "idle" }), k.pos(cx, 210), k.anchor("center"), k.scale(0.95)]);
    k.add([k.text("Press SPACE / tap to play", { size: 28 }), k.pos(cx, 360), k.anchor("center")]);

    // Controls
    const line = (txt: string, y: number, size = 22) =>
      k.add([k.text(txt, { size }), k.pos(cx, y), k.anchor("center"), k.opacity(0.95)]);
    line("CONTROLS", 430, 24);
    line("Move: ← →   Crouch: ↓   Aim up: ↑", 468);
    line("Jump: Space     Throw: X / J", 500);
    line("Ninja magic: C / Shift", 532);
    if (k.isTouchscreen()) {
      line("On touch: use the on-screen buttons", 564, 20);
    }

    const muteLabel = k.add([
      k.text(`Press A: Album      Press M: Sound ${isMuted() ? "OFF" : "ON"}`, { size: 22 }),
      k.pos(cx, 620),
      k.anchor("center"),
    ]) as GameObj<TextComp>;

    k.onKeyPress("m", () => {
      toggleMute();
      muteLabel.text = `Press A: Album      Press M: Sound ${isMuted() ? "OFF" : "ON"}`;
    });

    const start = () => { setRun(createRun()); k.go("level"); };
    onAnyProceed(k, start);
    k.onKeyPress("a", () => k.go("album"));
  });
}
