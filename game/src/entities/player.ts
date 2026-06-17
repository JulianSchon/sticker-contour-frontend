import type { GameObj, KAPLAYCtx } from "kaplay";
import { PLAYER, PROJECTILE } from "../config";
import { InputState, consumePress } from "../systems/input";
import { makeProjectile } from "./projectile";

type PlayerObj = GameObj & {
  facing: number;
  coyote: number;
  throwTimer: number;
  invuln: number;
  currentSprite: string;
};

export interface PlayerHandle {
  obj: PlayerObj;
}

export function makePlayer(
  k: KAPLAYCtx,
  input: InputState,
  spawn: { x: number; y: number },
): PlayerHandle {
  const player = k.add([
    k.sprite("stickan-idle"),
    k.pos(spawn.x, spawn.y),
    k.anchor("center"),
    k.area({ scale: 0.8 }),
    k.body({ maxVelocity: PLAYER.maxFallSpeed }),
    k.scale(0.5),
    k.opacity(1),
    k.z(10),
    "player",
    { facing: 1, coyote: 0, throwTimer: 0, invuln: 0, currentSprite: "stickan-idle" },
  ]) as unknown as PlayerObj;

  const swapSprite = (name: string) => {
    if (player.currentSprite !== name) {
      player.use(k.sprite(name));
      player.currentSprite = name;
    }
  };

  player.onUpdate(() => {
    const dt = k.dt();

    player.move(input.moveX * PLAYER.speed, 0);
    if (input.moveX !== 0) {
      player.facing = input.moveX > 0 ? 1 : -1;
      player.flipX = player.facing < 0;
    }

    if (player.isGrounded()) player.coyote = PLAYER.coyoteTime;
    else player.coyote = Math.max(0, player.coyote - dt);

    if (consumePress(input, "jump") && player.coyote > 0) {
      player.jump(PLAYER.jumpForce);
      player.coyote = 0;
    }

    player.throwTimer = Math.max(0, player.throwTimer - dt);
    if (consumePress(input, "throw") && player.throwTimer === 0) {
      player.throwTimer = PLAYER.throwCooldown;
      makeProjectile(k, {
        x: player.pos.x + player.facing * 30,
        y: player.pos.y,
        dir: player.facing,
        speed: PROJECTILE.speed,
      });
    }

    if (!player.isGrounded()) swapSprite("stickan-jump");
    else if (input.moveX !== 0) swapSprite("stickan-run");
    else swapSprite("stickan-idle");

    player.invuln = Math.max(0, player.invuln - dt);
    player.opacity = player.invuln > 0 ? 0.5 : 1;
  });

  return { obj: player };
}
