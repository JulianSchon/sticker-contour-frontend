import type { GameObj, KAPLAYCtx } from "kaplay";
import { ENEMY } from "../config";
import { chaseDir, grannyShouldThrow } from "../systems/enemyAI";

interface SpawnAt {
  x: number;
  y: number;
}

type EnemyObj = GameObj & {
  dir: number;
  hp: number;
  swipeTimer?: number;
  curAnim?: string;
};

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

/** A rusher janitor: advances toward the player; hurts on contact; dies to a sticker. */
export function makeMopJanitor(k: KAPLAYCtx, at: SpawnAt, targetX: () => number): GameObj {
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
    { dir: -1, hp: 1 },
  ]) as unknown as EnemyObj;

  e.onUpdate(() => {
    const d = chaseDir(e.pos.x, targetX(), ENEMY.chaseDeadzone);
    if (d !== 0) {
      e.dir = d;
      e.move(e.dir * ENEMY.janitorChaseSpeed, 0);
      ensureAnim(e, "run");
      setScale(e, 0.39);
    } else {
      ensureAnim(e, "idle");
      setScale(e, 0.3);
    }
    e.flipX = e.dir < 0; // art faces right; mirror when moving left
  });

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
    k.opacity(1),                 // required by lifespan (it fades opacity)
    k.pos(e.pos.x + dir * 30, e.pos.y - 46),
    k.anchor("center"),
    k.area({ scale: 0.8 }),
    k.offscreen({ destroy: true }),
    k.lifespan(ENEMY.grannyShotLifetime, { fade: 0.3 }),
    k.z(7),
    "hazard",
  ]);
  ball.onUpdate(() => ball.move(dir * ENEMY.grannyShotSpeed, 0));
}

/**
 * A thrower granny: advances until the player is within grannyThrowRange, then
 * stops and lobs dust balls. Two hp.
 */
export function makeBroomGranny(k: KAPLAYCtx, at: SpawnAt, targetX: () => number): GameObj {
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
    { dir: -1, hp: 2, swipeTimer: ENEMY.grannySwipeInterval },
  ]) as unknown as EnemyObj;

  e.onUpdate(() => {
    const tx = targetX();
    const distX = Math.abs(tx - e.pos.x);
    e.dir = tx >= e.pos.x ? 1 : -1;
    e.flipX = e.dir < 0;

    if (grannyShouldThrow(distX, ENEMY.grannyThrowRange)) {
      ensureAnim(e, "idle");
      setScale(e, 0.32);
      e.swipeTimer = (e.swipeTimer ?? ENEMY.grannySwipeInterval) - k.dt();
      if (e.swipeTimer <= 0) {
        e.swipeTimer = ENEMY.grannySwipeInterval;
        shootDustBall(k, e);
      }
    } else {
      e.move(e.dir * ENEMY.grannySpeed, 0);
      ensureAnim(e, "run");
      setScale(e, 0.416);
    }
  });

  e.onCollide("projectile", () => {
    e.hp -= 1;
    if (e.hp <= 0) defeatEnemy(k, e);
    else k.shake(2);
  });

  return e;
}

/**
 * A flying cleaning-drone: hovers above head height, bobbing on a sine wave and
 * drifting toward the player. Because it sits above the standing throw line, the
 * player must aim UP (or jump-throw) to hit it. One hp; hurts on contact (it's
 * tagged "enemy", so the scene's enemy handler applies damage/stomp).
 */
export function makeFlyingEnemy(k: KAPLAYCtx, at: SpawnAt, targetX: () => number): GameObj {
  const e = k.add([
    k.circle(18),
    k.color(150, 160, 180),
    k.outline(3, k.rgb(30, 30, 40)),
    k.pos(at.x, at.y),
    k.anchor("center"),
    k.area({ scale: 1.15 }),
    k.z(8),
    "enemy",
    "flyer",
    { dir: -1, hp: 1, t: 0, baseY: at.y },
  ]) as unknown as GameObj & { dir: number; hp: number; t: number; baseY: number };

  // Spinning rotor on top (sells the "flying").
  const rotor = e.add([
    k.rect(52, 5, { radius: 2 }),
    k.color(70, 70, 90),
    k.outline(2, k.rgb(20, 20, 30)),
    k.pos(0, -22),
    k.anchor("center"),
    k.rotate(0),
  ]) as unknown as GameObj & { angle: number };
  rotor.onUpdate(() => { rotor.angle += 900 * k.dt(); });

  e.add([k.circle(4), k.color(20, 20, 30), k.pos(7, -2), k.anchor("center")]); // eye
  e.add([ // feather duster it carries
    k.rect(7, 18, { radius: 3 }),
    k.color(240, 210, 90),
    k.outline(2, k.rgb(30, 30, 40)),
    k.pos(-15, 12),
    k.anchor("center"),
    k.rotate(20),
  ]);

  e.onUpdate(() => {
    e.t += k.dt();
    const d = chaseDir(e.pos.x, targetX(), 60);
    if (d !== 0) e.dir = d;
    e.pos.x += e.dir * ENEMY.flyerSpeed * k.dt();
    e.pos.y = e.baseY + Math.sin(e.t * 2) * ENEMY.flyerBob;
  });

  e.onCollide("projectile", () => defeatEnemy(k, e));
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
