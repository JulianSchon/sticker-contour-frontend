import type { KAPLAYCtx } from "kaplay";
import { RunState, createRun } from "../systems/progress";
import { onAnyProceed } from "./sceneUtils";

export function registerTitleScene(k: KAPLAYCtx, setRun: (r: RunState) => void): void {
  k.scene("title", () => {
    k.add([k.rect(k.width(), k.height()), k.color(135, 183, 255)]);
    k.add([k.sprite("stickan-idle"), k.pos(k.center().x, 260), k.anchor("center"), k.scale(0.7)]);
    k.add([k.text("Stickan's Sticker Run", { size: 52 }), k.pos(k.center().x, 90), k.anchor("center")]);
    k.add([k.text("Press SPACE / tap to play", { size: 26 }), k.pos(k.center().x, 480), k.anchor("center")]);
    k.add([k.text("Press A for album", { size: 22 }), k.pos(k.center().x, 530), k.anchor("center")]);

    const start = () => { setRun(createRun()); k.go("level"); };
    onAnyProceed(k, start);
    k.onKeyPress("a", () => k.go("album"));
  });
}
