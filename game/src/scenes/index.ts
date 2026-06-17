import type { KAPLAYCtx } from "kaplay";
import type { InputState } from "../systems/input";

export function registerScenes(k: KAPLAYCtx, _input: InputState): void {
  k.scene("title", () => {
    k.add([k.text("Stickan's Sticker Run"), k.pos(k.center()), k.anchor("center")]);
  });
}
