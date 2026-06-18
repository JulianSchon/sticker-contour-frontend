import type { GameObj, KAPLAYCtx } from "kaplay";
import { BOSS, GAME_WIDTH } from "../config";

interface SpawnAt { x: number; y: number; }

type BossObj = GameObj & {
  hp: number;
  dir: number;
  charging: boolean;
  cooldown: number;
  invuln: number;
  takeHit: () => void;
};

/**
 * The Head Cleaner. Cycles idle -> charge across arena -> recover, lobbing a
 * soap bubble at the start of each charge. Takes BOSS.hits sticker hits; calls
 * onDefeat() when destroyed.
 */
export function makeBoss(k: KAPLAYCtx, at: SpawnAt, onDefeat: () => void): GameObj {
  const boss = k.add([
    k.sprite("boss", { anim: "idle" }),
    k.scale(0.4),
    k.color(255, 255, 255),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area({ scale: k.vec2(0.6, 0.7) }),
    k.body(),
    k.z(8),
    "enemy",
    "boss",
    { hp: BOSS.hits, dir: -1, charging: false, cooldown: 1.5, invuln: 0 },
  ]) as unknown as BossObj;

  let currentAnim = "idle";
  const playAnim = (name: string) => {
    if (currentAnim !== name) {
      boss.play(name);
      currentAnim = name;
    }
  };

  boss.onUpdate(() => {
    boss.invuln = Math.max(0, boss.invuln - k.dt());
    const dt = k.dt();
    boss.flipX = boss.dir > 0;
    playAnim(boss.charging ? "charge" : "idle");
    if (boss.charging) {
      boss.move(boss.dir * BOSS.chargeSpeed, 0);
      if (boss.pos.x < 120 || boss.pos.x > GAME_WIDTH - 120) {
        boss.dir *= -1;
        boss.charging = false;
        boss.cooldown = 1.5;
      }
    } else {
      boss.cooldown -= dt;
      if (boss.cooldown <= 0) {
        boss.charging = true;
        spawnBubble(k, boss);
      }
    }
  });

  const applyHit = () => {
    if (boss.invuln > 0) return;
    boss.invuln = 0.4;
    boss.hp -= 1;
    k.shake(6);
    if (boss.hp <= 0) {
      k.destroy(boss);
      onDefeat();
    } else {
      boss.color = k.rgb(255, 90, 90);
      k.wait(0.15, () => { boss.color = k.rgb(255, 255, 255); });
    }
  };

  boss.onCollide("projectile", () => {
    applyHit();
  });

  boss.takeHit = applyHit;

  return boss;
}

function spawnBubble(k: KAPLAYCtx, boss: GameObj): void {
  const b = k.add([
    k.circle(16),
    k.color(180, 220, 255),
    k.opacity(0.7),
    k.outline(2, k.rgb(255, 255, 255)),
    k.pos(boss.pos.x, boss.pos.y - 80),
    k.anchor("center"),
    k.area(),
    k.offscreen({ destroy: true }),
    k.lifespan(3),
    "hazard",
    { dir: (boss as unknown as { dir: number }).dir },
  ]) as unknown as GameObj & { dir: number };
  b.onUpdate(() => b.move(b.dir * BOSS.bubbleSpeed, 0));
}
