## Stickan's Sticker Run (browser game)

A Kaplay + Vite + TypeScript platformer in `game/`, embedded into nimstick.se via the
`wordpress-plugin/nimstick-stickan-game` plugin (`[nimstick_game]` shortcode).

- Develop: `cd game && npm run dev`
- Unit tests: `cd game && npm test`
- E2E smoke: `cd game && npm run e2e`
- Build for WordPress: `cd game && npm run build:wp` (builds and copies the bundle into the plugin)

Art/audio in `game/public/sprites` and `game/public/sfx` are generated placeholders —
replace them with real Stickan art (same filenames) and rebuild.

Design spec: `docs/superpowers/specs/2026-06-17-stickan-sticker-run-game-design.md`
Plan: `docs/superpowers/plans/2026-06-17-stickan-sticker-run-game.md`
