import type { KAPLAYCtx, GameObj, Vec2 } from "kaplay";
import { TILE_SIZE, ENEMY, GAME_HEIGHT, GRAVITY } from "../config";
import { InputState } from "../systems/input";
import { RunState, loseHeart, addScore, isGameOver } from "../systems/progress";
import { getLevel } from "../levels";
import { makePlayer } from "../entities/player";
import { makeMopJanitor, makeBroomGranny, defeatEnemy } from "../entities/enemies";
import { makeBoss } from "../entities/boss";
import { makeStickerCoin, makeCheckpoint, makeGoal } from "../entities/props";
import { addHud } from "../ui/hud";
import { play } from "../systems/audio";

// Augment GameObj with physics body fields accessed in this scene.
type BodyObj = GameObj & { vel: Vec2; jump: (force?: number) => void };
// Augment GameObj with ScaleComp + ColorComp fields accessed in this scene.
type ScaleColorObj = GameObj & { scale: Vec2; color: ReturnType<KAPLAYCtx["rgb"]> };

export function registerLevelScene(k: KAPLAYCtx, input: InputState, getRun: () => RunState): void {
  k.scene("level", () => {
    const run = getRun();
    const def = getLevel(run.levelId);
    k.setGravity(GRAVITY);

    let respawn = { x: 100, y: 100 };

    k.addLevel(def.map, {
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      tiles: {
        "=": () => [k.rect(TILE_SIZE, TILE_SIZE), k.color(90, 70, 50), k.area(), k.body({ isStatic: true }), k.anchor("botleft"), "ground"],
        "|": () => [k.rect(TILE_SIZE, TILE_SIZE), k.color(70, 55, 40), k.area(), k.body({ isStatic: true }), k.anchor("botleft"), "wall"],
        "^": () => [k.rect(TILE_SIZE, 8), k.color(200, 40, 40), k.opacity(0), k.area(), k.anchor("botleft"), "pit"],
        "s": () => [k.anchor("center"), "coinmark"],
        "c": () => [k.anchor("botleft"), "checkmark"],
        "@": () => [k.anchor("botleft"), "spawnmark"],
        ">": () => [k.anchor("botleft"), "goalmark"],
        "j": () => [k.anchor("botleft"), "janimark"],
        "g": () => [k.anchor("botleft"), "granmark"],
        "B": () => [k.anchor("botleft"), "bossmark"],
      },
    });

    // Tile objects are children of the level GameObj; use recursive get to find them.
    const at = (o: GameObj) => ({ x: o.pos.x, y: o.pos.y });
    k.get("spawnmark", { recursive: true }).forEach((o: GameObj) => { respawn = { x: o.pos.x, y: o.pos.y - 40 }; });
    k.get("janimark", { recursive: true }).forEach((o: GameObj) => makeMopJanitor(k, at(o)));
    k.get("granmark", { recursive: true }).forEach((o: GameObj) => makeBroomGranny(k, at(o)));
    k.get("coinmark", { recursive: true }).forEach((o: GameObj) => makeStickerCoin(k, at(o)));
    k.get("checkmark", { recursive: true }).forEach((o: GameObj) => makeCheckpoint(k, at(o)));
    k.get("goalmark", { recursive: true }).forEach((o: GameObj) => makeGoal(k, at(o)));
    k.get("bossmark", { recursive: true }).forEach((o: GameObj) =>
      makeBoss(k, at(o), () => k.wait(0.6, () => k.go("reward"))),
    );

    const player = makePlayer(k, input, respawn).obj;
    k.setCamScale(1);
    player.onUpdate(() => k.setCamPos(player.pos.x, GAME_HEIGHT / 2));

    addHud(k, run);

    // Anything that falls below this Y has left the level entirely.
    const killY = def.map.length * TILE_SIZE + 300;

    const hurtPlayer = () => {
      // player.invuln is a custom field typed on PlayerObj internally.
      const p = player as unknown as GameObj & { invuln: number };
      if (p.invuln > 0) return;
      p.invuln = 1.5;
      loseHeart(run);
      play("hurt");
      k.shake(8);
      if (isGameOver(run)) {
        k.wait(0.4, () => k.go("gameover"));
      }
    };

    const respawnPlayer = () => {
      const pb = player as unknown as BodyObj;
      player.pos = k.vec2(respawn.x, respawn.y);
      pb.vel.y = 0;
      pb.vel.x = 0;
      (player as unknown as { vx: number }).vx = 0;
    };

    player.onCollide("enemy", (e: GameObj) => {
      const pb = player as unknown as BodyObj;
      const falling = pb.vel.y > 0;
      const above = player.pos.y < e.pos.y - 10;
      if (falling && above) {
        if (e.is("boss")) {
          const b = e as unknown as GameObj & { charging: boolean; takeHit: () => void };
          if (!b.charging) {
            b.takeHit();
            pb.jump(ENEMY.stompBounce);
            play("stomp");
          } else {
            hurtPlayer();
          }
        } else {
          defeatEnemy(k, e);
          pb.jump(ENEMY.stompBounce);
          play("stomp");
          addScore(run, 100);
        }
      } else {
        hurtPlayer();
      }
    });

    player.onCollide("hazard", (h: GameObj) => {
      const p = player as unknown as GameObj & { invuln: number };
      if (p.invuln <= 0) {
        const pb = player as unknown as BodyObj;
        const dir = Math.sign(player.pos.x - h.pos.x) || 1;
        pb.vel.y = -300;
        player.pos.x += dir * 24;
        (player as unknown as { vx: number }).vx = 0;
      }
      hurtPlayer();
    });
    player.onCollide("pit", () => {
      hurtPlayer();
      if (!isGameOver(run)) respawnPlayer();
    });
    player.onCollide("coin", (c: GameObj) => {
      k.destroy(c);
      addScore(run, 50);
      play("coin");
    });
    player.onCollide("checkpoint", (cp: GameObj) => {
      const c = cp as GameObj & { active: boolean };
      if (!c.active) {
        c.active = true;
        (cp as unknown as ScaleColorObj).color = k.rgb(255, 212, 0);
      }
      respawn = { x: cp.pos.x, y: cp.pos.y - 40 };
    });
    player.onCollide("goal", () => k.go("reward"));
    player.onCollideUpdate("puddle", () => {
      (player as unknown as { slip: number }).slip = 0.4;
    });

    // Safety net: if the player falls off the level entirely (e.g. jumping past
    // the goal or off an edge with no pit below), treat it as a fall — lose a
    // heart and respawn, or end the run if it was the last heart.
    player.onUpdate(() => {
      if (player.pos.y > killY) {
        hurtPlayer();
        respawnPlayer();
      }
    });
  });
}
