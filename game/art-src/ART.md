# Stickan artwork drop zone

Save the hand-drawn Stickan sprite sheets here as **transparent PNGs**, then tell
Claude they're ready. He'll slice them into Kaplay animations, swap out the
placeholder art, re-tune scale/anchor, and rebuild.

## Filenames to use

| File | Animation | Frames (confirm) | Loop | Notes |
|------|-----------|------------------|------|-------|
| `stickan-idle.png`  | idle (standing)        | 1–2 | yes | the calm "stand" pose |
| `stickan-run.png`   | run cycle              | 6   | yes | horizontal strip |
| `stickan-jump.png`  | jump / airborne        | 4   | no  | arms-up strip |
| `stickan-throw.png` | throw sticker          | 3   | no  | fist cocked → arm extends |
| `stickan-hurt.png`  | hurt / shocked         | 1   | no  | hands-up shocked pose |
| `stickan-cheer.png` | win-screen celebrate   | 1   | no  | optional; the fists-up cheer |

## Sprite-sheet rules

- **PNG, 32-bit RGBA, transparent** background.
- Each strip = **equal-width frame cells, no gaps/margins**, frames left→right.
  (If there are gaps or uneven frames, note it and they'll be cropped manually.)
- **Same scale + same feet baseline across every frame and every strip**, so
  Stickan doesn't resize/jump when switching animations. (If scales differ
  slightly between strips, that's fine — it's normalized per-animation in code.)
- Draw **facing right**; the engine mirrors for leftward movement.
- No baked drop-shadows or glows.

## Per-file info to hand over

For each file: **frame count**, **grid/strip dimensions**, and a suggested **fps**
(e.g. run ~12fps, throw ~14fps).

## Not needed here (kept as current art unless you want to replace them)

Enemies (janitor, granny, boss), `bg-city.png`, and the `ground-*.png` platform
tiles. Provide those too if you'd like — same transparent-PNG / 64×64-tile rules.
