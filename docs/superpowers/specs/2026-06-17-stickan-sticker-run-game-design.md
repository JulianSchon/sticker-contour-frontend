# Stickan's Sticker Run — Game Design Spec

**Date:** 2026-06-17
**Status:** Approved (design) — pending implementation plan
**Author:** Brainstorming session

## Summary

A small, polished side-scrolling platformer for **nimstick.se** starring **Stickan**, the
Nimstick mascot (round cream body, sunglasses, yellow hair swoosh, white gloves, beige shoes,
bold black outline). Stickan runs and jumps through short street/city levels slapping stickers
everywhere. The cleanup crew — mop janitors and broom-wielding old ladies — try to scrub his
stickers off. Stickan throws stickers to defeat them and stomps the rest. Each completed level
awards a new collectible sticker to a persistent **Sticker Album**.

The game is built with **Kaplay** (the MIT-licensed kaboom.js successor) + **Vite** +
**TypeScript**, bundled into a single self-contained JS/CSS package, and embedded into the
WordPress site via a `[nimstick_game]` shortcode (mirroring the existing
`nimstick-sticker-configurator` plugin pattern).

## Goals

- A genuinely fun, shareable 4-level platformer that feels polished, not a tech demo.
- Works on **desktop (keyboard)** and **mobile (on-screen touch controls)**.
- Embeds cleanly into a nimstick.se WordPress page; responsive to any column width.
- Brand-consistent art (cream / black outline / Nimstick yellow / pink + blue accents).
- Fully isolated from the existing React editor app — zero coupling.

## Non-Goals (YAGNI)

- No accounts, no server-side state, no leaderboard (album is local-only).
- No power-ups from stickers in v1 (album is cosmetic/collectible only).
- No level editor, no procedural generation (levels are hand-authored data).
- No multi-week scope creep: 4 levels + 1 boss, two regular enemy types.

## Design Decisions (from brainstorming)

| Decision | Choice |
|----------|--------|
| Ambition | Small polished game: 4 handcrafted levels, 2 enemy types + boss, sound, mobile + desktop |
| Combat | Throw stickers as projectiles **+** stomp; touching enemies/hazards costs a heart |
| Sticker reward | Collectible **Sticker Album** (persistent, cosmetic). Thrown stickers are unlimited ammo |
| Home | **WordPress-embedded** via `[nimstick_game]` shortcode plugin |
| Controls | Desktop keyboard **and** mobile on-screen touch buttons |
| Art | Existing Stickan PNGs as player sprite; enemies/platforms/backgrounds/stickers drawn in brand style |
| Engine | **Kaplay** + Vite + TypeScript, single bundle |

## Game Design

### Game flow

```
Title screen
  → Level 1 → reward → Level 2 → reward → Level 3 → reward → Level 4 (boss) → final reward
  → Win screen (full album)
Death: lose a heart, respawn at last checkpoint; 0 hearts → retry level.
```

- **Title screen:** Play, Sticker Album, mute toggle; Stickan waving.
- **Reward screen** (between levels): Stickan "attaches" the newly earned sticker with a
  pop/peel animation; sticker added to the persistent album.
- **Win screen:** sticker confetti, completed album, "Play again."

### Core mechanics

- **Move:** run left/right; jump with coyote-time and variable jump height for good feel.
- **Throw stickers:** spinning sticker projectile forward; unlimited ammo, short cooldown;
  stuns/defeats cleaners.
- **Stomp:** landing on an enemy's head defeats it and gives a small bounce.
- **Hazards:** mop puddles (slippery), broom swipes (knockback), pits. Contact costs one heart.
- **Hearts:** 3 per level, shown top-left. Mid-level checkpoints reduce punishment.
- **Collectibles:** floating sticker-coins for score (flair) + the guaranteed end-of-level
  album sticker.

### Enemies

- **Mop Janitor** — patrols a platform, leaves a slippery puddle. Defeat by stomp or 1 sticker hit.
- **Broom Granny** — slower; periodic broom *swipe* with reach + knockback. Takes 2 sticker hits
  or a stomp; swipe must be timed around.
- **Boss — The Head Cleaner** (Level 4) — rides a floor-polishing machine, throws soap bubbles,
  charges across the arena. 3 sticker hits while dodging; stomp window after each charge. Drops
  the rare **golden Stickan** sticker.

### Levels (4, escalating difficulty)

1. **Sticker Street** — intro: run, jump, first Mop Janitors, learn to throw. Reward: classic Nimstick logo sticker.
2. **Back Alley** — moving platforms, pits, both enemy types, first checkpoint. Reward: sunglasses sticker.
3. **The Mall** — conveyor platforms (escalators), more brooms, tighter jumps. Reward: themed sticker.
4. **Cleaning HQ** — short approach + boss arena. Reward: golden Stickan sticker → win screen.

### Art & sound

- **Brand palette:** cream body, black outline, Nimstick yellow, pink + blue accents.
- **Stickan:** existing PNGs as sprites — waving pose for idle/title, running/jumping poses for
  movement; sliced/scaled with simple squash-stretch so motion reads from static images. A proper
  sprite sheet, if provided later, drops in cleanly.
- **Enemies, platforms, backgrounds, stickers, UI:** drawn in-canvas / as simple vector-style
  sprites in brand style; parallax city backgrounds for depth.
- **Sound:** light SFX (jump, throw, stomp, collect, hurt, sticker-peel) + optional looping
  chiptune, behind a mute toggle. Royalty-free / CC0 assets only.

### Sticker Album (persistence)

- Grid of slots, one per earnable sticker; earned in color, unearned as greyed silhouettes.
- Stored in `localStorage` so it persists across visits per device. Includes "Reset album".

## Technical Architecture

### Repo additions (no changes to `frontend/`)

```
game/                              # Kaplay + Vite + TypeScript source
  package.json, vite.config.ts
  src/
    main.ts                        # boot Kaplay, register scenes, mount into WP container, start
    config.ts                      # constants (gravity, speeds, hearts, cooldowns…)
    scenes/   title · level · reward · album · win · gameover
    entities/ player · mopJanitor · broomGranny · boss · projectile · pickup
    systems/  input (keyboard+touch) · audio · save (localStorage) · camera
    levels/   level1..4 data (platform/enemy layouts as plain data)
    ui/       hud (hearts/score) · touchControls · muteButton
    assets/   stickan PNGs, drawn sprites, sfx
  # build → single hashed JS + CSS bundle + assets folder

wordpress-plugin/nimstick-stickan-game/
  nimstick-stickan-game.php        # registers [nimstick_game] shortcode, enqueues bundle
  dist/                            # built bundle copied here
```

### Embedding

- Vite build emits one hashed JS bundle, a small CSS file, and an assets folder into the
  plugin's `dist/`.
- The `[nimstick_game]` shortcode outputs `<div id="nimstick-game-root">` and enqueues the
  bundle (same approach as `nimstick-sticker-configurator`).
- On load, `main.ts` locates that div and creates the Kaplay canvas inside it at a fixed
  **16:9** aspect ratio with **letterbox** scaling, fitting any column width responsively.
- Touch controls render only on touch-capable devices.

### Data flow & isolation

- Levels are **plain data** (`levels/levelN.ts`); a single generic `level` scene renders any of
  them. Adding/tuning a level = editing data, not code.
- Each entity is a small self-contained factory (`makePlayer`, `makeMopJanitor`, …) exposing
  behavior via Kaplay components — independently understandable and testable.
- `save.ts` is the only module touching `localStorage`, with a clean interface:
  `getAlbum()` / `unlock(id)` / `reset()`.
- No coupling to the React editor app.

### Testing

- **Unit (Vitest):** pure logic — `save.ts` album state, level-data validation, damage/heart
  logic, projectile/collision helpers.
- **E2E (Playwright):** smoke — bundle loads, canvas mounts, Play starts a level, album
  persists across reload.
- **Manual playtest checklist** (feel can't be unit-tested):
  - Jump arc feels responsive (coyote-time, variable height).
  - Throw cooldown feels fair; projectiles hit reliably.
  - Stomp bounce is satisfying and forgiving.
  - Difficulty ramps smoothly L1→L4; boss is beatable but tense.
  - Touch controls usable one-handed on a phone; no accidental double-inputs.
  - Album unlocks persist after reload; reset works.

## Open Questions / Future

- Optional v2: stickers grant minor perks (double jump, faster throw) — explicitly deferred.
- Optional: a simple local "best time" per level — deferred.
- Final sticker set art can be expanded; album grid is data-driven to accommodate growth.
