# Stickan: Sticker Shinobi — Design Spec

**Date:** 2026-06-29
**Status:** Approved (design), pending implementation plan
**Repo:** `C:\Users\hulle\sticker-contour-frontend` (Kaplay + Vite + TypeScript game, embedded in WordPress via the `[nimstick_game]` shortcode)

## Goal

Convert the existing run-right platformer ("Stickan's Sticker Run") into a **stand-and-fight ninja side-scroller** in the spirit of Sega's *Shinobi / Shadow Dancer*, starring Stickan as a sticker-throwing ninja. Ship **one polished mission + boss** for v1.

## Pivot Summary

Instead of racing rightward, Stickan plants his feet, faces enemies arriving from **both** sides, and hurls stickers with aimed throws. The mission flows along a horizontal corridor (with jumps over pits/obstacles) and ends at a **boss gate** that only unlocks once all hostages are freed.

This is a **conversion**, not a parallel mode: the old multi-level run-right generator is removed. The Kaplay engine, sprite/art pipeline, projectile, audio, album/reward, boss, and WordPress packaging are reused.

## Combat Pillars

1. **Aimed sticker throws** (the core rhythm):
   - Standing → throw straight ahead (hits standing enemies).
   - Crouch (down) + throw → low throw along the ground.
   - Up + throw → upward throw for aerial targets (helicopter-type enemies).
   - Jump + throw → throw while airborne (forward).
   - Basic throws are **unlimited and snappy**. The old 3-ammo limit is removed; ammo now governs only the magic special.
2. **Ninja magic — "Sticker Storm":** a flashy burst that damages/clears all on-screen enemies. Limited to **~2–3 charges per life**, refilled by rescuing hostages and occasional pickups. Bound to its own button.
3. **Hostage rescue:** trapped "sticker buddies" in cages scattered through the mission. **All must be freed to unlock the boss gate** (throw at / touch the cage to break it). Each rescue grants score and sometimes a magic charge. HUD shows `Freed: N/M`.

## Movement & Controls

- Walk **left and right** freely; **crouch** (down); **jump**.
- **Keyboard:**
  - Move: `←`/`→` or `A`/`D`
  - Crouch / aim low: `↓` or `S`
  - Aim up: `↑` or `W`  *(aiming, not jump)*
  - Jump: `Space`
  - Throw sticker: `X` / `J`
  - Ninja magic: `C` / `Shift`
- **Touch:** existing virtual joystick (left/right, down = crouch, up = aim up) + `JUMP` + `THROW` buttons, plus a **new `MAGIC` button**.

> Note: jump moves off the up-arrow to `Space` only, because up is now an aim direction.

## Health & Meta

- **3 hearts + i-frames** (kept from current game). Enemy contact / hazards cost one heart; brief invulnerability after a hit.
- Keep the **earn-a-sticker + album** payoff: completing the mission awards one reward sticker into the persistent album (localStorage). One mission → one reward for v1.

## Enemies

Reuse and reframe existing enemies; add ambush spawning:

- **Rusher** (current janitor): advances toward Stickan, hurts on contact.
- **Thrower** (current granny): stops at range and lobs a projectile (the already-fixed dust ball).
- **Ambush spawns:** enemies enter from *both* sides as the player advances through the corridor, so facing the correct way matters.
- **Boss:** reuse the current 8-hit boss as the end-of-mission arena fight behind the gate.

Out of scope for v1: a leaping ninja-enemy, *Shadow Dancer* two-plane depth.

## Architecture & File Plan

Reuse the engine and primitives; isolate the new behaviour into focused modules.

**Reused as-is:** `engine.ts`, `assets.ts` + sprite pipeline (`scripts/normalize-art.cjs`), `entities/projectile.ts`, `systems/audio.ts`, `systems/save.ts`, `scenes/reward.ts`, `scenes/album.ts`, `entities/boss.ts`, WordPress plugin packaging.

**New / changed:**
- `entities/player.ts` — add crouch state, two-way facing, **aimed throw direction** (forward / low / up / air), unlimited basic throw.
- `entities/enemies.ts` — advance-toward-player AI; spawn helpers for ambushes from both sides. Keep rusher + thrower behaviours.
- `entities/hostage.ts` *(new)* — caged buddy entity; break-cage-to-free logic; emits "freed" so the mission can track the count.
- `systems/magic.ts` *(new)* — magic-charge state (consume/refill, cap), and the screen-clear "Sticker Storm" effect (damage all on-screen enemies + flash).
- `systems/progress.ts` — extend `RunState` with `magic` charges and `hostagesFreed` / `hostagesTotal`; keep `hearts`/`score`/album.
- `scenes/level.ts` → **mission scene** — stand-and-fight flow, ambush triggers, hostage-gating of the boss gate, boss spawn.
- `levels/` — replace the procedural generator with a **single hand-authored mission layout** (corridor: pits, platforms, enemy spawn markers, hostage markers, boss gate). Remove `levels/generate.ts` and the multi-level list.
- `ui/hud.ts` — add **magic charges** indicator and **hostage counter**; add the **MAGIC** touch button.
- `systems/inputWiring.ts` — add aim-up handling, crouch, and the magic action (keyboard + touch).
- `scenes/title.ts` — retitle; single "Start mission" entry; updated controls text.

## Testing

- **Unit (Vitest), keep existing + add:**
  - `magic.ts`: charge consume/refill, cap, cannot fire at 0 charges.
  - hostage gating: boss gate stays locked until `hostagesFreed === hostagesTotal`.
  - throw-direction selection: given input state (crouch/up/air/standing), the correct throw vector is chosen.
  - `progress.ts`: new fields initialise and update correctly.
- **E2E (Playwright):** start mission → throw (forward + low + up) → free a hostage (counter increments) → use ninja magic (charge decrements, enemies cleared) → all hostages freed unlocks gate → reach boss.
- **Manual in-browser verification** (Playwright-driven, as established): confirm controls, ambushes, and the magic effect render correctly before packaging.

## Art Asks (user-supplied, optional for v1)

v1 runs on current Stickan frames + a derived crouch pose and existing enemy art as placeholders. To fully realise the theme later:
- A **ninja-styled Stickan** (headband/scarf) across the existing anim set.
- A **crouch** frame and an **up-throw** frame.
- A **cage / captured-buddy** sticker for hostages.

These are placeholdered so implementation is not blocked.

## Explicit Non-Goals (v1)

- Melee / close-range attack (not chosen).
- Multi-plane (Shadow Dancer) depth.
- Leaping ninja enemies.
- Multiple missions.
- 8-direction aiming (only forward / low / up / air).

## Success Criteria

- Title → one mission playable end-to-end in browser and in the WordPress embed.
- Aimed throws (forward/low/up/air) all work and feel snappy.
- Ambushes arrive from both sides; facing matters.
- Hostages must all be freed to open the boss gate; HUD reflects progress.
- Ninja magic clears on-screen enemies, limited by charges, refilled by rescues.
- 3-heart health with i-frames; boss defeat awards a sticker into the album.
- All gates green: `tsc`, unit tests, E2E, production build, WP plugin rebuilt + repackaged.
