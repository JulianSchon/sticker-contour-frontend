import type { KAPLAYCtx } from "kaplay";
import { STICKERS } from "../data/stickers";
import { isUnlocked, resetAlbum } from "../systems/save";

export function registerAlbumScene(k: KAPLAYCtx): void {
  k.scene("album", () => {
    k.add([k.rect(k.width(), k.height()), k.color(245, 240, 225)]);
    k.add([k.text("Sticker Album", { size: 44 }), k.pos(k.center().x, 70), k.anchor("center"), k.color(0, 0, 0)]);

    const cols = 4;
    const cell = 160;
    const startX = k.center().x - (cols * cell) / 2 + cell / 2;
    const startY = 200;

    STICKERS.forEach((s, i) => {
      const cx = startX + (i % cols) * cell;
      const cy = startY + Math.floor(i / cols) * cell;
      const got = isUnlocked(s.id);
      k.add([
        k.circle(56),
        got ? k.color(k.Color.fromHex(s.color)) : k.color(200, 200, 200),
        k.outline(5, k.rgb(0, 0, 0)),
        k.pos(cx, cy),
        k.anchor("center"),
        k.opacity(got ? 1 : 0.5),
      ]);
      k.add([
        k.text(got ? s.name : "???", { size: 18 }),
        k.pos(cx, cy + 78),
        k.anchor("center"),
        k.color(0, 0, 0),
      ]);
    });

    k.add([k.text("Press B to go back · R to reset · tap to go back", { size: 20 }), k.pos(k.center().x, k.height() - 50), k.anchor("center"), k.color(0, 0, 0)]);
    k.onKeyPress("b", () => k.go("title"));
    k.onKeyPress("r", () => { resetAlbum(); k.go("album"); });
    k.onMousePress(() => k.go("title"));
    k.onTouchStart(() => k.go("title"));
  });
}
