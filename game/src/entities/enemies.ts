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
  phase?: "walk" | "idle";
  phaseTimer?: number;
};

// Alternate between walking and pausing so enemies don't pace non-stop.
// Returns true while in the walk phase. Randomized so multiple enemies desync.
function tickPhase(e: EnemyObj, dt: number): boolean {
  e.phaseTimer = (e.phaseTimer ?? 0) - dt;
  if (e.phaseTimer <= 0) {
    if (e.phase === "idle") {
      e.phase = "walk";
      e.phaseTimer = 1.6 + Math.random() * 1.8;
    } else {
      e.phase = "idle";
      e.phaseTimer = 0.9 + Math.random() * 1.4;
    }
  }
  return e.phase === "walk";
}

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
function ensureAnim(e: EnemyObj, name: string) {
  if (e.curAnim !== name) {
    e.play(name);
    e.curAnim = name;
  }
}

function setScale(e: EnemyObj, s: number): void {
  (e as unknown as { scaleTo: (x: number) => void }).scaleTo(s);
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
    { dir: -1, hp: 1, puddleTimer: ENEMY.janitorPuddleInterval, homeX: at.x, phase: "walk", phaseTimer: 0.5 + Math.random() * 2 },
  ]) as unknown as EnemyObj;

  e.onUpdate(() => {
    if (tickPhase(e, k.dt())) {
      ensureAnim(e, "run");
      e.move(e.dir * ENEMY.janitorSpeed, 0);
      e.flipX = e.dir < 0; // art faces right; mirror when moving left
      setScale(e, 0.39); // 30% bigger while running
      patrol(e, 110);
    } else {
      ensureAnim(e, "idle");
      setScale(e, 0.3);
    }
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
 * A broom granny: slower, tougher (2 hp). Periodically hurls a dust ball — a
 * "hazard"-tagged projectile that flies in her facing direction, which the
 * level scene's hazard handler turns into player damage.
 */
function shootDustBall(k: KAPLAYCtx, e: EnemyObj): void {
  const dir = e.dir;
  const ball = k.add([
    k.circle(13),
    k.color(168, 150, 120),       // dusty tan
    k.outline(3, k.rgb(70, 55, 40)),
    k.pos(e.pos.x + dir * 30, e.pos.y - 46),
    k.anchor("center"),
    k.area({ scale: 0.8 }),
    k.offscreen({ destroy: true }),
    k.lifespan(ENEMY.grannyShotLifetime),
    k.z(7),
    "hazard",
  ]);
  ball.onUpdate(() => ball.move(dir * ENEMY.grannyShotSpeed, 0));
}

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
    { dir: -1, hp: 2, swipeTimer: ENEMY.grannySwipeInterval, homeX: at.x, phase: "walk", phaseTimer: 0.5 + Math.random() * 2 },
  ]) as unknown as EnemyObj;

  e.onUpdate(() => {
    if (tickPhase(e, k.dt())) {
      ensureAnim(e, "run");
      e.move(e.dir * ENEMY.grannySpeed, 0);
      e.flipX = e.dir < 0; // art faces right; mirror when moving left
      setScale(e, 0.416); // 30% bigger while running
      patrol(e, 90);
    } else {
      ensureAnim(e, "idle");
      setScale(e, 0.32);
    }
    e.swipeTimer = (e.swipeTimer ?? ENEMY.grannySwipeInterval) - k.dt();
    if (e.swipeTimer <= 0) {
      e.swipeTimer = ENEMY.grannySwipeInterval;
      shootDustBall(k, e);
    }
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
