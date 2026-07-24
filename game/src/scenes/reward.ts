import type { KAPLAYCtx, GameObj, Vec2 } from "kaplay";
import { RunState } from "../systems/progress";
import { onAnyProceed } from "./sceneUtils";
import { getLevel } from "../levels";
import { getSticker } from "../data/stickers";
import { unlock } from "../systems/save";
import { play } from "../systems/audio";

// Local type alias for GameObj with ScaleComp.
type ScaleObj = GameObj & { scale: Vec2 };

export function registerRewardScene(k: KAPLAYCtx, getRun: () => RunState): void {
  k.scene("reward", () => {
    const run = getRun();
    const def = getLevel(run.levelId);
    const sticker = getSticker(def.reward);
    unlock(sticker.id);
    play("peel");

    k.add([k.rect(k.width(), k.height()), k.color(20, 20, 30)]);
    k.add([k.text("Mission complete!", { size: 40 }), k.pos(k.center().x, 140), k.anchor("center")]);
    k.add([k.text("You earned a sticker:", { size: 26 }), k.pos(k.center().x, 210), k.anchor("center")]);

    const badge = k.add([
      k.circle(82),
      k.color(k.Color.fromHex(sticker.color)),
      k.outline(6, k.rgb(0, 0, 0)),
      k.pos(k.center()),
      k.anchor("center"),
      k.scale(0),
    ]) as unknown as ScaleObj;
    const art = k.add([
      k.sprite(sticker.img),
      k.pos(k.center()),
      k.anchor("center"),
      k.scale(0),
      k.z(1),
    ]) as unknown as ScaleObj;

    k.add([k.text(sticker.name, { size: 24 }), k.pos(k.center().x, k.center().y + 120), k.anchor("center")]);
    k.tween(0, 1, 0.5, (v: number) => {
      badge.scale = k.vec2(v);
      art.scale = k.vec2(v * 0.66);
    }, k.easings.easeOutBack);

    k.add([k.text("Press SPACE / tap to finish", { size: 22 }), k.pos(k.center().x, k.height() - 80), k.anchor("center")]);
    onAnyProceed(k, () => k.go("win"));
  });
}
