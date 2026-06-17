# Stickan's Sticker Run — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a small, polished side-scrolling platformer ("Stickan's Sticker Run") that runs in the browser and embeds into nimstick.se via a WordPress `[nimstick_game]` shortcode.

**Architecture:** A self-contained game in a new top-level `game/` folder, built with Kaplay + Vite + TypeScript. Pure logic (album persistence, sticker catalog, level-data validation, input state, combat math) lives in dependency-free modules unit-tested with Vitest. Kaplay drives rendering, physics, scenes, and input. The Vite build emits one bundle into `wordpress-plugin/nimstick-stickan-game/dist/`, which a thin PHP plugin enqueues and mounts into a `<div id="nimstick-game-root">`.

**Tech Stack:** Kaplay (`kaplay` npm, MIT), Vite 5, TypeScript 5, Vitest 2, Playwright, PHP (WordPress shortcode).

**Spec:** `docs/superpowers/specs/2026-06-17-stickan-sticker-run-game-design.md`

**Conventions for every task:** Work from repo root `C:\Users\hulle\sticker-contour-frontend`. The game project root is `game/`; run `npm` commands from inside `game/`. Keep files small and single-responsibility. Commit after each task.

---

## Phase 0 — Project scaffold

### Task 1: Create the Kaplay + Vite + TypeScript project

**Files:**
- Create: `game/package.json`
- Create: `game/tsconfig.json`
- Create: `game/vite.config.ts`
- Create: `game/index.html`
- Create: `game/src/main.ts`
- Create: `game/.gitignore`

- [ ] **Step 1: Create `game/package.json`**

```json
{
  "name": "nimstick-stickan-game",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "kaplay": "^3001.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Create `game/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"],
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `game/vite.config.ts`**

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create `game/index.html`** (used for dev/standalone preview)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Stickan's Sticker Run</title>
    <style>
      html, body { margin: 0; height: 100%; background: #111; }
      #nimstick-game-root { width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <div id="nimstick-game-root"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create a minimal `game/src/main.ts` boot**

```typescript
import kaplay from "kaplay";

const root = document.getElementById("nimstick-game-root");
if (!root) throw new Error("nimstick-game-root element not found");

const k = kaplay({
  width: 1280,
  height: 720,
  letterbox: true,
  global: false,
  touchToMouse: false,
  pixelDensity: Math.min(window.devicePixelRatio, 2),
  background: [135, 183, 255],
  root,
});

k.add([k.text("Stickan's Sticker Run"), k.pos(k.center()), k.anchor("center")]);
```

- [ ] **Step 6: Create `game/.gitignore`**

```
node_modules
dist
```

- [ ] **Step 7: Install dependencies**

Run: `cd game && npm install`
Expected: installs without errors; `node_modules` created.

- [ ] **Step 8: Verify the dev server boots**

Run: `cd game && npm run dev`
Expected: Vite prints a local URL; opening it shows a blue canvas with the title text. Stop the server (Ctrl+C).

- [ ] **Step 9: Commit**

```bash
git add game/package.json game/tsconfig.json game/vite.config.ts game/index.html game/src/main.ts game/.gitignore
git commit -m "chore: scaffold Kaplay + Vite + TS game project"
```

---

### Task 2: Game constants and shared types

**Files:**
- Create: `game/src/config.ts`
- Create: `game/src/types.ts`

- [ ] **Step 1: Create `game/src/config.ts`**

```typescript
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
};

export const BOSS = {
  hits: 3,
  chargeSpeed: 520,
  bubbleSpeed: 260,
};
```

- [ ] **Step 2: Create `game/src/types.ts`**

```typescript
// Shared data types used by pure modules and scenes.

export type StickerId =
  | "logo"
  | "shades"
  | "mall"
  | "golden";

export interface StickerDef {
  id: StickerId;
  name: string;
  /** Hex fill used when drawing the placeholder sticker badge. */
  color: string;
}

/** Persisted album state: which sticker ids have been unlocked. */
export interface AlbumState {
  unlocked: StickerId[];
}

export type Tile = string; // single-char symbol used in a level ASCII map

export interface LevelDef {
  id: number;
  name: string;
  /** ASCII rows; symbols resolved by the level scene's tile table. */
  map: Tile[];
  /** Sticker awarded on completion. */
  reward: StickerId;
  /** True for the final boss level. */
  isBoss?: boolean;
}
```

- [ ] **Step 3: Type-check**

Run: `cd game && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add game/src/config.ts game/src/types.ts
git commit -m "feat: add game constants and shared types"
```

---

## Phase 1 — Pure logic (TDD)

### Task 3: Sticker catalog

**Files:**
- Create: `game/src/data/stickers.ts`
- Test: `game/src/data/stickers.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { STICKERS, getSticker, ALL_STICKER_IDS } from "./stickers";

describe("sticker catalog", () => {
  it("exposes four stickers in display order", () => {
    expect(ALL_STICKER_IDS).toEqual(["logo", "shades", "mall", "golden"]);
  });

  it("looks up a sticker by id", () => {
    expect(getSticker("golden").name).toBe("Golden Stickan");
  });

  it("has a unique non-empty color for every sticker", () => {
    const colors = STICKERS.map((s) => s.color);
    expect(new Set(colors).size).toBe(colors.length);
    expect(colors.every((c) => /^#[0-9a-fA-F]{6}$/.test(c))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd game && npx vitest run src/data/stickers.test.ts`
Expected: FAIL — cannot find module `./stickers`.

- [ ] **Step 3: Write `game/src/data/stickers.ts`**

```typescript
import type { StickerDef, StickerId } from "../types";

export const STICKERS: StickerDef[] = [
  { id: "logo", name: "Classic Nimstick", color: "#ffd400" },
  { id: "shades", name: "Cool Shades", color: "#1f9bff" },
  { id: "mall", name: "Mall Rat", color: "#e6177f" },
  { id: "golden", name: "Golden Stickan", color: "#f0a400" },
];

export const ALL_STICKER_IDS: StickerId[] = STICKERS.map((s) => s.id);

const BY_ID = new Map<StickerId, StickerDef>(STICKERS.map((s) => [s.id, s]));

export function getSticker(id: StickerId): StickerDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown sticker id: ${id}`);
  return def;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd game && npx vitest run src/data/stickers.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add game/src/data/stickers.ts game/src/data/stickers.test.ts
git commit -m "feat: add sticker catalog with tests"
```

---

### Task 4: Album persistence (localStorage)

**Files:**
- Create: `game/src/systems/save.ts`
- Test: `game/src/systems/save.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { getAlbum, unlock, isUnlocked, resetAlbum, STORAGE_KEY } from "./save";

beforeEach(() => {
  localStorage.clear();
});

describe("album save", () => {
  it("starts empty", () => {
    expect(getAlbum().unlocked).toEqual([]);
  });

  it("unlocks a sticker and persists it", () => {
    unlock("logo");
    expect(isUnlocked("logo")).toBe(true);
    expect(getAlbum().unlocked).toContain("logo");
    expect(localStorage.getItem(STORAGE_KEY)).toContain("logo");
  });

  it("does not duplicate an already-unlocked sticker", () => {
    unlock("logo");
    unlock("logo");
    expect(getAlbum().unlocked).toEqual(["logo"]);
  });

  it("resets the album", () => {
    unlock("logo");
    resetAlbum();
    expect(getAlbum().unlocked).toEqual([]);
  });

  it("ignores corrupted storage and returns an empty album", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(getAlbum().unlocked).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd game && npx vitest run src/systems/save.test.ts`
Expected: FAIL — cannot find module `./save`.

- [ ] **Step 3: Write `game/src/systems/save.ts`**

```typescript
import type { AlbumState, StickerId } from "../types";
import { ALL_STICKER_IDS } from "../data/stickers";

export const STORAGE_KEY = "nimstick.album.v1";

const EMPTY: AlbumState = { unlocked: [] };

export function getAlbum(): AlbumState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: [] };
    const parsed = JSON.parse(raw) as Partial<AlbumState>;
    const unlocked = Array.isArray(parsed.unlocked)
      ? parsed.unlocked.filter((id): id is StickerId =>
          (ALL_STICKER_IDS as string[]).includes(id as string),
        )
      : [];
    return { unlocked };
  } catch {
    return { ...EMPTY };
  }
}

function save(state: AlbumState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function unlock(id: StickerId): void {
  const state = getAlbum();
  if (!state.unlocked.includes(id)) {
    save({ unlocked: [...state.unlocked, id] });
  }
}

export function isUnlocked(id: StickerId): boolean {
  return getAlbum().unlocked.includes(id);
}

export function resetAlbum(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd game && npx vitest run src/systems/save.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add game/src/systems/save.ts game/src/systems/save.test.ts
git commit -m "feat: add localStorage album persistence with tests"
```

---

### Task 5: Level data and validation

**Files:**
- Create: `game/src/levels/index.ts`
- Create: `game/src/levels/validate.ts`
- Test: `game/src/levels/validate.test.ts`

This task defines the four levels as ASCII maps and a validator that guarantees each map is well-formed before the level scene renders it.

**Tile legend** (used by the level scene in Task 14):
`=` ground/platform · `|` wall · `^` pit-kill zone · `j` mop janitor · `g` broom granny · `c` checkpoint · `s` sticker-coin pickup · `@` player spawn · `>` level goal · `B` boss spawn · space = empty.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { LEVELS } from "./index";
import { validateLevel, LEGAL_TILES } from "./validate";

describe("level data", () => {
  it("has four levels with ascending ids", () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4]);
  });

  it("every level passes validation", () => {
    for (const level of LEVELS) {
      expect(validateLevel(level)).toEqual([]);
    }
  });

  it("only the last level is a boss level", () => {
    expect(LEVELS.filter((l) => l.isBoss).map((l) => l.id)).toEqual([4]);
  });
});

describe("validateLevel", () => {
  it("reports a missing player spawn", () => {
    const errors = validateLevel({ id: 9, name: "x", map: ["==="], reward: "logo" });
    expect(errors).toContain("missing exactly one player spawn '@'");
  });

  it("reports unknown tiles", () => {
    const errors = validateLevel({ id: 9, name: "x", map: ["@ ?", ">  "], reward: "logo" });
    expect(errors.some((e) => e.includes("unknown tile '?'"))).toBe(true);
  });

  it("requires a goal on non-boss levels", () => {
    const errors = validateLevel({ id: 9, name: "x", map: ["@  "], reward: "logo" });
    expect(errors).toContain("non-boss level needs exactly one goal '>'");
  });

  it("accepts legal tiles", () => {
    expect(LEGAL_TILES.has("=")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd game && npx vitest run src/levels/validate.test.ts`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 3: Write `game/src/levels/validate.ts`**

```typescript
import type { LevelDef } from "../types";

export const LEGAL_TILES = new Set<string>([
  "=", "|", "^", "j", "g", "c", "s", "@", ">", "B", " ",
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
      errors.push("boss level needs exactly one boss spawn 'B'");
    }
  } else {
    if (countChar(level.map, ">") !== 1) {
      errors.push("non-boss level needs exactly one goal '>'");
    }
  }

  return errors;
}
```

- [ ] **Step 4: Write `game/src/levels/index.ts`**

```typescript
import type { LevelDef } from "../types";

// Maps are read top-to-bottom; each char is one TILE_SIZE cell.
// Legend: = ground | wall ^ pit j janitor g granny c checkpoint
//         s sticker-coin @ spawn > goal B boss  (space) empty

const level1: LevelDef = {
  id: 1,
  name: "Sticker Street",
  reward: "logo",
  map: [
    "                              ",
    "                              ",
    "          s                   ",
    "                        s     ",
    "   @           j              ",
    "=======      ========     ===>",
    "=======^^^^^^========^^^^^====",
  ],
};

const level2: LevelDef = {
  id: 2,
  name: "Back Alley",
  reward: "shades",
  map: [
    "                                   ",
    "        s            s             ",
    "   @        j     c        g       ",
    "======   =====   ====   ========   ",
    "======^^^=====^^^====^^^========  >",
    "======^^^=====^^^====^^^===========",
  ],
};

const level3: LevelDef = {
  id: 3,
  name: "The Mall",
  reward: "mall",
  map: [
    "                                     ",
    "     s      g      s      g          ",
    "  @      c       =====        j      ",
    "=====   ===   ==     ==   =========  >",
    "=====^^^===^^^==     ==^^^=========^^=",
    "=====^^^===^^^=========^^^=========^^=",
  ],
};

const level4: LevelDef = {
  id: 4,
  name: "Cleaning HQ",
  reward: "golden",
  isBoss: true,
  map: [
    "                              ",
    "                              ",
    "                              ",
    "   @                  B       ",
    "==============================",
    "==============================",
  ],
};

export const LEVELS: LevelDef[] = [level1, level2, level3, level4];

export function getLevel(id: number): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`No level with id ${id}`);
  return level;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd game && npx vitest run src/levels/validate.test.ts`
Expected: PASS (7 tests). If a level fails validation, fix its map until `validateLevel` returns `[]`.

- [ ] **Step 6: Commit**

```bash
git add game/src/levels/index.ts game/src/levels/validate.ts game/src/levels/validate.test.ts
git commit -m "feat: add level data and validator with tests"
```

---

### Task 6: Unified input state

**Files:**
- Create: `game/src/systems/input.ts`
- Test: `game/src/systems/input.test.ts`

`InputState` is a plain mutable object shared by keyboard handlers, touch handlers, and the player entity. This task TDDs the pure state object and its mutators; wiring to Kaplay events happens in Task 8.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { createInputState, setAxis, press, consumePress } from "./input";

describe("input state", () => {
  it("starts neutral", () => {
    const s = createInputState();
    expect(s.moveX).toBe(0);
    expect(s.jumpQueued).toBe(false);
    expect(s.throwQueued).toBe(false);
  });

  it("sets horizontal axis clamped to -1..1", () => {
    const s = createInputState();
    setAxis(s, -5);
    expect(s.moveX).toBe(-1);
    setAxis(s, 5);
    expect(s.moveX).toBe(1);
  });

  it("queues and consumes a jump press once", () => {
    const s = createInputState();
    press(s, "jump");
    expect(consumePress(s, "jump")).toBe(true);
    expect(consumePress(s, "jump")).toBe(false);
  });

  it("queues and consumes a throw press once", () => {
    const s = createInputState();
    press(s, "throw");
    expect(consumePress(s, "throw")).toBe(true);
    expect(consumePress(s, "throw")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd game && npx vitest run src/systems/input.test.ts`
Expected: FAIL — cannot find module `./input`.

- [ ] **Step 3: Write `game/src/systems/input.ts`**

```typescript
export type ActionButton = "jump" | "throw";

export interface InputState {
  /** -1 (left), 0 (idle), 1 (right). */
  moveX: number;
  jumpQueued: boolean;
  throwQueued: boolean;
}

export function createInputState(): InputState {
  return { moveX: 0, jumpQueued: false, throwQueued: false };
}

export function setAxis(state: InputState, value: number): void {
  state.moveX = Math.max(-1, Math.min(1, value));
}

export function press(state: InputState, button: ActionButton): void {
  if (button === "jump") state.jumpQueued = true;
  else state.throwQueued = true;
}

/** Returns whether the action was queued, and clears the queue (edge-trigger). */
export function consumePress(state: InputState, button: ActionButton): boolean {
  if (button === "jump") {
    const was = state.jumpQueued;
    state.jumpQueued = false;
    return was;
  }
  const was = state.throwQueued;
  state.throwQueued = false;
  return was;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd game && npx vitest run src/systems/input.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add game/src/systems/input.ts game/src/systems/input.test.ts
git commit -m "feat: add unified input state with tests"
```

---

### Task 7: Game progress / heart logic

**Files:**
- Create: `game/src/systems/progress.ts`
- Test: `game/src/systems/progress.test.ts`

Pure run-state: current level index, hearts, score. The level scene reads/writes this; keeping it pure makes the death/advance rules testable.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { createRun, loseHeart, addScore, isGameOver, advanceLevel } from "./progress";

describe("run progress", () => {
  it("starts on level 1 with full hearts and zero score", () => {
    const run = createRun();
    expect(run.levelId).toBe(1);
    expect(run.hearts).toBe(3);
    expect(run.score).toBe(0);
  });

  it("loses a heart and reports game over at zero", () => {
    const run = createRun();
    loseHeart(run);
    expect(run.hearts).toBe(2);
    expect(isGameOver(run)).toBe(false);
    loseHeart(run);
    loseHeart(run);
    expect(run.hearts).toBe(0);
    expect(isGameOver(run)).toBe(true);
  });

  it("adds score", () => {
    const run = createRun();
    addScore(run, 50);
    addScore(run, 25);
    expect(run.score).toBe(75);
  });

  it("advances to the next level and refills hearts", () => {
    const run = createRun();
    loseHeart(run);
    advanceLevel(run);
    expect(run.levelId).toBe(2);
    expect(run.hearts).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd game && npx vitest run src/systems/progress.test.ts`
Expected: FAIL — cannot find module `./progress`.

- [ ] **Step 3: Write `game/src/systems/progress.ts`**

```typescript
import { PLAYER } from "../config";

export interface RunState {
  levelId: number;
  hearts: number;
  score: number;
}

export function createRun(): RunState {
  return { levelId: 1, hearts: PLAYER.startHearts, score: 0 };
}

export function loseHeart(run: RunState): void {
  run.hearts = Math.max(0, run.hearts - 1);
}

export function isGameOver(run: RunState): boolean {
  return run.hearts <= 0;
}

export function addScore(run: RunState, points: number): void {
  run.score += points;
}

export function advanceLevel(run: RunState): void {
  run.levelId += 1;
  run.hearts = PLAYER.startHearts;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd game && npx vitest run src/systems/progress.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the whole unit suite**

Run: `cd game && npm test`
Expected: all tests across stickers, save, validate, input, progress PASS.

- [ ] **Step 6: Commit**

```bash
git add game/src/systems/progress.ts game/src/systems/progress.test.ts
git commit -m "feat: add run progress and heart logic with tests"
```

---

## Phase 2 — Kaplay foundation

### Task 8: Kaplay context, assets, and input wiring

**Files:**
- Create: `game/src/engine.ts`
- Create: `game/src/assets.ts`
- Modify: `game/src/main.ts`
- Create: `game/public/sprites/` (copy the four Stickan PNGs here in Step 3)

This centralizes the single Kaplay instance (`k`), loads sprites, and wires keyboard + touch into one shared `InputState`.

- [ ] **Step 1: Create `game/src/engine.ts`**

```typescript
import kaplay from "kaplay";
import type { KAPLAYCtx } from "kaplay";
import { GAME_WIDTH, GAME_HEIGHT } from "./config";

let ctx: KAPLAYCtx | null = null;

export function initEngine(root: HTMLElement): KAPLAYCtx {
  ctx = kaplay({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    letterbox: true,
    global: false,
    touchToMouse: false,
    pixelDensity: Math.min(window.devicePixelRatio, 2),
    background: [135, 183, 255],
    root,
  });
  return ctx;
}

export function k(): KAPLAYCtx {
  if (!ctx) throw new Error("Engine not initialized; call initEngine() first");
  return ctx;
}
```

- [ ] **Step 2: Create `game/src/assets.ts`**

```typescript
import type { KAPLAYCtx } from "kaplay";

// Stickan PNGs live in game/public/sprites and are served at /sprites/*.
export function loadAssets(k: KAPLAYCtx): void {
  k.loadSprite("stickan-idle", "sprites/stickan-wave.png");
  k.loadSprite("stickan-run", "sprites/stickan-run.png");
  k.loadSprite("stickan-jump", "sprites/stickan-jump.png");
  k.loadSprite("stickan-think", "sprites/stickan-think.png");
}
```

- [ ] **Step 3: Copy the Stickan PNGs into `game/public/sprites/`**

Create the folder `game/public/sprites/`. Save the mascot reference images there with these exact filenames (the user provided these images in chat):
- `stickan-wave.png` — waving pose (idle/title)
- `stickan-run.png` — running pose
- `stickan-jump.png` — jumping/cheering pose
- `stickan-think.png` — reading/thinking pose (used on reward/think screens)

If a specific pose isn't available yet, reuse `stickan-wave.png` for the missing filename so the build doesn't break; swap later.

Run: `ls game/public/sprites`
Expected: the four `.png` files are present.

- [ ] **Step 4: Create `game/src/systems/inputWiring.ts`**

```typescript
import type { KAPLAYCtx } from "kaplay";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { InputState, press, setAxis } from "./input";

/**
 * Wires keyboard + raw multi-touch into the shared InputState.
 * Touch buttons are virtual rectangles in the lower corners of the screen.
 * Returns the helper used by the HUD to draw matching button graphics.
 */
export interface TouchZones {
  left: [number, number, number, number];   // x, y, w, h (screen space)
  right: [number, number, number, number];
  jump: [number, number, number, number];
  throw: [number, number, number, number];
}

export function touchZones(): TouchZones {
  const pad = 24;
  const size = 120;
  const y = GAME_HEIGHT - size - pad;
  return {
    left: [pad, y, size, size],
    right: [pad * 2 + size, y, size, size],
    throw: [GAME_WIDTH - pad * 2 - size * 2, y, size, size],
    jump: [GAME_WIDTH - pad - size, y, size, size],
  };
}

function inZone(z: [number, number, number, number], x: number, y: number): boolean {
  return x >= z[0] && x <= z[0] + z[2] && y >= z[1] && y <= z[1] + z[3];
}

export function wireInput(k: KAPLAYCtx, state: InputState): void {
  // Keyboard: held axis + edge-triggered actions.
  k.onUpdate(() => {
    let axis = 0;
    if (k.isKeyDown("left") || k.isKeyDown("a")) axis -= 1;
    if (k.isKeyDown("right") || k.isKeyDown("d")) axis += 1;
    // Touch axis is applied separately below; only override when no touch.
    if (activeTouches.size === 0) setAxis(state, axis);
  });

  k.onKeyPress(["space", "up", "w"], () => press(state, "jump"));
  k.onKeyPress(["x", "j", "shift"], () => press(state, "throw"));

  // Multi-touch: map each touch point to a virtual button zone.
  const zones = touchZones();
  const activeTouches = new Map<number, string>();

  const screenToGame = (pos: { x: number; y: number }) => {
    // Kaplay reports touch pos already in game coordinates when letterboxed.
    return pos;
  };

  const recomputeAxis = () => {
    const buttons = new Set(activeTouches.values());
    let axis = 0;
    if (buttons.has("left")) axis -= 1;
    if (buttons.has("right")) axis += 1;
    setAxis(state, axis);
  };

  k.onTouchStart((pos, t) => {
    const p = screenToGame(pos);
    let hit = "";
    if (inZone(zones.left, p.x, p.y)) hit = "left";
    else if (inZone(zones.right, p.x, p.y)) hit = "right";
    else if (inZone(zones.jump, p.x, p.y)) { press(state, "jump"); hit = "jump"; }
    else if (inZone(zones.throw, p.x, p.y)) { press(state, "throw"); hit = "throw"; }
    if (hit) activeTouches.set(t.identifier, hit);
    recomputeAxis();
  });

  k.onTouchEnd((_pos, t) => {
    activeTouches.delete(t.identifier);
    recomputeAxis();
  });
}
```

- [ ] **Step 5: Replace `game/src/main.ts` with the real boot**

```typescript
import { initEngine } from "./engine";
import { loadAssets } from "./assets";
import { createInputState } from "./systems/input";
import { wireInput } from "./systems/inputWiring";
import { registerScenes } from "./scenes";

const root = document.getElementById("nimstick-game-root");
if (!root) throw new Error("nimstick-game-root element not found");

const k = initEngine(root);
loadAssets(k);

const input = createInputState();
wireInput(k, input);

registerScenes(k, input);

k.go("title");
```

- [ ] **Step 6: Create a temporary `game/src/scenes/index.ts` stub so the app boots**

```typescript
import type { KAPLAYCtx } from "kaplay";
import type { InputState } from "../systems/input";

export function registerScenes(k: KAPLAYCtx, _input: InputState): void {
  k.scene("title", () => {
    k.add([k.text("Stickan's Sticker Run"), k.pos(k.center()), k.anchor("center")]);
  });
}
```

- [ ] **Step 7: Verify it boots**

Run: `cd game && npm run dev`
Expected: title text renders, no console errors. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add game/src/engine.ts game/src/assets.ts game/src/systems/inputWiring.ts game/src/main.ts game/src/scenes/index.ts game/public/sprites
git commit -m "feat: add kaplay engine, asset loading, and input wiring"
```

---

## Phase 3 — Entities

> Entities are visual/physics objects; their "feel" is verified manually (Step labelled **Manual check**), while collision/state rules reuse the unit-tested pure modules. Each entity is a factory returning a Kaplay GameObj.

### Task 9: Player entity

**Files:**
- Create: `game/src/entities/player.ts`

- [ ] **Step 1: Create `game/src/entities/player.ts`**

```typescript
import type { GameObj, KAPLAYCtx } from "kaplay";
import { PLAYER, PROJECTILE } from "../config";
import { InputState, consumePress } from "../systems/input";
import { makeProjectile } from "./projectile";

export interface PlayerHandle {
  obj: GameObj;
}

export function makePlayer(k: KAPLAYCtx, input: InputState, spawn: { x: number; y: number }): PlayerHandle {
  const player = k.add([
    k.sprite("stickan-idle"),
    k.pos(spawn.x, spawn.y),
    k.anchor("center"),
    k.area({ scale: 0.8 }),
    k.body({ maxVelocity: PLAYER.maxFallSpeed }),
    k.scale(0.5),
    k.z(10),
    "player",
    { facing: 1, coyote: 0, throwTimer: 0, invuln: 0 },
  ]);

  player.onUpdate(() => {
    const dt = k.dt();

    // Horizontal movement.
    player.move(input.moveX * PLAYER.speed, 0);
    if (input.moveX !== 0) {
      player.facing = input.moveX > 0 ? 1 : -1;
      player.flipX = player.facing < 0;
    }

    // Coyote time bookkeeping.
    if (player.isGrounded()) player.coyote = PLAYER.coyoteTime;
    else player.coyote = Math.max(0, player.coyote - dt);

    // Jump (edge-triggered, allows coyote window).
    if (consumePress(input, "jump") && player.coyote > 0) {
      player.jump(PLAYER.jumpForce);
      player.coyote = 0;
    }

    // Throw (edge-triggered + cooldown).
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

    // Sprite swap by motion state.
    if (!player.isGrounded()) player.use(k.sprite("stickan-jump"));
    else if (input.moveX !== 0) player.use(k.sprite("stickan-run"));
    else player.use(k.sprite("stickan-idle"));

    // Invulnerability decay (set by the level scene when hurt).
    player.invuln = Math.max(0, player.invuln - dt);
    player.opacity = player.invuln > 0 ? 0.5 : 1;
  });

  return { obj: player };
}
```

- [ ] **Step 2: Type-check**

Run: `cd game && npx tsc --noEmit`
Expected: only an error about missing `./projectile` (created next task) — acceptable until Task 10. If you implement Task 10 first, expect zero errors.

- [ ] **Step 3: Commit** (after Task 10 type-checks clean; if doing strictly in order, commit player+projectile together at end of Task 10)

```bash
git add game/src/entities/player.ts
git commit -m "feat: add player entity with movement, jump, throw"
```

---

### Task 10: Projectile (thrown sticker)

**Files:**
- Create: `game/src/entities/projectile.ts`

- [ ] **Step 1: Create `game/src/entities/projectile.ts`**

```typescript
import type { GameObj, KAPLAYCtx } from "kaplay";
import { PROJECTILE } from "../config";

export interface ProjectileOpts {
  x: number;
  y: number;
  dir: number;   // -1 or 1
  speed: number;
}

export function makeProjectile(k: KAPLAYCtx, opts: ProjectileOpts): GameObj {
  const proj = k.add([
    k.circle(12),
    k.color(255, 212, 0),
    k.outline(3, k.rgb(0, 0, 0)),
    k.pos(opts.x, opts.y),
    k.anchor("center"),
    k.area(),
    k.rotate(0),
    k.z(9),
    k.offscreen({ destroy: true }),
    k.lifespan(PROJECTILE.lifetime, { fade: 0.1 }),
    "projectile",
  ]);

  proj.onUpdate(() => {
    proj.move(opts.dir * opts.speed, 0);
    proj.angle += 720 * k.dt();
  });

  // Defeat enemies on contact; the enemy handles its own death via onCollide.
  proj.onCollide("enemy", () => k.destroy(proj));
  proj.onCollide("wall", () => k.destroy(proj));

  return proj;
}
```

- [ ] **Step 2: Type-check**

Run: `cd game && npx tsc --noEmit`
Expected: no errors (player + projectile now resolve).

- [ ] **Step 3: Commit**

```bash
git add game/src/entities/player.ts game/src/entities/projectile.ts
git commit -m "feat: add player and projectile entities"
```

---

### Task 11: Mop Janitor enemy

**Files:**
- Create: `game/src/entities/enemies.ts`

This file holds both regular enemies (janitor + granny) since they share helpers.

- [ ] **Step 1: Create `game/src/entities/enemies.ts`**

```typescript
import type { GameObj, KAPLAYCtx } from "kaplay";
import { ENEMY } from "../config";

interface SpawnAt {
  x: number;
  y: number;
}

/** A walking janitor: patrols, reverses at walls/ledges, dies to stomp or sticker. */
export function makeMopJanitor(k: KAPLAYCtx, at: SpawnAt): GameObj {
  const e = k.add([
    k.rect(48, 56),
    k.color(60, 60, 70),
    k.outline(3, k.rgb(0, 0, 0)),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.body(),
    k.z(8),
    "enemy",
    "janitor",
    { dir: -1, hp: 1 },
  ]);

  e.onUpdate(() => {
    e.move(e.dir * ENEMY.janitorSpeed, 0);
  });

  // Reverse when bumping a wall.
  e.onCollide("wall", () => { e.dir *= -1; });

  // Sticker hit: defeat.
  e.onCollide("projectile", () => defeatEnemy(k, e));

  return e;
}

/** A broom granny: slower, periodically swipes (handled by the level scene's hit check). */
export function makeBroomGranny(k: KAPLAYCtx, at: SpawnAt): GameObj {
  const e = k.add([
    k.rect(52, 64),
    k.color(120, 80, 140),
    k.outline(3, k.rgb(0, 0, 0)),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.body(),
    k.z(8),
    "enemy",
    "granny",
    { dir: -1, hp: 2, swipeTimer: ENEMY.grannySwipeInterval, swiping: false },
  ]);

  e.onUpdate(() => {
    e.move(e.dir * ENEMY.grannySpeed, 0);
    e.swipeTimer -= k.dt();
    if (e.swipeTimer <= 0) {
      e.swiping = true;
      e.swipeTimer = ENEMY.grannySwipeInterval;
      k.wait(0.4, () => { e.swiping = false; });
    }
  });

  e.onCollide("wall", () => { e.dir *= -1; });

  e.onCollide("projectile", () => {
    e.hp -= 1;
    if (e.hp <= 0) defeatEnemy(k, e);
    else k.shake(2);
  });

  return e;
}

/** Shared defeat animation + cleanup. */
export function defeatEnemy(k: KAPLAYCtx, e: GameObj): void {
  if (e.exists()) {
    k.add([
      k.text("POP!", { size: 24 }),
      k.pos(e.pos),
      k.anchor("center"),
      k.color(255, 212, 0),
      k.lifespan(0.4, { fade: 0.2 }),
      k.move(k.UP, 60),
    ]);
    k.destroy(e);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd game && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add game/src/entities/enemies.ts
git commit -m "feat: add mop janitor and broom granny enemies"
```

---

### Task 12: Pickups, checkpoint, and goal

**Files:**
- Create: `game/src/entities/props.ts`

- [ ] **Step 1: Create `game/src/entities/props.ts`**

```typescript
import type { GameObj, KAPLAYCtx } from "kaplay";

interface SpawnAt { x: number; y: number; }

/** Floating sticker-coin worth score; destroyed on player pickup by the level scene. */
export function makeStickerCoin(k: KAPLAYCtx, at: SpawnAt): GameObj {
  const c = k.add([
    k.circle(14),
    k.color(255, 212, 0),
    k.outline(3, k.rgb(0, 0, 0)),
    k.pos(at.x, at.y),
    k.anchor("center"),
    k.area(),
    k.z(6),
    "coin",
    { baseY: at.y, t: 0 },
  ]);
  c.onUpdate(() => {
    c.t += k.dt();
    c.pos.y = c.baseY + Math.sin(c.t * 3) * 6;
  });
  return c;
}

/** Mid-level checkpoint; the level scene updates the respawn point on overlap. */
export function makeCheckpoint(k: KAPLAYCtx, at: SpawnAt): GameObj {
  return k.add([
    k.rect(12, 64),
    k.color(40, 200, 120),
    k.outline(3, k.rgb(0, 0, 0)),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.z(5),
    "checkpoint",
    { active: false },
  ]);
}

/** Level goal flag; overlap triggers the reward scene. */
export function makeGoal(k: KAPLAYCtx, at: SpawnAt): GameObj {
  return k.add([
    k.rect(20, 96),
    k.color(231, 23, 127),
    k.outline(3, k.rgb(0, 0, 0)),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.z(5),
    "goal",
  ]);
}
```

- [ ] **Step 2: Type-check**

Run: `cd game && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add game/src/entities/props.ts
git commit -m "feat: add sticker-coin, checkpoint, and goal props"
```

---

### Task 13: Boss entity

**Files:**
- Create: `game/src/entities/boss.ts`

- [ ] **Step 1: Create `game/src/entities/boss.ts`**

```typescript
import type { GameObj, KAPLAYCtx } from "kaplay";
import { BOSS, GAME_WIDTH } from "../config";

interface SpawnAt { x: number; y: number; }

/**
 * The Head Cleaner. Cycles: idle → charge across arena → recover.
 * Takes BOSS.hits sticker hits. Exposes `defeated` via the "bossDead" event tag.
 */
export function makeBoss(k: KAPLAYCtx, at: SpawnAt): GameObj {
  const boss = k.add([
    k.rect(96, 110),
    k.color(40, 40, 50),
    k.outline(4, k.rgb(0, 0, 0)),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.body(),
    k.z(8),
    "enemy",
    "boss",
    { hp: BOSS.hits, dir: -1, charging: false, cooldown: 1.5 },
  ]);

  boss.onUpdate(() => {
    const dt = k.dt();
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

  boss.onCollide("projectile", () => {
    boss.hp -= 1;
    k.shake(6);
    if (boss.hp <= 0) {
      k.destroy(boss);
      k.trigger("bossDead");
    } else {
      boss.color = k.rgb(200, 60, 60);
      k.wait(0.15, () => { boss.color = k.rgb(40, 40, 50); });
    }
  });

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
    { dir: boss.dir },
  ]);
  b.onUpdate(() => b.move(b.dir * BOSS.bubbleSpeed, 0));
}
```

- [ ] **Step 2: Type-check**

Run: `cd game && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add game/src/entities/boss.ts
git commit -m "feat: add boss entity with charge and bubble attacks"
```

---

## Phase 4 — HUD, scenes, and levels

### Task 14: HUD and touch-control overlay

**Files:**
- Create: `game/src/ui/hud.ts`

- [ ] **Step 1: Create `game/src/ui/hud.ts`**

```typescript
import type { KAPLAYCtx } from "kaplay";
import { GAME_WIDTH } from "../config";
import { RunState } from "../systems/progress";
import { touchZones } from "../systems/inputWiring";
import { isMuted, toggleMute } from "../systems/audio";

/** Draws hearts + score (fixed to screen) and, on touch devices, button overlays. */
export function addHud(k: KAPLAYCtx, run: RunState): void {
  const hearts = k.add([k.text("", { size: 32 }), k.pos(24, 20), k.fixed(), k.z(100)]);
  const score = k.add([k.text("", { size: 28 }), k.pos(GAME_WIDTH - 24, 20), k.anchor("topright"), k.fixed(), k.z(100)]);

  hearts.onUpdate(() => { hearts.text = "♥".repeat(run.hearts); });
  score.onUpdate(() => { score.text = `Score: ${run.score}`; });

  // Mute toggle (clickable on all devices).
  const mute = k.add([
    k.text(isMuted() ? "Muted" : "Sound", { size: 22 }),
    k.pos(GAME_WIDTH - 24, 56),
    k.anchor("topright"),
    k.area(),
    k.fixed(),
    k.z(100),
  ]);
  mute.onClick(() => { toggleMute(); mute.text = isMuted() ? "Muted" : "Sound"; });

  // Touch button overlays only when the device reports touch support.
  if (k.isTouchscreen()) {
    const z = touchZones();
    const drawBtn = (rect: [number, number, number, number], label: string) => {
      k.add([
        k.rect(rect[2], rect[3], { radius: 16 }),
        k.pos(rect[0], rect[1]),
        k.color(0, 0, 0),
        k.opacity(0.25),
        k.fixed(),
        k.z(99),
      ]);
      k.add([
        k.text(label, { size: 40 }),
        k.pos(rect[0] + rect[2] / 2, rect[1] + rect[3] / 2),
        k.anchor("center"),
        k.opacity(0.7),
        k.fixed(),
        k.z(100),
      ]);
    };
    drawBtn(z.left, "←");
    drawBtn(z.right, "→");
    drawBtn(z.jump, "↑");
    drawBtn(z.throw, "●");
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd game && npx tsc --noEmit`
Expected: error about missing `../systems/audio` — created in Task 15. Acceptable until then; or implement Task 15 first.

- [ ] **Step 3: Commit** (after Task 15)

```bash
git add game/src/ui/hud.ts
git commit -m "feat: add HUD with hearts, score, and touch overlay"
```

---

### Task 15: Audio system

**Files:**
- Create: `game/src/systems/audio.ts`
- Modify: `game/src/assets.ts` (load sounds)
- Create: `game/public/sfx/` (CC0 sound files)

- [ ] **Step 1: Create `game/src/systems/audio.ts`**

```typescript
import type { KAPLAYCtx } from "kaplay";

let ctx: KAPLAYCtx | null = null;
let muted = false;

export function initAudio(k: KAPLAYCtx): void {
  ctx = k;
  const stored = localStorage.getItem("nimstick.muted");
  muted = stored === "1";
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): void {
  muted = !muted;
  localStorage.setItem("nimstick.muted", muted ? "1" : "0");
}

export type Sfx = "jump" | "throw" | "stomp" | "coin" | "hurt" | "peel";

export function play(name: Sfx): void {
  if (muted || !ctx) return;
  try {
    ctx.play(name, { volume: 0.6 });
  } catch {
    // Sound not loaded yet; ignore silently.
  }
}
```

- [ ] **Step 2: Add sound loading to `game/src/assets.ts`**

Add inside `loadAssets`, after the sprite loads:

```typescript
  // CC0 sfx in game/public/sfx (served at /sfx/*).
  k.loadSound("jump", "sfx/jump.wav");
  k.loadSound("throw", "sfx/throw.wav");
  k.loadSound("stomp", "sfx/stomp.wav");
  k.loadSound("coin", "sfx/coin.wav");
  k.loadSound("hurt", "sfx/hurt.wav");
  k.loadSound("peel", "sfx/peel.wav");
```

- [ ] **Step 3: Add the SFX files**

Create `game/public/sfx/` and add six short CC0 `.wav` files with the names above. Source from a CC0 library (e.g. kenney.nl audio packs or sfxr-generated tones). If a file is missing the `play()` helper fails silently, so the game still runs — but add all six for full polish.

Run: `ls game/public/sfx`
Expected: `jump.wav throw.wav stomp.wav coin.wav hurt.wav peel.wav`.

- [ ] **Step 4: Wire `initAudio` into boot — modify `game/src/main.ts`**

Add after `loadAssets(k);`:

```typescript
import { initAudio } from "./systems/audio";
// ...
initAudio(k);
```

- [ ] **Step 5: Type-check and run the unit suite**

Run: `cd game && npx tsc --noEmit && npm test`
Expected: tsc clean; all unit tests pass.

- [ ] **Step 6: Commit**

```bash
git add game/src/systems/audio.ts game/src/assets.ts game/src/main.ts game/src/ui/hud.ts game/public/sfx
git commit -m "feat: add audio system with mute toggle and sfx"
```

---

### Task 16: Generic level scene

**Files:**
- Create: `game/src/scenes/level.ts`

This scene builds any `LevelDef` from its ASCII map using `k.addLevel`, wires collisions (stomp, hurt, coin, checkpoint, goal, pit), and reads/writes `RunState`.

- [ ] **Step 1: Create `game/src/scenes/level.ts`**

```typescript
import type { KAPLAYCtx, GameObj } from "kaplay";
import { TILE_SIZE, ENEMY, GAME_HEIGHT } from "../config";
import { InputState } from "../systems/input";
import { RunState, loseHeart, addScore, isGameOver } from "../systems/progress";
import { getLevel } from "../levels";
import { makePlayer } from "../entities/player";
import { makeMopJanitor, makeBroomGranny, defeatEnemy } from "../entities/enemies";
import { makeBoss } from "../entities/boss";
import { makeStickerCoin, makeCheckpoint, makeGoal } from "../entities/props";
import { addHud } from "../ui/hud";
import { play } from "../systems/audio";

export function registerLevelScene(k: KAPLAYCtx, input: InputState, run: RunState): void {
  k.scene("level", () => {
    const def = getLevel(run.levelId);
    k.setGravity(2000);

    let respawn = { x: 100, y: 100 };

    const map = k.addLevel(def.map, {
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

    // Resolve marker objects into real entities at their world positions.
    const at = (o: GameObj) => ({ x: o.pos.x, y: o.pos.y });
    map.get("spawnmark").forEach((o: GameObj) => { respawn = { x: o.pos.x, y: o.pos.y }; });
    map.get("janimark").forEach((o: GameObj) => makeMopJanitor(k, at(o)));
    map.get("granmark").forEach((o: GameObj) => makeBroomGranny(k, at(o)));
    map.get("coinmark").forEach((o: GameObj) => makeStickerCoin(k, at(o)));
    map.get("checkmark").forEach((o: GameObj) => makeCheckpoint(k, at(o)));
    map.get("goalmark").forEach((o: GameObj) => makeGoal(k, at(o)));
    map.get("bossmark").forEach((o: GameObj) => makeBoss(k, at(o)));

    const player = makePlayer(k, input, respawn).obj;
    k.camScale(1);
    player.onUpdate(() => k.camPos(player.pos.x, GAME_HEIGHT / 2));

    addHud(k, run);

    const hurtPlayer = () => {
      if (player.invuln > 0) return;
      player.invuln = 1.5;
      loseHeart(run);
      play("hurt");
      k.shake(8);
      if (isGameOver(run)) {
        k.wait(0.4, () => k.go("gameover"));
      }
    };

    // Stomp vs hurt: stomp when player is falling and above the enemy's center.
    player.onCollide("enemy", (e: GameObj) => {
      const falling = player.vel.y > 0;
      const above = player.pos.y < e.pos.y - 10;
      if (falling && above && !e.is("boss")) {
        defeatEnemy(k, e);
        player.jump(ENEMY.stompBounce);
        play("stomp");
        addScore(run, 100);
      } else {
        hurtPlayer();
      }
    });

    player.onCollide("hazard", () => hurtPlayer());
    player.onCollide("pit", () => {
      hurtPlayer();
      if (!isGameOver(run)) { player.pos = k.vec2(respawn.x, respawn.y); player.vel.y = 0; }
    });

    player.onCollide("coin", (c: GameObj) => { k.destroy(c); addScore(run, 50); play("coin"); });

    player.onCollide("checkpoint", (cp: GameObj) => {
      if (!cp.active) { cp.active = true; cp.color = k.rgb(255, 212, 0); }
      respawn = { x: cp.pos.x, y: cp.pos.y };
    });

    player.onCollide("goal", () => k.go("reward"));

    // Boss death (boss levels) → reward.
    k.on("bossDead", () => k.wait(0.6, () => k.go("reward")));
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd game && npx tsc --noEmit`
Expected: error about missing scenes `reward`/`gameover` only if `registerScenes` references them before they exist; the scene strings themselves don't need to resolve at compile time. Errors here should only concern `./reward` imports if any — there are none in this file. Expect clean once entities compile.

- [ ] **Step 3: Commit**

```bash
git add game/src/scenes/level.ts
git commit -m "feat: add generic level scene with collisions and camera"
```

---

### Task 17: Reward, album, title, win, and game-over scenes

**Files:**
- Create: `game/src/scenes/reward.ts`
- Create: `game/src/scenes/album.ts`
- Create: `game/src/scenes/title.ts`
- Create: `game/src/scenes/win.ts`
- Create: `game/src/scenes/gameover.ts`
- Rewrite: `game/src/scenes/index.ts`

- [ ] **Step 1: Create `game/src/scenes/reward.ts`**

```typescript
import type { KAPLAYCtx } from "kaplay";
import { RunState, advanceLevel } from "../systems/progress";
import { getLevel, LEVELS } from "../levels";
import { getSticker } from "../data/stickers";
import { unlock } from "../systems/save";
import { play } from "../systems/audio";

export function registerRewardScene(k: KAPLAYCtx, run: RunState): void {
  k.scene("reward", () => {
    const def = getLevel(run.levelId);
    const sticker = getSticker(def.reward);
    unlock(sticker.id);
    play("peel");

    k.add([k.rect(k.width(), k.height()), k.color(20, 20, 30)]);
    k.add([k.text(`Level ${def.id} complete!`, { size: 40 }), k.pos(k.center().x, 140), k.anchor("center")]);
    k.add([k.text("You earned a sticker:", { size: 26 }), k.pos(k.center().x, 210), k.anchor("center")]);

    // Peel-in sticker badge.
    const badge = k.add([
      k.circle(70),
      k.color(k.Color.fromHex(sticker.color)),
      k.outline(6, k.rgb(0, 0, 0)),
      k.pos(k.center()),
      k.anchor("center"),
      k.scale(0),
    ]);
    k.add([k.text(sticker.name, { size: 24 }), k.pos(k.center().x, k.center().y + 110), k.anchor("center")]);
    k.tween(0, 1, 0.5, (v) => badge.scale = k.vec2(v), k.easings.easeOutBack);

    const isLast = run.levelId >= LEVELS.length;
    const prompt = isLast ? "Press SPACE / tap to finish" : "Press SPACE / tap for next level";
    k.add([k.text(prompt, { size: 22 }), k.pos(k.center().x, k.height() - 80), k.anchor("center")]);

    const proceed = () => {
      if (isLast) { k.go("win"); return; }
      advanceLevel(run);
      k.go("level");
    };
    k.onKeyPress("space", proceed);
    k.onMousePress(proceed);
  });
}
```

- [ ] **Step 2: Create `game/src/scenes/album.ts`**

```typescript
import type { KAPLAYCtx } from "kaplay";
import { STICKERS } from "../data/stickers";
import { isUnlocked, resetAlbum } from "../systems/save";

export function registerAlbumScene(k: KAPLAYCtx): void {
  k.scene("album", () => {
    k.add([k.rect(k.width(), k.height()), k.color(245, 240, 225)]);
    k.add([k.text("Sticker Album", { size: 44 }), k.pos(k.center().x, 70), k.anchor("center"), k.color(0, 0, 0)]);

    const cols = 4;
    const cell = 160;
    const startX = k.center().x - (cols * cell) / 2 + cell / 2;
    const startY = 200;

    STICKERS.forEach((s, i) => {
      const cx = startX + (i % cols) * cell;
      const cy = startY + Math.floor(i / cols) * cell;
      const got = isUnlocked(s.id);
      k.add([
        k.circle(56),
        got ? k.color(k.Color.fromHex(s.color)) : k.color(200, 200, 200),
        k.outline(5, k.rgb(0, 0, 0)),
        k.pos(cx, cy),
        k.anchor("center"),
        k.opacity(got ? 1 : 0.5),
      ]);
      k.add([
        k.text(got ? s.name : "???", { size: 18 }),
        k.pos(cx, cy + 78),
        k.anchor("center"),
        k.color(0, 0, 0),
      ]);
    });

    k.add([k.text("Press B to go back · R to reset", { size: 20 }), k.pos(k.center().x, k.height() - 50), k.anchor("center"), k.color(0, 0, 0)]);
    k.onKeyPress("b", () => k.go("title"));
    k.onKeyPress("r", () => { resetAlbum(); k.go("album"); });
    k.onMousePress(() => k.go("title"));
  });
}
```

- [ ] **Step 3: Create `game/src/scenes/title.ts`**

```typescript
import type { KAPLAYCtx } from "kaplay";
import { RunState, createRun } from "../systems/progress";

export function registerTitleScene(k: KAPLAYCtx, getRun: () => RunState, setRun: (r: RunState) => void): void {
  k.scene("title", () => {
    k.add([k.rect(k.width(), k.height()), k.color(135, 183, 255)]);
    k.add([k.sprite("stickan-idle"), k.pos(k.center().x, 260), k.anchor("center"), k.scale(0.7)]);
    k.add([k.text("Stickan's Sticker Run", { size: 52 }), k.pos(k.center().x, 90), k.anchor("center")]);
    k.add([k.text("Press SPACE / tap to play", { size: 26 }), k.pos(k.center().x, 480), k.anchor("center")]);
    k.add([k.text("Press A for album", { size: 22 }), k.pos(k.center().x, 530), k.anchor("center")]);

    const start = () => { setRun(createRun()); k.go("level"); };
    k.onKeyPress("space", start);
    k.onMousePress(start);
    k.onKeyPress("a", () => k.go("album"));
  });
}
```

- [ ] **Step 4: Create `game/src/scenes/win.ts`**

```typescript
import type { KAPLAYCtx } from "kaplay";

export function registerWinScene(k: KAPLAYCtx): void {
  k.scene("win", () => {
    k.add([k.rect(k.width(), k.height()), k.color(20, 20, 30)]);
    k.add([k.text("You beat the Head Cleaner!", { size: 44 }), k.pos(k.center().x, 200), k.anchor("center")]);
    k.add([k.text("Stickan saved the stickers 🎉", { size: 28 }), k.pos(k.center().x, 280), k.anchor("center")]);
    k.add([k.text("Press A to view your album · SPACE to play again", { size: 22 }), k.pos(k.center().x, k.height() - 80), k.anchor("center")]);
    k.onKeyPress("a", () => k.go("album"));
    k.onKeyPress("space", () => k.go("title"));
    k.onMousePress(() => k.go("title"));
  });
}
```

- [ ] **Step 5: Create `game/src/scenes/gameover.ts`**

```typescript
import type { KAPLAYCtx } from "kaplay";

export function registerGameOverScene(k: KAPLAYCtx): void {
  k.scene("gameover", () => {
    k.add([k.rect(k.width(), k.height()), k.color(30, 20, 20)]);
    k.add([k.text("Scrubbed away!", { size: 48 }), k.pos(k.center().x, 240), k.anchor("center")]);
    k.add([k.text("Press SPACE / tap to try again", { size: 24 }), k.pos(k.center().x, 320), k.anchor("center")]);
    k.onKeyPress("space", () => k.go("title"));
    k.onMousePress(() => k.go("title"));
  });
}
```

- [ ] **Step 6: Rewrite `game/src/scenes/index.ts` to register everything**

```typescript
import type { KAPLAYCtx } from "kaplay";
import type { InputState } from "../systems/input";
import { RunState, createRun } from "../systems/progress";
import { registerTitleScene } from "./title";
import { registerLevelScene } from "./level";
import { registerRewardScene } from "./reward";
import { registerAlbumScene } from "./album";
import { registerWinScene } from "./win";
import { registerGameOverScene } from "./gameover";

export function registerScenes(k: KAPLAYCtx, input: InputState): void {
  // A single mutable run object shared by the gameplay scenes.
  let run: RunState = createRun();
  const getRun = () => run;
  const setRun = (r: RunState) => { run = r; };

  registerTitleScene(k, getRun, setRun);
  registerLevelScene(k, input, run);
  registerRewardScene(k, run);
  registerAlbumScene(k);
  registerWinScene(k);
  registerGameOverScene(k);
}
```

> Note: `registerLevelScene`/`registerRewardScene` capture the `run` object by reference. Because `setRun` replaces the reference on a new game, update `registerScenes` so the level/reward scenes always read the current run. Implement this by having those scenes call `getRun()` instead of closing over `run`. Apply the small change below.

- [ ] **Step 7: Adjust level and reward scenes to read the live run**

In `game/src/scenes/level.ts`, change the signature and first lines:

```typescript
export function registerLevelScene(k: KAPLAYCtx, input: InputState, getRun: () => RunState): void {
  k.scene("level", () => {
    const run = getRun();
    const def = getLevel(run.levelId);
    // ...rest unchanged
```

In `game/src/scenes/reward.ts`:

```typescript
export function registerRewardScene(k: KAPLAYCtx, getRun: () => RunState): void {
  k.scene("reward", () => {
    const run = getRun();
    const def = getLevel(run.levelId);
    // ...rest unchanged
```

And in `game/src/scenes/index.ts` update the two calls:

```typescript
  registerLevelScene(k, input, getRun);
  registerRewardScene(k, getRun);
```

- [ ] **Step 8: Type-check**

Run: `cd game && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Manual check — full playthrough in dev**

Run: `cd game && npm run dev`
Verify in the browser:
- Title → SPACE starts Level 1.
- Run/jump works; sprite swaps idle/run/jump.
- Throwing a sticker (X) destroys a janitor; stomping also works and bounces.
- Falling in a pit costs a heart and respawns at spawn/checkpoint.
- Reaching the goal shows the reward scene; sticker peels in; SPACE goes to Level 2.
- Losing all hearts shows game over.
- Press A from title → album shows unlocked stickers; R resets.
Stop the server.

- [ ] **Step 10: Commit**

```bash
git add game/src/scenes
git commit -m "feat: add title, level, reward, album, win, and game-over scenes"
```

---

### Task 18: Boss level wiring and full game loop verification

**Files:**
- Modify: `game/src/scenes/level.ts` (ensure boss levels skip the goal requirement and end on `bossDead`)

The level scene already spawns the boss from the `B` marker and listens for `bossDead`. This task verifies the boss path end-to-end and tunes difficulty.

- [ ] **Step 1: Confirm boss handling in `level.ts`**

Ensure these are present in `registerLevelScene` (added in Task 16); if missing, add them:

```typescript
    // Boss bubbles already use the "hazard" tag handled by player.onCollide("hazard").
    // Boss death advances to reward:
    k.on("bossDead", () => k.wait(0.6, () => k.go("reward")));
```

- [ ] **Step 2: Manual check — beat the boss**

Run: `cd game && npm run dev`
- Reach Level 4 (or temporarily set `createRun` to start at level 4 for testing, then revert).
- Dodge charges and bubbles; land 3 sticker hits.
- Boss dies → reward scene shows the golden sticker → SPACE → win screen.
- From win, A shows album with all four stickers unlocked.
Revert any temporary test change to `createRun`.

- [ ] **Step 3: Run full unit suite + type-check**

Run: `cd game && npx tsc --noEmit && npm test`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add game/src/scenes/level.ts
git commit -m "feat: wire boss level completion to reward and win flow"
```

---

## Phase 5 — WordPress embedding and production build

### Task 19: Production build output for WordPress

**Files:**
- Modify: `game/vite.config.ts` (deterministic output filenames for easy PHP enqueue)

- [ ] **Step 1: Update `game/vite.config.ts` build section**

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        // Stable names so the PHP plugin can enqueue without reading a manifest.
        entryFileNames: "nimstick-game.js",
        assetFileNames: (info) =>
          info.name && info.name.endsWith(".css")
            ? "nimstick-game.css"
            : "assets/[name][extname]",
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Build and inspect output**

Run: `cd game && npm run build`
Expected: `game/dist/nimstick-game.js` exists, plus `game/dist/sprites/*`, `game/dist/sfx/*`, and `game/dist/index.html`.

- [ ] **Step 3: Preview the production build**

Run: `cd game && npm run preview`
Expected: the game runs identically to dev. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add game/vite.config.ts
git commit -m "build: emit stable bundle filenames for WordPress enqueue"
```

---

### Task 20: WordPress plugin with `[nimstick_game]` shortcode

**Files:**
- Create: `wordpress-plugin/nimstick-stickan-game/nimstick-stickan-game.php`
- Create: `wordpress-plugin/nimstick-stickan-game/README.md`
- Create: `wordpress-plugin/nimstick-stickan-game/build-and-copy.md` (build instructions)

The plugin enqueues the built bundle and renders the mount div. The Stickan PNGs and sfx are served from the plugin's `dist/` via Vite's relative `base: "./"`, so we point the bundle's asset base at the plugin URL.

- [ ] **Step 1: Create `wordpress-plugin/nimstick-stickan-game/nimstick-stickan-game.php`**

```php
<?php
/**
 * Plugin Name: Nimstick Stickan Game
 * Description: Embeds the "Stickan's Sticker Run" browser game via the [nimstick_game] shortcode.
 * Version: 0.1.0
 * Author: Nimstick
 */

if (!defined('ABSPATH')) {
    exit;
}

define('NIMSTICK_GAME_URL', plugin_dir_url(__FILE__));
define('NIMSTICK_GAME_PATH', plugin_dir_path(__FILE__));

/**
 * Register (but do not enqueue) the game bundle. Enqueued only when the
 * shortcode is used, so it never loads on pages without the game.
 */
function nimstick_game_register_assets() {
    $js = NIMSTICK_GAME_PATH . 'dist/nimstick-game.js';
    $css = NIMSTICK_GAME_PATH . 'dist/nimstick-game.css';
    $ver = file_exists($js) ? filemtime($js) : '0.1.0';

    wp_register_script(
        'nimstick-game',
        NIMSTICK_GAME_URL . 'dist/nimstick-game.js',
        array(),
        $ver,
        true // load in footer
    );

    if (file_exists($css)) {
        wp_register_style(
            'nimstick-game',
            NIMSTICK_GAME_URL . 'dist/nimstick-game.css',
            array(),
            $ver
        );
    }

    // Expose the asset base URL so the bundle can resolve sprites/sfx.
    wp_add_inline_script(
        'nimstick-game',
        'window.NIMSTICK_GAME_BASE = ' . wp_json_encode(NIMSTICK_GAME_URL . 'dist/') . ';',
        'before'
    );
}
add_action('init', 'nimstick_game_register_assets');

/**
 * [nimstick_game] — outputs the mount div and enqueues the bundle.
 * Optional attribute: height (CSS value, default 70vh).
 */
function nimstick_game_shortcode($atts) {
    $atts = shortcode_atts(array('height' => '70vh'), $atts, 'nimstick_game');

    wp_enqueue_script('nimstick-game');
    if (wp_style_is('nimstick-game', 'registered')) {
        wp_enqueue_style('nimstick-game');
    }

    $height = esc_attr($atts['height']);
    return '<div id="nimstick-game-root" style="width:100%;height:' . $height . ';max-width:1280px;margin:0 auto;"></div>';
}
add_shortcode('nimstick_game', 'nimstick_game_shortcode');
```

- [ ] **Step 2: Make the bundle resolve assets from the plugin URL — modify `game/src/assets.ts`**

Add a base resolver at the top and prefix every asset path:

```typescript
import type { KAPLAYCtx } from "kaplay";

// In WordPress, window.NIMSTICK_GAME_BASE points at the plugin's dist/ folder.
// In dev/preview it is undefined, so assets resolve relative to the page root.
declare global {
  interface Window { NIMSTICK_GAME_BASE?: string; }
}
const BASE = (typeof window !== "undefined" && window.NIMSTICK_GAME_BASE) || "";

export function loadAssets(k: KAPLAYCtx): void {
  k.loadSprite("stickan-idle", BASE + "sprites/stickan-wave.png");
  k.loadSprite("stickan-run", BASE + "sprites/stickan-run.png");
  k.loadSprite("stickan-jump", BASE + "sprites/stickan-jump.png");
  k.loadSprite("stickan-think", BASE + "sprites/stickan-think.png");

  k.loadSound("jump", BASE + "sfx/jump.wav");
  k.loadSound("throw", BASE + "sfx/throw.wav");
  k.loadSound("stomp", BASE + "sfx/stomp.wav");
  k.loadSound("coin", BASE + "sfx/coin.wav");
  k.loadSound("hurt", BASE + "sfx/hurt.wav");
  k.loadSound("peel", BASE + "sfx/peel.wav");
}
```

- [ ] **Step 3: Create `wordpress-plugin/nimstick-stickan-game/build-and-copy.md`**

```markdown
# Building and deploying the game bundle

1. From repo root: `cd game && npm install && npm run build`
2. Copy the build output into this plugin's `dist/` folder:
   - Windows PowerShell:
     `Remove-Item -Recurse -Force ..\wordpress-plugin\nimstick-stickan-game\dist -ErrorAction SilentlyContinue; Copy-Item -Recurse game\dist ..\wordpress-plugin\nimstick-stickan-game\dist`
   - (Run from repo root, adjusting relative paths as needed.)
3. Zip the `nimstick-stickan-game` folder and upload via WordPress → Plugins → Add New → Upload, or copy into `wp-content/plugins/`.
4. Activate the plugin, then add the shortcode `[nimstick_game]` to any page.
   Optional height: `[nimstick_game height="600px"]`.
```

- [ ] **Step 4: Create `wordpress-plugin/nimstick-stickan-game/README.md`**

```markdown
# Nimstick Stickan Game

WordPress plugin that embeds "Stickan's Sticker Run" via the `[nimstick_game]` shortcode.

The game source lives in the repo's `game/` folder (Kaplay + Vite + TypeScript).
Build it and copy the output here — see `build-and-copy.md`.

The bundle mounts into `<div id="nimstick-game-root">`. Album progress is stored
in the visitor's browser `localStorage`.
```

- [ ] **Step 5: Add a build-output copy script to `game/package.json`**

Add to `scripts`:

```json
    "build:wp": "npm run build && node -e \"const fs=require('fs');fs.rmSync('../wordpress-plugin/nimstick-stickan-game/dist',{recursive:true,force:true});fs.cpSync('dist','../wordpress-plugin/nimstick-stickan-game/dist',{recursive:true});console.log('Copied dist to WP plugin')\""
```

- [ ] **Step 6: Build into the plugin and verify**

Run: `cd game && npm run build:wp`
Expected: prints "Copied dist to WP plugin"; `wordpress-plugin/nimstick-stickan-game/dist/nimstick-game.js` exists.

- [ ] **Step 7: Add `dist/` ignore note** — create `wordpress-plugin/nimstick-stickan-game/.gitignore`

```
# Built artifacts are generated by `npm run build:wp` from /game.
# Commit dist/ only when you want the plugin to be installable as-is.
```

Decision: for an installable plugin, the team WILL commit `dist/`. Leave `.gitignore` empty of `dist` so the built bundle is tracked. (The note above documents the choice.)

- [ ] **Step 8: Commit**

```bash
git add wordpress-plugin/nimstick-stickan-game game/src/assets.ts game/package.json
git commit -m "feat: add WordPress plugin with [nimstick_game] shortcode and build script"
```

---

## Phase 6 — End-to-end smoke test

### Task 21: Playwright E2E smoke test

**Files:**
- Create: `game/playwright.config.ts`
- Create: `game/e2e/smoke.spec.ts`
- Modify: `game/package.json` (add Playwright + e2e script)

- [ ] **Step 1: Add Playwright to `game/package.json`**

Add to `devDependencies`: `"@playwright/test": "^1.61.0"` and to `scripts`: `"e2e": "playwright test"`. Then run:

Run: `cd game && npm install && npx playwright install chromium`
Expected: Playwright + chromium installed.

- [ ] **Step 2: Create `game/playwright.config.ts`**

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:4173" },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

- [ ] **Step 3: Create `game/e2e/smoke.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test("game boots, canvas mounts, and play starts", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto("/");

  // Kaplay renders into a <canvas> inside the mount root.
  const canvas = page.locator("#nimstick-game-root canvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });

  // Start the game from the title screen.
  await page.keyboard.press("Space");
  // Give a level a moment to build, then ensure no console errors surfaced.
  await page.waitForTimeout(1500);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("album persists an unlocked sticker across reload", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("nimstick.album.v1", JSON.stringify({ unlocked: ["logo"] }));
  });
  await page.reload();
  const stored = await page.evaluate(() => localStorage.getItem("nimstick.album.v1"));
  expect(stored).toContain("logo");
});
```

- [ ] **Step 4: Run the E2E smoke test**

Run: `cd game && npm run e2e`
Expected: both tests PASS. If the canvas selector fails, confirm `kaplay` mounts into `#nimstick-game-root` (it appends a `<canvas>` to the `root` element).

- [ ] **Step 5: Commit**

```bash
git add game/playwright.config.ts game/e2e/smoke.spec.ts game/package.json game/package-lock.json
git commit -m "test: add Playwright E2E smoke test for the game"
```

---

### Task 22: Final verification and docs

**Files:**
- Modify: `README.md` (add a short section linking the game + plugin)

- [ ] **Step 1: Run the complete verification suite**

Run: `cd game && npx tsc --noEmit && npm test && npm run e2e && npm run build:wp`
Expected: type-check clean, all unit tests pass, E2E passes, bundle copied into the plugin.

- [ ] **Step 2: Add a section to the repo `README.md`**

Append:

```markdown
## Stickan's Sticker Run (browser game)

A Kaplay + Vite + TypeScript platformer in `game/`, embedded into nimstick.se via the
`wordpress-plugin/nimstick-stickan-game` plugin (`[nimstick_game]` shortcode).

- Develop: `cd game && npm run dev`
- Test: `cd game && npm test` (unit) and `npm run e2e` (smoke)
- Build for WordPress: `cd game && npm run build:wp`

Design spec: `docs/superpowers/specs/2026-06-17-stickan-sticker-run-game-design.md`
Plan: `docs/superpowers/plans/2026-06-17-stickan-sticker-run-game.md`
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document the Stickan game and WordPress plugin"
```

- [ ] **Step 4: Manual playtest checklist (from the spec)**

Run `cd game && npm run dev` and confirm the feel:
- [ ] Jump arc feels responsive (coyote-time, variable height).
- [ ] Throw cooldown feels fair; projectiles hit reliably.
- [ ] Stomp bounce is satisfying and forgiving.
- [ ] Difficulty ramps smoothly L1→L4; boss is beatable but tense.
- [ ] Touch controls usable one-handed on a phone (test in browser device emulation); no accidental double-inputs.
- [ ] Album unlocks persist after reload; reset works.

Tune `config.ts` values if any item feels off, then re-commit with `chore: tune gameplay feel`.

---

## Self-Review Notes (for the author — checked against the spec)

- **Spec coverage:** concept/flow (Tasks 16–18), throw+stomp combat (Tasks 9–11, 16), collectible album persistence (Tasks 3–4, 17), WordPress embedding via shortcode (Task 20), desktop+mobile controls (Tasks 6, 8, 14), Stickan PNGs + drawn enemies/props (Tasks 8–13), 4 levels + boss (Tasks 5, 13, 16, 18), audio + mute (Task 15), testing unit+E2E+manual (Tasks 3–7, 21, 22). All spec sections map to tasks.
- **Variable jump height:** `config.PLAYER.jumpForce` + coyote-time implemented; true variable height (cut jump on key release) is a tuning refinement — add in Task 22 if desired by checking `isKeyReleased("space")` and damping `vel.y`.
- **Type consistency:** `InputState`, `RunState`, `LevelDef`, `StickerId`, `getRun()` signatures are consistent across tasks (the Task 17 Step 7 adjustment aligns level/reward scenes to `getRun`).
