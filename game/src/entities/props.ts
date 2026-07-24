import type { GameObj, KAPLAYCtx } from "kaplay";

interface SpawnAt { x: number; y: number; }

type CoinObj = GameObj & { baseY: number; t: number };

/** Floating spinning-dragon pickup worth score; destroyed on player pickup by the level scene. */
export function makeStickerCoin(k: KAPLAYCtx, at: SpawnAt): GameObj {
  const c = k.add([
    k.sprite("spincoin", { anim: "spin" }),
    k.scale(0.42),
    k.pos(at.x, at.y),
    k.anchor("center"),
    k.area({ scale: 0.8 }),
    k.z(6),
    "coin",
    { baseY: at.y, t: 0 },
  ]) as unknown as CoinObj;
  c.onUpdate(() => {
    c.t += k.dt();
    c.pos.y = c.baseY + Math.sin(c.t * 3) * 6;
  });
  return c;
}
