import type { KAPLAYCtx, GameObj, TextComp } from "kaplay";
import { RunState, createRun } from "../systems/progress";
import { onAnyProceed } from "./sceneUtils";
import { isMuted, toggleMute } from "../systems/audio";

export function registerTitleScene(k: KAPLAYCtx, setRun: (r: RunState) => void): void {
  k.scene("title", () => {
    k.add([k.rect(k.width(), k.height()), k.color(135, 183, 255)]);
    k.add([k.sprite("stickan", { anim: "idle" }), k.pos(k.center().x, 260), k.anchor("center"), k.scale(1.0)]);
    k.add([k.text("Stickan's Sticker Run", { size: 52 }), k.pos(k.center().x, 90), k.anchor("center")]);
    k.add([k.text("Press SPACE / tap to play", { size: 26 }), k.pos(k.center().x, 480), k.anchor("center")]);
    k.add([k.text("Press A for album", { size: 22 }), k.pos(k.center().x, 530), k.anchor("center")]);

    const muteLabel = k.add([
      k.text(`Press M: Sound ${isMuted() ? "OFF" : "ON"}`, { size: 22 }),
      k.pos(k.center().x, 580),
      k.anchor("center"),
    ]) as GameObj<TextComp>;

    k.onKeyPress("m", () => {
      toggleMute();
      muteLabel.text = `Press M: Sound ${isMuted() ? "OFF" : "ON"}`;
    });

    const start = () => { setRun(createRun()); k.go("level"); };
    onAnyProceed(k, start);
    k.onKeyPress("a", () => k.go("album"));
  });
}
