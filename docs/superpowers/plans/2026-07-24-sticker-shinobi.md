# Sticker Shinobi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the run-right platformer "Stickan's Sticker Run" into a stand-and-fight Shinobi-style ninja mission: aimed sticker throws (forward/low/up/air), rescue-all-hostages-to-unlock-the-boss-gate, and a limited screen-clearing ninja-magic special.

**Architecture:** Reuse the existing Kaplay engine, sprite pipeline, projectile, audio, album/reward, boss, and WordPress packaging. Isolate new *pure* logic into small tested modules (`throwAim.ts`, `enemyAI.ts`, extended `progress.ts`) and new *Kaplay* modules (`entities/hostage.ts`, `systems/magic.ts`). Rebuild the single `level` scene as a hand-authored mission and delete the procedural multi-level generator.

**Tech Stack:** Kaplay 3001, Vite 5, TypeScript 5, Vitest, Playwright. Work in `C:\Users\hulle\sticker-contour-frontend\game`. Commands run from `game/`.

**Branch:** create `feat/sticker-shinobi` off `master` before Task 1.

---

## Design decisions locked in (read before starting)

- **Basic throws are unlimited.** The old `ammo` field is removed; the sticker-icon HUD row is repurposed to show **magic charges**.
- **Throw modes** (chosen by input + grounded state): `up` (aiming up) > `air` (not grounded) > `low` (crouching) > `forward`.
- **Projectiles now carry a velocity vector** `{vx, vy}` (no gravity on projectiles — straight-line flight, shuriken style).
- **Controls change:** Jump is **Space only** (Up/W now mean *aim up*, Down/S mean *crouch*). Throw is **X/J**. Magic is **C/Shift**.
- **Enemies advance toward the player.** Janitor = rusher (walks at you). Granny = thrower (advances until in range, then stops and lobs the dust ball).
- **Boss gate** stays solid until `hostagesFreed === hostagesTotal`, then opens; the boss sits beyond it. Boss defeat → `reward` scene (unchanged) → `win` (single mission, so reward always treats it as last).
- **3 hearts + i-frames** kept exactly as today.

## File structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/systems/input.ts` | Input state + edge/held accessors | Add `crouch`, `aimUp`, `magicQueued`; `"magic"` action |
| `src/systems/throwAim.ts` | **NEW** pure throw-mode + vector math | Create |
| `src/systems/enemyAI.ts` | **NEW** pure chase/throw decisions | Create |
| `src/systems/progress.ts` | Run state | Replace `ammo` with `magic`; add hostage counters + helpers |
| `src/config.ts` | Tunables | Add `MAGIC`, enemy chase/range; drop `ammoMax` |
| `src/entities/projectile.ts` | Thrown sticker | Velocity vector `{vx,vy}` |
| `src/entities/player.ts` | Player controller | Crouch + aimed unlimited throw |
| `src/entities/enemies.ts` | Enemy entities | Chase toward player target |
| `src/entities/hostage.ts` | **NEW** caged buddy | Create |
| `src/systems/magic.ts` | **NEW** Sticker Storm effect | Create |
| `src/levels/index.ts` | Single mission map | Replace generator with one hand-authored mission |
| `src/levels/generate.ts` | (deleted) | Delete |
| `src/levels/validate.ts` | Map validation | New tiles `H`,`G`; require ≥1 hostage + gate |
| `src/scenes/level.ts` | Mission scene | Rebuild: two-way, ambush, hostage-gate, magic |
| `src/ui/hud.ts` | HUD | Magic charges + hostage counter + MAGIC touch button |
| `src/systems/inputWiring.ts` | Keyboard/touch wiring | Crouch/aim/magic; jump=Space; MAGIC button |
| `src/scenes/title.ts` | Title | Retitle + new controls text |

---

### Task 1: Input model — crouch, aim-up, magic

**Files:**
- Modify: `src/systems/input.ts`
- Test: `src/systems/input.test.ts` (exists — add cases)

- [ ] **Step 1: Write failing tests** — append to `src/systems/input.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createInputState, press, consumePress, setCrouch, setAimUp } from "./input";

describe("shinobi input additions", () => {
  it("starts with crouch/aimUp false and magic unqueued", () => {
    const s = createInputState();
    expect(s.crouch).toBe(false);
    expect(s.aimUp).toBe(false);
    expect(consumePress(s, "magic")).toBe(false);
  });

  it("setCrouch / setAimUp store held booleans", () => {
    const s = createInputState();
    setCrouch(s, true);
    setAimUp(s, true);
    expect(s.crouch).toBe(true);
    expect(s.aimUp).toBe(true);
  });

  it("magic is edge-triggered like other actions", () => {
    const s = createInputState();
    press(s, "magic");
    expect(consumePress(s, "magic")).toBe(true);
    expect(consumePress(s, "magic")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd game && npx vitest run src/systems/input.test.ts`
Expected: FAIL — `setCrouch`/`setAimUp` not exported; `crouch` undefined.

- [ ] **Step 3: Implement** — replace `src/systems/input.ts` entirely:

```ts
export type ActionButton = "jump" | "throw" | "magic";

export interface InputState {
  /** -1 (left), 0 (idle), 1 (right). */
  moveX: number;
  /** Held: crouch / aim-down. */
  crouch: boolean;
  /** Held: aim-up. */
  aimUp: boolean;
  jumpQueued: boolean;
  throwQueued: boolean;
  magicQueued: boolean;
}

export function createInputState(): InputState {
  return { moveX: 0, crouch: false, aimUp: false, jumpQueued: false, throwQueued: false, magicQueued: false };
}

export function setAxis(state: InputState, value: number): void {
  state.moveX = Math.max(-1, Math.min(1, value));
}

export function setCrouch(state: InputState, held: boolean): void { state.crouch = held; }
export function setAimUp(state: InputState, held: boolean): void { state.aimUp = held; }

export function press(state: InputState, button: ActionButton): void {
  if (button === "jump") state.jumpQueued = true;
  else if (button === "throw") state.throwQueued = true;
  else state.magicQueued = true;
}

/** Returns whether the action was queued, and clears the queue (edge-trigger). */
export function consumePress(state: InputState, button: ActionButton): boolean {
  if (button === "jump") { const was = state.jumpQueued; state.jumpQueued = false; return was; }
  if (button === "throw") { const was = state.throwQueued; state.throwQueued = false; return was; }
  const was = state.magicQueued; state.magicQueued = false; return was;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd game && npx vitest run src/systems/input.test.ts`
Expected: PASS (all input tests).

- [ ] **Step 5: Commit**

```bash
git add game/src/systems/input.ts game/src/systems/input.test.ts
git commit -m "feat: input state for crouch, aim-up, and magic"
```

---

### Task 2: Throw-aim math (pure)

**Files:**
- Create: `src/systems/throwAim.ts`
- Create: `src/systems/throwAim.test.ts`

- [ ] **Step 1: Write failing test** — `src/systems/throwAim.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { selectThrowMode, throwVector } from "./throwAim";

describe("selectThrowMode", () => {
  it("prioritises aim-up over everything", () => {
    expect(selectThrowMode({ crouch: true, aimUp: true }, true)).toBe("up");
    expect(selectThrowMode({ crouch: false, aimUp: true }, false)).toBe("up");
  });
  it("returns air when not grounded (and not aiming up)", () => {
    expect(selectThrowMode({ crouch: true, aimUp: false }, false)).toBe("air");
  });
  it("returns low when crouching on the ground", () => {
    expect(selectThrowMode({ crouch: true, aimUp: false }, true)).toBe("low");
  });
  it("returns forward otherwise", () => {
    expect(selectThrowMode({ crouch: false, aimUp: false }, true)).toBe("forward");
  });
});

describe("throwVector", () => {
  it("forward goes straight in facing direction", () => {
    const v = throwVector(1, "forward", 700);
    expect(v.vx).toBe(700);
    expect(v.vy).toBe(0);
  });
  it("left facing negates vx", () => {
    expect(throwVector(-1, "forward", 700).vx).toBe(-700);
  });
  it("up mostly rises with a slight forward lean and higher spawn", () => {
    const v = throwVector(1, "up", 700);
    expect(v.vy).toBeLessThan(0);
    expect(v.vx).toBeGreaterThan(0);
    expect(v.vx).toBeLessThan(700);
    expect(v.dy).toBeLessThan(-40);
  });
  it("low spawns near the ground", () => {
    expect(throwVector(1, "low", 700).dy).toBeGreaterThan(-40);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd game && npx vitest run src/systems/throwAim.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/systems/throwAim.ts`:

```ts
export type ThrowMode = "forward" | "low" | "up" | "air";

/** Choose a throw mode from held aim inputs and whether the player is grounded. */
export function selectThrowMode(
  input: { crouch: boolean; aimUp: boolean },
  grounded: boolean,
): ThrowMode {
  if (input.aimUp) return "up";
  if (!grounded) return "air";
  if (input.crouch) return "low";
  return "forward";
}

/**
 * Velocity + spawn-y-offset for a throw. `dy` is added to the player's feet
 * position (anchor "bot"), so more-negative = higher up the body.
 */
export function throwVector(
  facing: number,
  mode: ThrowMode,
  speed: number,
): { vx: number; vy: number; dy: number } {
  switch (mode) {
    case "up": return { vx: facing * speed * 0.35, vy: -speed * 0.95, dy: -60 };
    case "low": return { vx: facing * speed, vy: 0, dy: -14 };
    case "air": return { vx: facing * speed, vy: 0, dy: -40 };
    case "forward":
    default: return { vx: facing * speed, vy: 0, dy: -40 };
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd game && npx vitest run src/systems/throwAim.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add game/src/systems/throwAim.ts game/src/systems/throwAim.test.ts
git commit -m "feat: pure throw-aim mode selection and vector math"
```

---

### Task 3: Enemy AI decisions (pure)

**Files:**
- Create: `src/systems/enemyAI.ts`
- Create: `src/systems/enemyAI.test.ts`

- [ ] **Step 1: Write failing test** — `src/systems/enemyAI.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { chaseDir, grannyShouldThrow } from "./enemyAI";

describe("chaseDir", () => {
  it("moves right toward a target to the right", () => {
    expect(chaseDir(100, 400, 20)).toBe(1);
  });
  it("moves left toward a target to the left", () => {
    expect(chaseDir(400, 100, 20)).toBe(-1);
  });
  it("stops inside the deadzone", () => {
    expect(chaseDir(200, 210, 20)).toBe(0);
  });
});

describe("grannyShouldThrow", () => {
  it("throws when the player is within range", () => {
    expect(grannyShouldThrow(200, 320)).toBe(true);
  });
  it("does not throw when out of range", () => {
    expect(grannyShouldThrow(500, 320)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd game && npx vitest run src/systems/enemyAI.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/systems/enemyAI.ts`:

```ts
/** Direction (-1/0/1) an enemy should move to approach targetX, with a deadzone. */
export function chaseDir(selfX: number, targetX: number, deadzone: number): number {
  const d = targetX - selfX;
  if (Math.abs(d) <= deadzone) return 0;
  return d > 0 ? 1 : -1;
}

/** A thrower stops and attacks when the player is within `range` horizontal px. */
export function grannyShouldThrow(distX: number, range: number): boolean {
  return distX <= range;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd game && npx vitest run src/systems/enemyAI.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add game/src/systems/enemyAI.ts game/src/systems/enemyAI.test.ts
git commit -m "feat: pure enemy chase/throw decision helpers"
```

---

### Task 4: Progress — magic charges + hostage counters

**Files:**
- Modify: `src/config.ts`
- Modify: `src/systems/progress.ts`
- Test: `src/systems/progress.test.ts` (exists — replace ammo cases)

- [ ] **Step 1: Add config** — in `src/config.ts`, replace the `PLAYER` block's `ammoMax` line and add a `MAGIC` block + enemy tunables. Change these exact lines:

Remove from `PLAYER`:
```ts
  ammoMax: 3,          // sticker shots; pickups replenish, capped here
```

Add after the `ENEMY` block's existing fields (inside the object), keeping the existing granny shot fields:
```ts
  janitorChaseSpeed: 85,   // rusher advance speed toward player
  grannyThrowRange: 340,   // stop-and-throw distance
  ambushSpeed: 110,        // speed of ambush rushers entering from screen edges
```

Add a new exported block at the end of `src/config.ts`:
```ts
export const MAGIC = {
  startCharges: 2,
  maxCharges: 3,
};
```

- [ ] **Step 2: Write failing tests** — replace ammo-related cases in `src/systems/progress.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import {
  createRun, useMagic, addMagic, freeHostage, allHostagesFreed,
  loseHeart, isGameOver, addScore,
} from "./progress";
import { MAGIC } from "../config";

describe("magic charges", () => {
  it("starts with MAGIC.startCharges", () => {
    expect(createRun().magic).toBe(MAGIC.startCharges);
  });
  it("useMagic consumes one and fails at zero", () => {
    const run = createRun();
    run.magic = 1;
    expect(useMagic(run)).toBe(true);
    expect(run.magic).toBe(0);
    expect(useMagic(run)).toBe(false);
  });
  it("addMagic refills capped at maxCharges", () => {
    const run = createRun();
    run.magic = MAGIC.maxCharges;
    addMagic(run);
    expect(run.magic).toBe(MAGIC.maxCharges);
  });
});

describe("hostages", () => {
  it("freeHostage increments up to total", () => {
    const run = createRun();
    run.hostagesTotal = 2;
    freeHostage(run);
    expect(run.hostagesFreed).toBe(1);
    expect(allHostagesFreed(run)).toBe(false);
    freeHostage(run);
    expect(allHostagesFreed(run)).toBe(true);
    freeHostage(run); // cannot overshoot
    expect(run.hostagesFreed).toBe(2);
  });
  it("with no hostages the gate is considered open", () => {
    const run = createRun();
    run.hostagesTotal = 0;
    expect(allHostagesFreed(run)).toBe(true);
  });
});

describe("hearts still work", () => {
  it("loseHeart floors at zero and flags game over", () => {
    const run = createRun();
    run.hearts = 1;
    loseHeart(run);
    expect(run.hearts).toBe(0);
    expect(isGameOver(run)).toBe(true);
  });
  it("addScore accumulates", () => {
    const run = createRun();
    addScore(run, 50);
    expect(run.score).toBe(50);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd game && npx vitest run src/systems/progress.test.ts`
Expected: FAIL — `useMagic`/`freeHostage`/`run.magic` missing.

- [ ] **Step 4: Implement** — replace `src/systems/progress.ts` entirely:

```ts
import { PLAYER, MAGIC } from "../config";

// RunState is the single shared, deliberately-mutable game-run object. The
// scene layer holds one instance (via getRun/setRun) and these helpers mutate
// it in place. Intentional exception to the immutability preference so all
// scenes observe the same live run without threading return values.
export interface RunState {
  levelId: number;
  hearts: number;
  score: number;
  magic: number;          // ninja-magic charges
  hostagesFreed: number;
  hostagesTotal: number;
}

export function createRun(): RunState {
  return {
    levelId: 1,
    hearts: PLAYER.startHearts,
    score: 0,
    magic: MAGIC.startCharges,
    hostagesFreed: 0,
    hostagesTotal: 0,
  };
}

/** Consume one magic charge; returns false when empty. */
export function useMagic(run: RunState): boolean {
  if (run.magic <= 0) return false;
  run.magic -= 1;
  return true;
}

/** Refill one magic charge, capped at the max. */
export function addMagic(run: RunState): void {
  run.magic = Math.min(MAGIC.maxCharges, run.magic + 1);
}

/** Record a freed hostage (never exceeds the total). */
export function freeHostage(run: RunState): void {
  run.hostagesFreed = Math.min(run.hostagesTotal, run.hostagesFreed + 1);
}

/** True once every hostage is freed (a mission with zero hostages is "open"). */
export function allHostagesFreed(run: RunState): boolean {
  return run.hostagesTotal <= 0 ? true : run.hostagesFreed >= run.hostagesTotal;
}

/** Lose one heart, floored at 0 (idempotent once already at 0). */
export function loseHeart(run: RunState): void {
  run.hearts = Math.max(0, run.hearts - 1);
}

export function isGameOver(run: RunState): boolean {
  return run.hearts <= 0;
}

export function addScore(run: RunState, points: number): void {
  run.score += points;
}

/** Refill hearts + magic to retry the mission (keeps score + hostage progress). */
export function resetHearts(run: RunState): void {
  run.hearts = PLAYER.startHearts;
  run.magic = MAGIC.maxCharges;
}
```

Note: `useAmmo`, `addAmmo`, and `advanceLevel` are intentionally removed (single mission; unlimited throws). Callers are updated in later tasks.

- [ ] **Step 5: Run to verify pass**

Run: `cd game && npx vitest run src/systems/progress.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add game/src/config.ts game/src/systems/progress.ts game/src/systems/progress.test.ts
git commit -m "feat: run state with magic charges and hostage counters"
```

---

### Task 5: Projectile carries a velocity vector

**Files:**
- Modify: `src/entities/projectile.ts`

- [ ] **Step 1: Implement** — replace `src/entities/projectile.ts` entirely:

```ts
import type { GameObj, KAPLAYCtx } from "kaplay";
import { PROJECTILE } from "../config";

export interface ProjectileOpts {
  x: number;
  y: number;
  vx: number;   // px/s horizontal
  vy: number;   // px/s vertical (negative = up); no gravity applied
}

export function makeProjectile(k: KAPLAYCtx, opts: ProjectileOpts): GameObj {
  const proj = k.add([
    k.sprite("throwsticker", { anim: "spin" }),
    k.scale(0.4),
    k.opacity(1),
    k.pos(opts.x, opts.y),
    k.anchor("center"),
    k.area({ scale: 0.6 }),
    k.z(9),
    k.offscreen({ destroy: true }),
    k.lifespan(PROJECTILE.lifetime, { fade: 0.1 }),
    "projectile",
  ]);

  proj.onUpdate(() => {
    proj.move(opts.vx, opts.vy);
  });

  proj.onCollide("enemy", () => k.destroy(proj));
  proj.onCollide("wall", () => k.destroy(proj));
  proj.onCollide("hazard", () => k.destroy(proj));

  return proj;
}
```

- [ ] **Step 2: Verify it compiles** (player still references the old shape — expected to fail until Task 6)

Run: `cd game && npx tsc --noEmit`
Expected: FAIL only in `player.ts` (old `dir`/`speed` opts). That is fixed in the next task.

- [ ] **Step 3: Commit**

```bash
git add game/src/entities/projectile.ts
git commit -m "feat: projectile flies along a velocity vector"
```

---

### Task 6: Player — crouch + aimed unlimited throw

**Files:**
- Modify: `src/entities/player.ts`

- [ ] **Step 1: Implement** — replace `src/entities/player.ts` entirely:

```ts
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
```

- [ ] **Step 2: Verify compile** (magic/enemies still old — check just this pair)

Run: `cd game && npx tsc --noEmit 2>&1 | grep -E "player.ts|projectile.ts" || echo "player+projectile OK"`
Expected: `player+projectile OK` (other files may still error; fixed in later tasks).

- [ ] **Step 3: Commit**

```bash
git add game/src/entities/player.ts
git commit -m "feat: player crouch and aimed unlimited sticker throw"
```

---

### Task 7: Enemies advance toward the player

**Files:**
- Modify: `src/entities/enemies.ts`

**Context:** Today `makeMopJanitor`/`makeBroomGranny` take `(k, at)` and patrol. Add a third arg `targetX: () => number` so they chase the player. Keep the existing dust-ball `shootDustBall` and `defeatEnemy`. Replace `patrol`/`tickPhase` usage with `chaseDir`.

- [ ] **Step 1: Implement** — edit `src/entities/enemies.ts`:

Add imports at top (below existing imports):
```ts
import { chaseDir, grannyShouldThrow } from "../systems/enemyAI";
```

Replace the `makeMopJanitor` function with:
```ts
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
    const d = chaseDir(e.pos.x, targetX(), 8);
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
```

Replace the `makeBroomGranny` function with:
```ts
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
```

Delete the now-unused `tickPhase` and `patrol` helper functions (and `homeX`/`phase`/`phaseTimer` fields from `EnemyObj` if TypeScript flags them as unused — leave the type fields if still referenced by `shootDustBall`). Keep `ensureAnim`, `setScale`, `shootDustBall`, `defeatEnemy`, `EnemyObj`.

- [ ] **Step 2: Verify compile of this file**

Run: `cd game && npx tsc --noEmit 2>&1 | grep "enemies.ts" || echo "enemies OK"`
Expected: `enemies OK`.

- [ ] **Step 3: Commit**

```bash
git add game/src/entities/enemies.ts
git commit -m "feat: enemies chase the player (rusher + stop-and-throw)"
```

---

### Task 8: Hostage entity

**Files:**
- Create: `src/entities/hostage.ts`

**Context:** A caged buddy the player frees by hitting it with a sticker (or touching it). It shows a "?" placeholder in a cage rectangle. On free it calls `onFree()` and pops. Tagged `"hostage"` (broken by projectile) and `"hostagezone"` (touch to free).

- [ ] **Step 1: Implement** — `src/entities/hostage.ts`:

```ts
import type { GameObj, KAPLAYCtx } from "kaplay";

interface SpawnAt { x: number; y: number; }

/**
 * A caged sticker-buddy. Freed when a projectile hits it OR the player touches
 * it; fires `onFree` exactly once, then pops. The level scene wires collisions
 * to `"hostage"` (projectile) and `"hostagezone"` (player touch).
 */
export function makeHostage(k: KAPLAYCtx, at: SpawnAt, onFree: () => void): GameObj {
  let freed = false;
  const cage = k.add([
    k.rect(44, 60, { radius: 4 }),
    k.color(120, 120, 140),
    k.opacity(0.85),
    k.outline(4, k.rgb(40, 40, 55)),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.z(6),
    "hostage",
    "hostagezone",
  ]);
  k.add([
    k.text("?", { size: 30 }),
    k.pos(at.x, at.y - 30),
    k.anchor("center"),
    k.color(255, 220, 0),
    k.z(7),
    "hostagelabel",
  ]);

  const free = () => {
    if (freed) return;
    freed = true;
    k.add([
      k.text("FREED!", { size: 22 }),
      k.pos(cage.pos.x, cage.pos.y - 70),
      k.anchor("center"),
      k.color(80, 255, 120),
      k.opacity(1),
      k.lifespan(0.6, { fade: 0.3 }),
      k.move(k.UP, 50),
      k.z(20),
    ]);
    k.destroy(cage);
    onFree();
  };

  cage.on("free", free);   // scene triggers via cage.trigger("free")
  return cage;
}
```

- [ ] **Step 2: Verify compile**

Run: `cd game && npx tsc --noEmit 2>&1 | grep "hostage.ts" || echo "hostage OK"`
Expected: `hostage OK`.

- [ ] **Step 3: Commit**

```bash
git add game/src/entities/hostage.ts
git commit -m "feat: caged hostage entity with one-shot free callback"
```

---

### Task 9: Ninja-magic Sticker Storm effect

**Files:**
- Create: `src/systems/magic.ts`

- [ ] **Step 1: Implement** — `src/systems/magic.ts`:

```ts
import type { KAPLAYCtx, GameObj } from "kaplay";
import { RunState, useMagic } from "./progress";
import { defeatEnemy } from "../entities/enemies";
import { play } from "./audio";

/**
 * Cast the "Sticker Storm": if a charge is available, flash the screen, shake,
 * and clear every on-screen enemy (bosses take a single hit instead of dying).
 * Returns whether it fired.
 */
export function castStickerStorm(k: KAPLAYCtx, run: RunState): boolean {
  if (!useMagic(run)) return false;

  k.add([
    k.rect(k.width(), k.height()),
    k.color(255, 255, 255),
    k.opacity(0.75),
    k.fixed(),
    k.z(200),
    k.lifespan(0.35, { fade: 0.35 }),
  ]);
  k.shake(12);
  play("stomp");

  k.get("enemy").forEach((e: GameObj) => {
    if (e.is("boss")) {
      (e as unknown as { takeHit?: () => void }).takeHit?.();
    } else {
      defeatEnemy(k, e);
    }
  });
  return true;
}
```

- [ ] **Step 2: Verify compile**

Run: `cd game && npx tsc --noEmit 2>&1 | grep "magic.ts" || echo "magic OK"`
Expected: `magic OK`.

- [ ] **Step 3: Commit**

```bash
git add game/src/systems/magic.ts
git commit -m "feat: Sticker Storm ninja-magic screen clear"
```

---

### Task 10: Single mission map + validation

**Files:**
- Modify: `src/levels/index.ts`
- Delete: `src/levels/generate.ts`
- Modify: `src/levels/validate.ts`
- Test: `src/levels/validate.test.ts` (exists — update)

**New tile symbols:** `H` = hostage, `G` = boss gate (locked barrier). Existing kept: `@` spawn, `=` ground, `^` pit, `j` janitor, `g` granny, `B` boss, `s` sticker-coin (now a magic-charge pickup), space = empty. Drop `|`,`c`,`>` from the mission (still legal for safety).

- [ ] **Step 1: Replace `src/levels/index.ts` entirely:**

```ts
import type { LevelDef } from "../types";

// Single hand-authored Shinobi mission. Legend:
//   @ spawn  = ground  ^ pit  j rusher  g thrower  s magic pickup
//   H hostage (free all to open the gate)  G boss gate  B boss  (space) empty
// The mission reads left-to-right but the player holds ground and faces both
// ways as enemies advance; the gate blocks the boss until all H are freed.
const mission: LevelDef = {
  id: 1,
  name: "Cleaner's Compound",
  reward: "golden",
  isBoss: true,
  map: [
    "                                                            ",
    "                                                            ",
    "                                                            ",
    "        s              s                 s                  ",
    "     H        j     H        g      H        j        G   B ",
    "  @                                                      G  ",
    "===========^^^====================^^^=======================",
    "============================================================",
  ],
};

export const LEVELS: LevelDef[] = [mission];

export function getLevel(id: number): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`No level with id ${id}`);
  return level;
}
```

- [ ] **Step 2: Delete the generator**

```bash
git rm game/src/levels/generate.ts
```
If `generate.test.ts` exists, remove it too: `git rm game/src/levels/generate.test.ts` (only if present).

- [ ] **Step 3: Update `src/levels/validate.ts`** — replace the `LEGAL_TILES` set and add gate/hostage rules:

```ts
import type { LevelDef } from "../types";

export const LEGAL_TILES = new Set<string>([
  "=", "|", "^", "j", "g", "c", "s", "@", ">", "B", "H", "G", " ",
]);

function countChar(map: string[], ch: string): number {
  return map.reduce((sum, row) => sum + [...row].filter((c) => c === ch).length, 0);
}

/** Returns a list of human-readable problems; empty array means valid. */
export function validateLevel(level: LevelDef): string[] {
  const errors: string[] = [];

  if (level.map.length === 0) {
    errors.push("map has no rows");
    return errors;
  }

  const unknown = new Set<string>();
  for (const row of level.map) {
    for (const ch of row) {
      if (!LEGAL_TILES.has(ch)) unknown.add(ch);
    }
  }
  for (const ch of unknown) errors.push(`unknown tile '${ch}'`);

  if (countChar(level.map, "@") !== 1) {
    errors.push("missing exactly one player spawn '@'");
  }

  if (level.isBoss) {
    if (countChar(level.map, "B") !== 1) {
      errors.push("boss mission needs exactly one boss spawn 'B'");
    }
    if (countChar(level.map, "G") < 1) {
      errors.push("boss mission needs a boss gate 'G'");
    }
    if (countChar(level.map, "H") < 1) {
      errors.push("boss mission needs at least one hostage 'H'");
    }
  } else if (countChar(level.map, ">") !== 1) {
    errors.push("non-boss level needs exactly one goal '>'");
  }

  return errors;
}
```

- [ ] **Step 4: Update `src/levels/validate.test.ts`** — replace the whole file:

```ts
import { describe, it, expect } from "vitest";
import { validateLevel } from "./validate";
import { LEVELS } from "./index";
import type { LevelDef } from "../types";

describe("validateLevel", () => {
  it("passes the shipped mission(s)", () => {
    for (const lvl of LEVELS) {
      expect(validateLevel(lvl)).toEqual([]);
    }
  });

  it("flags an unknown tile", () => {
    const bad: LevelDef = { id: 9, name: "x", reward: "logo", map: ["@ >Z"] };
    expect(validateLevel(bad)).toContain("unknown tile 'Z'");
  });

  it("requires exactly one spawn", () => {
    const bad: LevelDef = { id: 9, name: "x", reward: "logo", map: ["= >"] };
    expect(validateLevel(bad)).toContain("missing exactly one player spawn '@'");
  });

  it("requires gate + hostage on a boss mission", () => {
    const bad: LevelDef = { id: 9, name: "x", reward: "golden", isBoss: true, map: ["@ B"] };
    const errs = validateLevel(bad);
    expect(errs).toContain("boss mission needs a boss gate 'G'");
    expect(errs).toContain("boss mission needs at least one hostage 'H'");
  });
});
```

- [ ] **Step 5: Run tests**

Run: `cd game && npx vitest run src/levels/validate.test.ts`
Expected: PASS. If "passes the shipped mission" fails, adjust the map in `index.ts` (tile counts) until valid.

- [ ] **Step 6: Commit**

```bash
git add game/src/levels/index.ts game/src/levels/validate.ts game/src/levels/validate.test.ts
git commit -m "feat: single Shinobi mission map with hostages + boss gate"
```

---

### Task 11: Mission scene rebuild

**Files:**
- Modify: `src/scenes/level.ts`

**Context:** Rebuild the scene around the new tiles and systems. Camera clamps to level bounds so two-way walking feels bounded. Hostages count into `run.hostagesTotal`; freeing wires `cage.trigger("free")`. The `G` gate is a solid wall removed once `allHostagesFreed(run)`. Magic fires from scene input. `s` pickups grant a magic charge.

- [ ] **Step 1: Replace `src/scenes/level.ts` entirely:**

```ts
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
```

- [ ] **Step 2: Verify compile**

Run: `cd game && npx tsc --noEmit 2>&1 | grep "level.ts" || echo "level OK"`
Expected: `level OK` (HUD/inputWiring may still error; next tasks).

- [ ] **Step 3: Commit**

```bash
git add game/src/scenes/level.ts
git commit -m "feat: Shinobi mission scene with hostage gate and magic"
```

---

### Task 12: HUD — magic charges, hostage counter, MAGIC button

**Files:**
- Modify: `src/ui/hud.ts`

- [ ] **Step 1: Replace `src/ui/hud.ts` entirely:**

```ts
import type { KAPLAYCtx, GameObj, TextComp, AreaComp } from "kaplay";
import { GAME_WIDTH, MAGIC } from "../config";
import { RunState } from "../systems/progress";
import { touchUI } from "../systems/inputWiring";
import { isMuted, toggleMute } from "../systems/audio";

/** Hearts + score + magic charges + hostage counter, plus touch controls. */
export function addHud(k: KAPLAYCtx, run: RunState): void {
  const hearts = k.add([k.text("", { size: 32 }), k.pos(24, 20), k.fixed(), k.z(100)]) as GameObj<TextComp>;
  const score = k.add([k.text("", { size: 28 }), k.pos(GAME_WIDTH - 24, 20), k.anchor("topright"), k.fixed(), k.z(100)]) as GameObj<TextComp>;

  // Magic charges: a row of sticker icons that dim when spent.
  k.add([k.text("Magic:", { size: 24 }), k.pos(24, 60), k.fixed(), k.z(100)]);
  for (let i = 0; i < MAGIC.maxCharges; i++) {
    const icon = k.add([
      k.sprite("stickericon"),
      k.pos(140 + i * 42, 74),
      k.anchor("center"),
      k.scale(0.34),
      k.opacity(1),
      k.fixed(),
      k.z(100),
    ]) as GameObj<{ opacity: number }>;
    icon.onUpdate(() => { icon.opacity = i < run.magic ? 1 : 0.22; });
  }

  const hostages = k.add([k.text("", { size: 24 }), k.pos(24, 108), k.fixed(), k.z(100)]) as GameObj<TextComp>;

  hearts.onUpdate(() => { hearts.text = "\u2665".repeat(run.hearts); });
  score.onUpdate(() => { score.text = `Score: ${run.score}`; });
  hostages.onUpdate(() => { hostages.text = `Freed: ${run.hostagesFreed}/${run.hostagesTotal}`; });

  const mute = k.add([
    k.text(isMuted() ? "Muted" : "Sound", { size: 22 }),
    k.pos(GAME_WIDTH - 24, 56), k.anchor("topright"), k.area(), k.fixed(), k.z(100),
  ]) as GameObj<TextComp & AreaComp>;
  mute.onClick(() => { toggleMute(); mute.text = isMuted() ? "Muted" : "Sound"; });

  if (k.isTouchscreen()) {
    const J = touchUI.joy;
    k.add([k.circle(J.r), k.pos(J.x, J.y), k.anchor("center"), k.color(0, 0, 0), k.opacity(0.2), k.fixed(), k.z(98)]);
    const knob = k.add([
      k.circle(48), k.pos(J.x, J.y), k.anchor("center"), k.color(255, 255, 255),
      k.opacity(0.55), k.outline(4, k.rgb(0, 0, 0)), k.fixed(), k.z(99),
    ]);
    knob.onUpdate(() => { knob.pos = k.vec2(touchUI.knob.x, touchUI.knob.y); });

    const btn = (x: number, y: number, r: number) =>
      k.add([k.circle(r), k.pos(x, y), k.anchor("center"), k.color(0, 0, 0), k.opacity(0.25), k.fixed(), k.z(98)]);

    const jb = touchUI.jump; btn(jb.x, jb.y, jb.r);
    k.add([k.text("JUMP", { size: 26 }), k.pos(jb.x, jb.y), k.anchor("center"), k.opacity(0.85), k.fixed(), k.z(99)]);

    const sb = touchUI.shoot; btn(sb.x, sb.y, sb.r);
    k.add([k.sprite("stickericon"), k.pos(sb.x, sb.y), k.anchor("center"), k.scale(0.42), k.fixed(), k.z(99)]);

    const mb = touchUI.magic; btn(mb.x, mb.y, mb.r);
    k.add([k.text("MAGIC", { size: 20 }), k.pos(mb.x, mb.y), k.anchor("center"), k.opacity(0.85), k.fixed(), k.z(99)]);
  }
}
```

- [ ] **Step 2: Commit** (compiles after Task 13 adds `touchUI.magic`)

```bash
git add game/src/ui/hud.ts
git commit -m "feat: HUD shows magic charges, hostage counter, MAGIC button"
```

---

### Task 13: Input wiring — crouch/aim/magic keyboard + touch

**Files:**
- Modify: `src/systems/inputWiring.ts`

- [ ] **Step 1: Replace `src/systems/inputWiring.ts` entirely:**

```ts
import type { KAPLAYCtx } from "kaplay";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { InputState, press, setAxis, setCrouch, setAimUp } from "./input";

// On-screen touch control geometry (game space, drawn by the HUD).
export const touchUI = {
  joy: { x: 175, y: GAME_HEIGHT - 150, r: 95 },
  knob: { x: 175, y: GAME_HEIGHT - 150 },
  jump: { x: GAME_WIDTH - 120, y: GAME_HEIGHT - 145, r: 74 },
  shoot: { x: GAME_WIDTH - 285, y: GAME_HEIGHT - 110, r: 62 },
  magic: { x: GAME_WIDTH - 235, y: GAME_HEIGHT - 235, r: 52 },
};

let tapFlag = false;
export function consumeTap(): boolean { const v = tapFlag; tapFlag = false; return v; }

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

export function wireInput(k: KAPLAYCtx, state: InputState): void {
  let joyId: number | null = null;

  const nativeKeysDown = new Set<string>();
  const canvas = k.canvas as HTMLCanvasElement | undefined;
  if (canvas) {
    canvas.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.repeat) return;
      nativeKeysDown.add(e.code);
      if (e.code === "Space") press(state, "jump");
      if (e.code === "KeyX" || e.code === "KeyJ") press(state, "throw");
      if (e.code === "KeyC" || e.code === "ShiftLeft" || e.code === "ShiftRight") press(state, "magic");
    });
    canvas.addEventListener("keyup", (e: KeyboardEvent) => { nativeKeysDown.delete(e.code); });
  }

  k.add([
    k.stay(),
    {
      update() {
        // Held aim inputs (keyboard). Touch overrides below when the joystick is active.
        if (joyId === null) {
          let axis = 0;
          if (k.isKeyDown("left") || k.isKeyDown("a") || nativeKeysDown.has("ArrowLeft") || nativeKeysDown.has("KeyA")) axis -= 1;
          if (k.isKeyDown("right") || k.isKeyDown("d") || nativeKeysDown.has("ArrowRight") || nativeKeysDown.has("KeyD")) axis += 1;
          setAxis(state, axis);
          setCrouch(state, k.isKeyDown("down") || k.isKeyDown("s") || nativeKeysDown.has("ArrowDown") || nativeKeysDown.has("KeyS"));
          setAimUp(state, k.isKeyDown("up") || k.isKeyDown("w") || nativeKeysDown.has("ArrowUp") || nativeKeysDown.has("KeyW"));
        }
      },
    },
  ]);

  k.onKeyPress(["space"], () => press(state, "jump"));
  k.onKeyPress(["x", "j"], () => press(state, "throw"));
  k.onKeyPress(["c", "shift"], () => press(state, "magic"));

  const J = touchUI.joy;
  const moveKnob = (gx: number, gy: number) => {
    const dx = gx - J.x;
    const dy = gy - J.y;
    touchUI.knob.x = J.x + dx * Math.min(1, J.r / (Math.hypot(dx, dy) || 1));
    touchUI.knob.y = J.y + dy * Math.min(1, J.r / (Math.hypot(dx, dy) || 1));
    let axis = (touchUI.knob.x - J.x) / J.r;
    if (Math.abs(axis) < 0.28) axis = 0;
    setAxis(state, axis);
    const vy = (touchUI.knob.y - J.y) / J.r; // down positive
    setCrouch(state, vy > 0.45);
    setAimUp(state, vy < -0.45);
  };
  const releaseJoy = () => {
    joyId = null;
    touchUI.knob.x = J.x; touchUI.knob.y = J.y;
    setAxis(state, 0); setCrouch(state, false); setAimUp(state, false);
  };

  if (canvas) {
    const toGame = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      const s = Math.min(r.width / GAME_WIDTH, r.height / GAME_HEIGHT) || 1;
      const ox = (r.width - GAME_WIDTH * s) / 2;
      const oy = (r.height - GAME_HEIGHT * s) / 2;
      return { x: (clientX - r.left - ox) / s, y: (clientY - r.top - oy) / s };
    };

    canvas.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        tapFlag = true;
        const g = toGame(t.clientX, t.clientY);
        if (joyId === null && dist(g.x, g.y, J.x, J.y) <= J.r * 1.7) { joyId = t.identifier; moveKnob(g.x, g.y); }
        else if (dist(g.x, g.y, touchUI.jump.x, touchUI.jump.y) <= touchUI.jump.r) press(state, "jump");
        else if (dist(g.x, g.y, touchUI.shoot.x, touchUI.shoot.y) <= touchUI.shoot.r) press(state, "throw");
        else if (dist(g.x, g.y, touchUI.magic.x, touchUI.magic.y) <= touchUI.magic.r) press(state, "magic");
      }
    }, { passive: false });

    canvas.addEventListener("touchmove", (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId) { const g = toGame(t.clientX, t.clientY); moveKnob(g.x, g.y); }
      }
    }, { passive: false });

    const onEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) { if (t.identifier === joyId) releaseJoy(); }
    };
    canvas.addEventListener("touchend", onEnd);
    canvas.addEventListener("touchcancel", onEnd);
  }
}
```

- [ ] **Step 2: Verify full compile**

Run: `cd game && npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add game/src/systems/inputWiring.ts
git commit -m "feat: wire crouch/aim/magic on keyboard and touch"
```

---

### Task 14: Title + reward text; full green build

**Files:**
- Modify: `src/scenes/title.ts`
- Modify: `src/scenes/reward.ts` (only the "Level N complete" wording)

- [ ] **Step 1: Update the controls block in `src/scenes/title.ts`.** Replace the title text and control lines:

Change the title line to:
```ts
    k.add([k.text("Stickan: Sticker Shinobi", { size: 48 }), k.pos(cx, 70), k.anchor("center")]);
```

Replace the four `line(...)` control lines with:
```ts
    line("CONTROLS", 430, 24);
    line("Move: \u2190 \u2192   Crouch: \u2193   Aim up: \u2191", 468);
    line("Jump: Space     Throw: X / J", 500);
    line("Ninja magic: C / Shift", 532);
```

- [ ] **Step 2: Update `src/scenes/reward.ts` heading** — change line 21's text from `Level ${def.id} complete!` to:
```ts
    k.add([k.text("Mission complete!", { size: 40 }), k.pos(k.center().x, 140), k.anchor("center")]);
```
(Leave the rest; `isLast` is already true for a single-level `LEVELS`, so it routes to `win`.)

- [ ] **Step 3: Full test + typecheck + build**

Run:
```bash
cd game && npx tsc --noEmit && npx vitest run && npx vite build
```
Expected: tsc clean; all unit tests pass; build succeeds (`dist/nimstick-game.js`).

- [ ] **Step 4: Commit**

```bash
git add game/src/scenes/title.ts game/src/scenes/reward.ts
git commit -m "feat: retitle to Sticker Shinobi and update controls text"
```

---

### Task 15: In-browser verification (Playwright)

**Files:** none (manual verification, no commit unless a fix is needed)

- [ ] **Step 1: Temporarily expose the Kaplay context** for probing — in `src/engine.ts`, before `return ctx;` add:
```ts
  (window as unknown as { __kap?: KAPLAYCtx }).__kap = ctx; // DEBUG (revert before packaging)
```

- [ ] **Step 2: Build + serve**

Run: `cd game && npx vite build && (npx vite preview --port 4318 &)` then wait 3s.

- [ ] **Step 3: Drive it** — navigate to `http://localhost:4318/`, press Space to start, and via `browser_evaluate` confirm:
  - Player exists; throwing forward/low/up creates `projectile` objects with the expected `vy` sign (up-throw `vy < 0`).
  - `k.get("hostage").length === run.hostagesTotal`; hitting a cage decrements the remaining and increments `run.hostagesFreed`.
  - `castStickerStorm` path: set `run.magic = 1`, dispatch magic, confirm `k.get("enemy")` shrinks and `run.magic === 0`.
  - After all hostages freed, `k.get("gate").length === 0`.
  - Screenshot gameplay to `shinobi-verify.png`.

- [ ] **Step 4: Revert the debug line** in `src/engine.ts` (remove the `__kap` line).

- [ ] **Step 5: Rebuild clean + commit any fixes**

Run: `cd game && npx tsc --noEmit && npx vitest run && npx vite build`
Expected: all green.
```bash
git add -A && git commit -m "chore: verified Shinobi mission in-browser"
```

---

### Task 16: WordPress build + package

**Files:** built artifacts under `wordpress-plugin/nimstick-stickan-game/dist/`

- [ ] **Step 1: Build into the WP plugin**

Run: `cd game && npm run build:wp`
Expected: ends with `Copied dist to WP plugin`.

- [ ] **Step 2: Commit the rebuilt bundle**

```bash
git add wordpress-plugin/nimstick-stickan-game/dist
git commit -m "build: ship Sticker Shinobi bundle to WP plugin"
```

- [ ] **Step 3: Repackage the installable zip** (forward-slash entries for Linux WordPress) — run this PowerShell:

```powershell
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$src = 'C:\Users\hulle\sticker-contour-frontend\wordpress-plugin\nimstick-stickan-game'
$zip = 'C:\Users\hulle\sticker-contour-frontend\nimstick-stickan-game.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
$fs = [System.IO.File]::Open($zip,[System.IO.FileMode]::Create)
$arch = New-Object System.IO.Compression.ZipArchive($fs,[System.IO.Compression.ZipArchiveMode]::Create)
$base = (Resolve-Path $src).Path
Get-ChildItem -Path $src -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($base.Length+1).Replace([char]92,[char]47)
  $entry = $arch.CreateEntry('nimstick-stickan-game/' + $rel,[System.IO.Compression.CompressionLevel]::Optimal)
  $es = $entry.Open(); $b = [System.IO.File]::ReadAllBytes($_.FullName); $es.Write($b,0,$b.Length); $es.Close()
}
$arch.Dispose(); $fs.Close()
Write-Output ("Repackaged: {0} bytes" -f (Get-Item $zip).Length)
```

- [ ] **Step 4: Push branch + finish**

```bash
git push -u origin feat/sticker-shinobi
```
Then invoke **superpowers:finishing-a-development-branch** to merge to `master`. Tell the user to re-upload `nimstick-stickan-game.zip` to nimstick.se (deactivate/delete old → Upload Plugin → Activate → purge cache).

---

## Self-Review

**Spec coverage:**
- Aimed throws (forward/low/up/air) → Tasks 2, 5, 6. ✓
- Unlimited basic throw → Task 6 (removed ammo gate). ✓
- Ninja magic, limited, refilled by rescues → Tasks 4, 9, 11 (`addMagic` on hostage free + coin). ✓
- Hostage rescue gates the boss → Tasks 4, 8, 10, 11. ✓
- Enemies advance (rusher + thrower) → Tasks 3, 7. ✓
- Ambush "from both sides" → **Partially covered.** Enemies chase from wherever placed; the map places them ahead so they advance toward the player. True edge-spawn ambush is *not* implemented (deferred). NOTE in the executing agent's report; acceptable for v1 because chasing already delivers the stand-and-fight feel. If the user wants literal edge spawns, add a follow-up task.
- 3 hearts + i-frames → unchanged (Task 11 keeps `hurtPlayer`). ✓
- Two-way movement + camera bounds → Task 11 (camera clamp). ✓
- Earn-a-sticker + album → reward scene reused (Task 14 wording only). ✓
- Controls: jump=Space, aim up=Up/W, crouch=Down/S, throw=X/J, magic=C/Shift → Task 13. ✓
- HUD magic + hostage counter + MAGIC touch button → Tasks 12, 13. ✓
- Remove multi-level generator → Task 10. ✓

**Placeholder scan:** No TBD/TODO. The one honest gap (edge-spawn ambush) is called out explicitly above rather than hidden.

**Type consistency:**
- `InputState` fields `crouch`/`aimUp`/`magicQueued` defined in Task 1, used in Tasks 6/11/13. ✓
- `RunState` fields `magic`/`hostagesFreed`/`hostagesTotal` defined Task 4, used Tasks 9/11/12. ✓
- `makeProjectile` opts `{x,y,vx,vy}` defined Task 5, used Task 6. ✓
- `makeMopJanitor`/`makeBroomGranny` gain `targetX: () => number` in Task 7, called with `targetX` in Task 11. ✓
- `makeHostage(k, at, onFree)` + `cage.trigger("free")` defined Task 8, used Task 11. ✓
- `castStickerStorm(k, run)` defined Task 9, used Task 11. ✓
- `touchUI.magic` added Task 13, read in Task 12 — Task 12 commits before Task 13, so the HUD file only *compiles* after Task 13. This is intentional (noted in Task 12 Step 2); the full `tsc` gate runs at Task 13 Step 2.
- Config: `MAGIC`, `ENEMY.janitorChaseSpeed`, `ENEMY.grannyThrowRange`, `ENEMY.ambushSpeed` added Task 4; `ambushSpeed` is currently unused (reserved for a future ambush task) — remove it if the linter flags unused object properties (it will not, since it's a property, not a local).
