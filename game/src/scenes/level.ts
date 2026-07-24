import type { KAPLAYCtx, GameObj, Vec2 } from "kaplay";
import { TILE_SIZE, ENEMY, GAME_WIDTH, GAME_HEIGHT, GRAVITY } from "../config";
import { InputState, consumePress } from "../systems/input";
import {
  RunState, loseHeart, addScore, isGameOver, addMagic, freeHostage, allHostagesFreed,
} from "../systems/progress";
import { getLevel } from "../levels";
import { makePlayer } from "../entities/player";
import { makeMopJanitor, makeBroomGranny, defeatEnemy } from "../entities/enemies";
import { makeBoss } from "../entities/boss";
import { makeStickerCoin } from "../entities/props";
import { makeHostage } from "../entities/hostage";
import { castStickerStorm } from "../systems/magic";
import { addHud } from "../ui/hud";
import { play } from "../systems/audio";
import { GROUND_TILE_COUNT } from "../assets";

type BodyObj = GameObj & { vel: Vec2; jump: (force?: number) => void };

export function registerLevelScene(k: KAPLAYCtx, input: InputState, getRun: () => RunState): void {
  k.scene("level", () => {
    const run = getRun();
    const def = getLevel(run.levelId);
    k.setGravity(GRAVITY);
    run.hostagesFreed = 0;

    k.add([k.sprite("bg-city"), k.pos(0, 0), k.fixed(), k.z(-100)]);

    const bottomY = def.map.length * TILE_SIZE;
    const camY = bottomY - GAME_HEIGHT / 2;
    const levelWidth = Math.max(...def.map.map((r) => r.length)) * TILE_SIZE;

    let respawn = { x: 100, y: 100 };

    k.addLevel(def.map, {
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      tiles: {
        "=": () => [k.sprite(`ground-${Math.floor(Math.random() * GROUND_TILE_COUNT)}`), k.area(), k.body({ isStatic: true }), k.anchor("botleft"), "ground"],
        "^": () => [k.rect(TILE_SIZE, 8), k.color(200, 40, 40), k.opacity(0), k.area(), k.anchor("botleft"), "pit"],
        "s": () => [k.anchor("center"), "coinmark"],
        "@": () => [k.anchor("botleft"), "spawnmark"],
        "j": () => [k.anchor("botleft"), "janimark"],
        "g": () => [k.anchor("botleft"), "granmark"],
        "H": () => [k.anchor("bot"), "hostmark"],
        "G": () => [k.rect(TILE_SIZE, TILE_SIZE), k.color(150, 40, 200), k.opacity(0.9), k.outline(3, k.rgb(255, 255, 255)), k.area(), k.body({ isStatic: true }), k.anchor("botleft"), "gate"],
        "B": () => [k.anchor("botleft"), "bossmark"],
      },
    });

    const player = { obj: null as unknown as GameObj };
    const targetX = () => (player.obj ? player.obj.pos.x : 0);

    const at = (o: GameObj) => ({ x: o.pos.x, y: o.pos.y });
    k.get("spawnmark", { recursive: true }).forEach((o: GameObj) => { respawn = { x: o.pos.x, y: o.pos.y - 6 }; });
    k.get("janimark", { recursive: true }).forEach((o: GameObj) => makeMopJanitor(k, at(o), targetX));
    k.get("granmark", { recursive: true }).forEach((o: GameObj) => makeBroomGranny(k, at(o), targetX));
    k.get("coinmark", { recursive: true }).forEach((o: GameObj) => makeStickerCoin(k, at(o)));

    const hostmarks = k.get("hostmark", { recursive: true });
    run.hostagesTotal = hostmarks.length;
    hostmarks.forEach((o: GameObj) => makeHostage(k, at(o), () => {
      freeHostage(run);
      addScore(run, 200);
      addMagic(run);
      play("peel");
    }));

    k.get("bossmark", { recursive: true }).forEach((o: GameObj) =>
      makeBoss(k, at(o), () => k.wait(0.6, () => k.go("reward"))),
    );

    player.obj = makePlayer(k, input, respawn, run).obj;
    const p = player.obj;
    k.setCamScale(1);
    p.onUpdate(() => {
      const half = GAME_WIDTH / 2;
      const cx = Math.max(half, Math.min(levelWidth - half, p.pos.x));
      k.setCamPos(cx, camY);
    });

    addHud(k, run);

    const killY = bottomY + 140;

    const hurtPlayer = () => {
      const pl = p as unknown as GameObj & { invuln: number };
      if (pl.invuln > 0) return;
      pl.invuln = 1.5;
      loseHeart(run);
      play("hurt");
      k.shake(8);
      if (isGameOver(run)) k.wait(0.4, () => k.go("gameover"));
    };

    const respawnPlayer = () => {
      const pb = p as unknown as BodyObj;
      p.pos = k.vec2(respawn.x, respawn.y);
      pb.vel.y = 0;
      pb.vel.x = 0;
      (p as unknown as { vx: number }).vx = 0;
    };

    p.onCollide("enemy", (e: GameObj) => {
      const pb = p as unknown as BodyObj;
      const falling = pb.vel.y > 0;
      const above = p.pos.y < e.pos.y - 10;
      if (falling && above) {
        if (e.is("boss")) {
          const b = e as unknown as GameObj & { charging: boolean; takeHit: () => void };
          if (!b.charging) { b.takeHit(); pb.jump(ENEMY.stompBounce); play("stomp"); }
          else hurtPlayer();
        } else {
          defeatEnemy(k, e); pb.jump(ENEMY.stompBounce); play("stomp"); addScore(run, 100);
        }
      } else {
        hurtPlayer();
      }
    });

    p.onCollide("hazard", (h: GameObj) => {
      const pl = p as unknown as GameObj & { invuln: number };
      if (pl.invuln <= 0) {
        const pb = p as unknown as BodyObj;
        const dir = Math.sign(p.pos.x - h.pos.x) || 1;
        pb.vel.y = -300;
        p.pos.x += dir * 24;
        (p as unknown as { vx: number }).vx = 0;
      }
      hurtPlayer();
    });

    p.onCollide("pit", () => { hurtPlayer(); if (!isGameOver(run)) respawnPlayer(); });

    p.onCollide("coin", (c: GameObj) => {
      k.destroy(c); addScore(run, 50); addMagic(run); play("coin");
    });

    // Touch a caged hostage to free it (throwing at it also works, below).
    p.onCollide("hostagezone", (cage: GameObj) => cage.trigger("free"));

    // Free hostages by hitting the cage with a thrown sticker.
    k.onCollide("projectile", "hostage", (proj: GameObj, cage: GameObj) => {
      cage.trigger("free");
      k.destroy(proj);
    });

    // Ninja magic (screen clear) on the magic button.
    p.onUpdate(() => {
      if (consumePress(input, "magic")) castStickerStorm(k, run);
    });

    // Open the boss gate once every hostage is freed.
    p.onUpdate(() => {
      if (allHostagesFreed(run)) {
        const gates = k.get("gate");
        if (gates.length > 0) {
          gates.forEach((gate: GameObj) => {
            k.add([
              k.text("GATE OPEN", { size: 24 }),
              k.pos(gate.pos.x, gate.pos.y - TILE_SIZE - 20),
              k.anchor("center"), k.color(80, 255, 120),
              k.opacity(1), k.lifespan(1, { fade: 0.5 }), k.z(30),
            ]);
            k.destroy(gate);
          });
        }
      }
    });

    // Safety net: falling out of the level costs a heart and respawns.
    p.onUpdate(() => {
      if (p.pos.y > killY) { hurtPlayer(); respawnPlayer(); }
    });
  });
}
