// Single source of truth for tunable gameplay constants.
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const TILE_SIZE = 64;

export const PLAYER = {
  speed: 320,          // horizontal run speed (px/s)
  jumpForce: 820,      // initial jump impulse
  maxFallSpeed: 1200,
  coyoteTime: 0.1,     // seconds after leaving ground you can still jump
  throwCooldown: 0.35, // seconds between throws
  startHearts: 3,
  groundAccel: 40,     // approach-rate of vx toward target on normal ground (high = snappy)
  slipAccel: 3.5,      // approach-rate of vx toward target on ice/puddle (low = slippery)
};

export const GRAVITY = 2000;

export const PROJECTILE = {
  speed: 700,
  lifetime: 1.2,       // seconds before it despawns
};

export const ENEMY = {
  janitorSpeed: 70,
  grannySpeed: 45,
  grannySwipeInterval: 2.4,
  grannySwipeReach: 90,
  stompBounce: 600,
  janitorPuddleInterval: 2.0, // seconds between puddle drops
};

export const BOSS = {
  hits: 3,
  chargeSpeed: 520,
  bubbleSpeed: 260,
};
