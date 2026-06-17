import type { KAPLAYCtx } from "kaplay";
import { onAnyProceed } from "./sceneUtils";

export function registerWinScene(k: KAPLAYCtx): void {
  k.scene("win", () => {
    k.add([k.rect(k.width(), k.height()), k.color(20, 20, 30)]);
    k.add([k.text("You beat the Head Cleaner!", { size: 44 }), k.pos(k.center().x, 200), k.anchor("center")]);
    k.add([k.text("Stickan saved the stickers!", { size: 28 }), k.pos(k.center().x, 280), k.anchor("center")]);
    k.add([k.text("Press A for album · SPACE / tap to play again", { size: 22 }), k.pos(k.center().x, k.height() - 80), k.anchor("center")]);
    k.onKeyPress("a", () => k.go("album"));
    onAnyProceed(k, () => k.go("title"));
  });
}
