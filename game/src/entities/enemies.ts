import type { GameObj, KAPLAYCtx } from "kaplay";
import { ENEMY } from "../config";

interface SpawnAt {
  x: number;
  y: number;
}

type EnemyObj = GameObj & {
  dir: number;
  hp: number;
  swipeTimer?: number;
};

/** A walking janitor: patrols, reverses at walls, dies to stomp or sticker. */
export function makeMopJanitor(k: KAPLAYCtx, at: SpawnAt): GameObj {
  const e = k.add([
    k.rect(48, 56),
    k.color(60, 60, 70),
    k.outline(3, k.rgb(0, 0, 0)),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.body(),
    k.z(8),
    "enemy",
    "janitor",
    { dir: -1, hp: 1 },
  ]) as unknown as EnemyObj;

  e.onUpdate(() => {
    e.move(e.dir * ENEMY.janitorSpeed, 0);
    reverseAtLedge(k, e, 24);
  });

  e.onCollide("wall", () => { e.dir *= -1; });
  e.onCollide("projectile", () => defeatEnemy(k, e));

  return e;
}

/**
 * A broom granny: slower, tougher (2 hp). Periodically performs a telegraphed
 * swipe that spawns a short-lived "hazard"-tagged hitbox in front of her, which
 * the level scene's hazard handler turns into player damage.
 */
export function makeBroomGranny(k: KAPLAYCtx, at: SpawnAt): GameObj {
  const e = k.add([
    k.rect(52, 64),
    k.color(120, 80, 140),
    k.outline(3, k.rgb(0, 0, 0)),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.body(),
    k.z(8),
    "enemy",
    "granny",
    { dir: -1, hp: 2, swipeTimer: ENEMY.grannySwipeInterval },
  ]) as unknown as EnemyObj;

  e.onUpdate(() => {
    e.move(e.dir * ENEMY.grannySpeed, 0);
    e.swipeTimer = (e.swipeTimer ?? ENEMY.grannySwipeInterval) - k.dt();
    if (e.swipeTimer <= 0) {
      e.swipeTimer = ENEMY.grannySwipeInterval;
      const reach = ENEMY.grannySwipeReach;
      const hbX = e.dir > 0 ? e.pos.x + 20 : e.pos.x - reach - 20;
      k.add([
        k.rect(reach, 50),
        k.color(180, 80, 160),
        k.opacity(0.5),
        k.pos(hbX, e.pos.y - 10),
        k.anchor("left"),
        k.area(),
        k.lifespan(0.4, { fade: 0.2 }),
        k.z(7),
        "hazard",
      ]);
    }
    reverseAtLedge(k, e, 26);
  });

  e.onCollide("wall", () => { e.dir *= -1; });
  e.onCollide("projectile", () => {
    e.hp -= 1;
    if (e.hp <= 0) defeatEnemy(k, e);
    else k.shake(2);
  });

  return e;
}

/**
 * Reverse direction at platform edges: probe just ahead of the feet and cast a
 * short ray downward. If nothing is hit (a gap/pit ahead), turn around.
 */
function reverseAtLedge(k: KAPLAYCtx, e: EnemyObj, halfWidth: number): void {
  const origin = k.vec2(e.pos.x + e.dir * (halfWidth + 6), e.pos.y - 4);
  const hit = k.raycast(origin, k.vec2(0, 28));
  if (!hit) e.dir *= -1;
}

/** Shared defeat burst + cleanup. */
export function defeatEnemy(k: KAPLAYCtx, e: GameObj): void {
  if (e.exists()) {
    k.add([
      k.text("POP!", { size: 24 }),
      k.pos(e.pos),
      k.anchor("center"),
      k.color(255, 212, 0),
      k.opacity(1),
      k.lifespan(0.4, { fade: 0.2 }),
      k.move(k.UP, 60),
      k.z(20),
    ]);
    k.destroy(e);
  }
}
