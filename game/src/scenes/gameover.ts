import type { KAPLAYCtx } from "kaplay";
import { onAnyProceed } from "./sceneUtils";

export function registerGameOverScene(k: KAPLAYCtx): void {
  k.scene("gameover", () => {
    k.add([k.rect(k.width(), k.height()), k.color(30, 20, 20)]);
    k.add([k.text("Scrubbed away!", { size: 48 }), k.pos(k.center().x, 240), k.anchor("center")]);
    k.add([k.text("Press SPACE / tap to try again", { size: 24 }), k.pos(k.center().x, 320), k.anchor("center")]);
    onAnyProceed(k, () => k.go("title"));
  });
}
