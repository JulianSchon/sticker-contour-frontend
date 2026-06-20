# Nimstick Stickan Game

WordPress plugin that embeds "Stickan's Sticker Run" via the `[nimstick_game]` shortcode.

The game source lives in the repo's `game/` folder (Kaplay + Vite + TypeScript).
Build it and copy the output here — see `build-and-copy.md`.

The bundle mounts into `<div id="nimstick-game-root">`. Album progress is stored
in the visitor's browser `localStorage`.

## Placeholder art

`dist/sprites/*.png` and `dist/sfx/*.wav` are generated placeholders. Replace the
PNGs in `game/public/sprites/` (and WAVs in `game/public/sfx/`) with real art, then
rebuild with `npm run build:wp`.
