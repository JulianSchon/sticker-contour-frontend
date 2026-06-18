import type { GameObj, KAPLAYCtx } from "kaplay";

interface SpawnAt { x: number; y: number; }

type CoinObj = GameObj & { baseY: number; t: number };

/** Floating sticker-coin worth score; destroyed on player pickup by the level scene. */
export function makeStickerCoin(k: KAPLAYCtx, at: SpawnAt): GameObj {
  const c = k.add([
    k.circle(14),
    k.color(255, 212, 0),
    k.outline(3, k.rgb(0, 0, 0)),
    k.pos(at.x, at.y),
    k.anchor("center"),
    k.area(),
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

/** Mid-level checkpoint; the level scene updates the respawn point on overlap. */
export function makeCheckpoint(k: KAPLAYCtx, at: SpawnAt): GameObj {
  return k.add([
    k.rect(12, 64),
    k.color(40, 200, 120),
    k.outline(3, k.rgb(0, 0, 0)),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.z(5),
    "checkpoint",
    { active: false },
  ]);
}

/** Slippery puddle left by a mop janitor; fades out. Tagged "puddle". */
export function makePuddle(k: KAPLAYCtx, at: SpawnAt): GameObj {
  return k.add([
    k.rect(40, 12, { radius: 6 }),
    k.color(80, 140, 220),
    k.opacity(0.45),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.z(4),
    k.lifespan(7, { fade: 1 }),
    "puddle",
  ]);
}

/** Level goal flag; overlap triggers the reward scene. */
export function makeGoal(k: KAPLAYCtx, at: SpawnAt): GameObj {
  // Tall trigger column so the player can't clear it with a jump.
  return k.add([
    k.rect(28, 260),
    k.color(231, 23, 127),
    k.outline(3, k.rgb(0, 0, 0)),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.z(5),
    "goal",
  ]);
}
