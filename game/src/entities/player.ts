import type { GameObj, KAPLAYCtx } from "kaplay";
import { PLAYER, PROJECTILE } from "../config";
import { InputState, consumePress } from "../systems/input";
import { RunState, useAmmo } from "../systems/progress";
import { makeProjectile } from "./projectile";

type PlayerObj = GameObj & {
  facing: number;
  coyote: number;
  throwTimer: number;
  invuln: number;
  currentAnim: string;
  vx: number;
  slip: number;
};

export interface PlayerHandle {
  obj: PlayerObj;
}

const PLAYER_SCALE = 0.62;

export function makePlayer(
  k: KAPLAYCtx,
  input: InputState,
  spawn: { x: number; y: number },
  run: RunState,
): PlayerHandle {
  const player = k.add([
    k.sprite("stickan", { anim: "idle" }),
    k.pos(spawn.x, spawn.y),
    k.anchor("bot"),
    k.area({ scale: k.vec2(0.42, 0.7) }),
    k.body({ maxVelocity: PLAYER.maxFallSpeed }),
    k.scale(PLAYER_SCALE),
    k.opacity(1),
    k.z(10),
    "player",
    // currentAnim starts empty so the state machine's first tick explicitly
    // play()s an anim (otherwise the sprite cycles through ALL sheet frames).
    { facing: 1, coyote: 0, throwTimer: 0, invuln: 0, currentAnim: "", vx: 0, slip: 0 },
  ]) as unknown as PlayerObj;

  const playAnim = (name: string) => {
    if (player.currentAnim !== name) {
      player.play(name);
      player.currentAnim = name;
    }
  };
  playAnim("idle");

  player.onUpdate(() => {
    const dt = k.dt();

    // Momentum-based horizontal movement (slippery on puddles).
    const targetVX = input.moveX * PLAYER.speed;
    const accel = player.slip > 0 ? PLAYER.slipAccel : PLAYER.groundAccel;
    player.vx += (targetVX - player.vx) * Math.min(1, accel * dt);
    player.move(player.vx, 0);
    player.slip = Math.max(0, player.slip - dt);
    if (input.moveX !== 0) {
      player.facing = input.moveX > 0 ? 1 : -1;
      // Art is drawn facing LEFT, so mirror when moving right.
      player.flipX = player.facing > 0;
    }

    if (player.isGrounded()) player.coyote = PLAYER.coyoteTime;
    else player.coyote = Math.max(0, player.coyote - dt);

    if (consumePress(input, "jump") && player.coyote > 0) {
      player.jump(PLAYER.jumpForce);
      player.coyote = 0;
    }

    player.throwTimer = Math.max(0, player.throwTimer - dt);
    if (consumePress(input, "throw") && player.throwTimer === 0 && useAmmo(run)) {
      player.throwTimer = PLAYER.throwCooldown;
      makeProjectile(k, {
        x: player.pos.x + player.facing * 30,
        y: player.pos.y - 40,
        dir: player.facing,
        speed: PROJECTILE.speed,
      });
    }

    player.invuln = Math.max(0, player.invuln - dt);
    player.opacity = player.invuln > 0 ? 0.5 : 1;

    // Animation state machine (priority: hurt > throw > jump > run > idle).
    let anim = "idle";
    if (player.invuln > 1.0) anim = "hurt";
    else if (player.throwTimer > PLAYER.throwCooldown - 0.25) anim = "throw";
    else if (!player.isGrounded()) anim = "jump";
    else if (input.moveX !== 0) anim = "run";
    playAnim(anim);
  });

  return { obj: player };
}
