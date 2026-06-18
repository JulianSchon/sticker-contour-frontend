import type { GameObj, KAPLAYCtx } from "kaplay";
import { ENEMY } from "../config";
import { makePuddle } from "./props";

interface SpawnAt {
  x: number;
  y: number;
}

type EnemyObj = GameObj & {
  dir: number;
  hp: number;
  swipeTimer?: number;
  puddleTimer?: number;
  curAnim?: string;
  homeX?: number;
};

// Patrol within +/- range of the spawn point, reversing only at the bounds and
// only when heading outward — so direction can never oscillate frame-to-frame
// (which previously mirrored the sprite ~60x/sec and looked like a blur).
function patrol(e: EnemyObj, range: number): void {
  const home = e.homeX ?? e.pos.x;
  if (e.dir < 0 && e.pos.x <= home - range) e.dir = 1;
  else if (e.dir > 0 && e.pos.x >= home + range) e.dir = -1;
}

// Re-assert the walk animation every frame (guarded), matching the boss's
// self-healing pattern: if the first play() landed before the sheet loaded
// (or after a hot-reload), the next frame retries instead of leaving the
// sprite cycling all frames.
function ensureRun(e: EnemyObj) {
  if (e.curAnim !== "run") {
    e.play("run");
    e.curAnim = "run";
  }
}

/** A walking janitor: patrols, reverses at walls, dies to stomp or sticker. */
export function makeMopJanitor(k: KAPLAYCtx, at: SpawnAt): GameObj {
  const e = k.add([
    k.sprite("janitor", { anim: "run" }),
    k.scale(0.3),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area({ scale: k.vec2(0.5, 0.7) }),
    k.body(),
    k.z(8),
    "enemy",
    "janitor",
    { dir: -1, hp: 1, puddleTimer: ENEMY.janitorPuddleInterval, homeX: at.x },
  ]) as unknown as EnemyObj;

  e.onUpdate(() => {
    ensureRun(e);
    e.move(e.dir * ENEMY.janitorSpeed, 0);
    e.flipX = e.dir > 0;
    patrol(e, 110);
    e.puddleTimer = (e.puddleTimer ?? ENEMY.janitorPuddleInterval) - k.dt();
    if (e.puddleTimer <= 0) {
      e.puddleTimer = ENEMY.janitorPuddleInterval;
      makePuddle(k, { x: e.pos.x, y: e.pos.y });
    }
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
    k.sprite("granny", { anim: "run" }),
    k.scale(0.32),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area({ scale: k.vec2(0.5, 0.7) }),
    k.body(),
    k.z(8),
    "enemy",
    "granny",
    { dir: -1, hp: 2, swipeTimer: ENEMY.grannySwipeInterval, homeX: at.x },
  ]) as unknown as EnemyObj;

  e.onUpdate(() => {
    ensureRun(e);
    e.move(e.dir * ENEMY.grannySpeed, 0);
    e.flipX = e.dir > 0;
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
    patrol(e, 90);
  });

  e.onCollide("wall", () => { e.dir *= -1; });
  e.onCollide("projectile", () => {
    e.hp -= 1;
    if (e.hp <= 0) defeatEnemy(k, e);
    else k.shake(2);
  });

  return e;
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
