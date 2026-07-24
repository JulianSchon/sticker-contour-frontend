// Single source of truth for tunable gameplay constants.
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const TILE_SIZE = 64;

export const PLAYER = {
  speed: 340,          // horizontal run speed (px/s)
  jumpForce: 900,      // initial jump impulse
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
  grannySpeed: 45,
  grannySwipeInterval: 2.4,   // seconds between granny dust-ball shots
  grannyShotSpeed: 230,       // px/s horizontal speed of the dust ball
  grannyShotLifetime: 3.5,    // seconds before the dust ball despawns
  stompBounce: 600,
  janitorChaseSpeed: 85,   // rusher advance speed toward player
  grannyThrowRange: 340,   // stop-and-throw distance
  chaseDeadzone: 8,        // px
  flyerSpeed: 60,          // horizontal drift speed of the flying drone
  flyerBob: 20,            // vertical sine-bob amplitude (px)
};

export const BOSS = {
  hits: 8,
  chargeSpeed: 520,
  bubbleSpeed: 260,
};

export const MAGIC = {
  startCharges: 2,
  maxCharges: 3,
};
