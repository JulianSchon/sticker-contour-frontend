import type { GameObj, KAPLAYCtx } from "kaplay";
import { PLAYER, PROJECTILE } from "../config";
import { InputState, consumePress } from "../systems/input";
import { RunState } from "../systems/progress";
import { makeProjectile } from "./projectile";
import { selectThrowMode, throwVector } from "../systems/throwAim";
import { play } from "../systems/audio";

type PlayerObj = GameObj & {
  facing: number;
  coyote: number;
  throwTimer: number;
  invuln: number;
  currentAnim: string;
  vx: number;
  slip: number;
  crouching: boolean;
};

export interface PlayerHandle {
  obj: PlayerObj;
}

const PLAYER_SCALE = 0.62;

export function makePlayer(
  k: KAPLAYCtx,
  input: InputState,
  spawn: { x: number; y: number },
  _run: RunState,
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
    { facing: 1, coyote: 0, throwTimer: 0, invuln: 0, currentAnim: "", vx: 0, slip: 0, crouching: false },
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

    // Crouch halts horizontal movement (plant-and-throw), like Shinobi.
    player.crouching = input.crouch && player.isGrounded();

    const targetVX = player.crouching ? 0 : input.moveX * PLAYER.speed;
    const accel = player.slip > 0 ? PLAYER.slipAccel : PLAYER.groundAccel;
    player.vx += (targetVX - player.vx) * Math.min(1, accel * dt);
    player.move(player.vx, 0);
    player.slip = Math.max(0, player.slip - dt);
    if (input.moveX !== 0 && !player.crouching) {
      player.facing = input.moveX > 0 ? 1 : -1;
      player.flipX = player.facing > 0; // art faces LEFT; mirror when moving right
    }

    if (player.isGrounded()) player.coyote = PLAYER.coyoteTime;
    else player.coyote = Math.max(0, player.coyote - dt);

    if (consumePress(input, "jump") && player.coyote > 0) {
      player.jump(PLAYER.jumpForce);
      player.coyote = 0;
      play("jump");
    }

    // Unlimited aimed throw (mode from held aim inputs + grounded state).
    player.throwTimer = Math.max(0, player.throwTimer - dt);
    if (consumePress(input, "throw") && player.throwTimer === 0) {
      player.throwTimer = PLAYER.throwCooldown;
      const mode = selectThrowMode(input, player.isGrounded());
      const v = throwVector(player.facing, mode, PROJECTILE.speed);
      makeProjectile(k, {
        x: player.pos.x + player.facing * 30,
        y: player.pos.y + v.dy,
        vx: v.vx,
        vy: v.vy,
      });
      play("throw");
    }

    player.invuln = Math.max(0, player.invuln - dt);
    player.opacity = player.invuln > 0 ? 0.5 : 1;

    // Animation state machine (priority: hurt > throw > jump > run > idle).
    // No crouch frame yet — reuse idle while crouching.
    let anim = "idle";
    if (player.invuln > 1.0) anim = "hurt";
    else if (player.throwTimer > PLAYER.throwCooldown - 0.25) anim = "throw";
    else if (!player.isGrounded()) anim = "jump";
    else if (player.vx !== 0 && Math.abs(player.vx) > 5 && !player.crouching) anim = "run";
    playAnim(anim);
  });

  return { obj: player };
}
