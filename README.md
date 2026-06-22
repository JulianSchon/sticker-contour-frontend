# Nimstick CUTZ — sticker contour & design tool

React + Vite + TypeScript app (`src/`) for designing custom stickers and generating
print-ready **CutContour** PDFs. Runs standalone (nimscut.com) and embedded in
WordPress/WooCommerce via an iframe (cutz.nimstick.se / nimstick.se).

## Features

- **Design editor** (Fabric.js) — uploads, text + fonts, clipart/elements, shapes,
  templates, layers, undo/redo, cm artboard sizing, 300-DPI flatten.
- **Contour / cut generator** — detects the cut path from the flattened design;
  perf-cut with an adjustable cut-line offset, enclose (outer contour only).
- **Kiss-Cut Sheet builder (ARK)** — send designs to a shared sheet, auto-pack on
  A4/A5, drag-arrange, per-sticker quantity, then Save Sheet → WooCommerce cart.
- **Material & finish** — material is fixed to **Premium Laminated** (selector hidden
  while there's a single option); **Finish** is Glossy or Matte (Matte shows a grey
  haze in the preview only — never in the print file).
- **Responsive** — design page, cut step and ARK all reflow for mobile; the cut step
  hides advanced controls on phones and the WordPress embed drops its duplicate header.
- **Light/Dark theme** (Luke / Vader toggle) with tuned contrast.

## Scripts

- `npm run dev` — standalone dev server (Vite). Proxies `/api` → backend on `:3001`.
- `npm run dev -- --mode wp` — **WordPress mode** (`VITE_MODE=wordpress`, via `.env.wp`):
  shows the WP cut/sheet flows and posts `nimstick_save_design` to the parent window.
- `npm run build` — production build (`tsc && vite build`).
- `npm test` — Vitest unit tests. `npm run e2e` — Playwright E2E.

Local WP testing: `npm run dev -- --mode wp --port 5174`, then open `/wp-harness.html`
(a simulated plugin that captures the saved design).

## Architecture & deployment

- **Frontend:** this repo → **Vercel**. Two deployments build from `master`:
  the standalone site (**nimscut.com**) and the **WordPress-mode** build that the
  WP plugin iframes. Merging to `master` auto-deploys both.
- **Backend:** separate repo `sticker-contour-backend` → **Railway**
  (`sticker-contour-app-production.up.railway.app`); generates CutContour PDFs
  (sharp / potrace / pdfkit). In dev, Vite proxies `/api` to it.
- **WordPress plugin:** `nimstick-sticker-configurator` (lives in the
  `sticker-contour-app` repo, separate from this one). It iframes the WP-mode Vercel
  URL, receives the `nimstick_save_design` postMessage, uploads the PDF + a thumbnail
  to the Media Library, and stores the attachment IDs on the WooCommerce cart/order.
  Pricing is handled by **Uni CPO** off the `uni_cpo_*` option fields.

Specs/plans: `docs/specs/` and `docs/plans/` (DIY editor, templates/clipart,
kiss-cut sheet builder).

---

## Stickan's Sticker Run (browser game)

A separate Kaplay + Vite + TypeScript platformer in `game/`, embedded into nimstick.se
via the `wordpress-plugin/nimstick-stickan-game` plugin (`[nimstick_game]` shortcode).

- Develop: `cd game && npm run dev`
- Unit tests: `cd game && npm test`
- E2E smoke: `cd game && npm run e2e`
- Build for WordPress: `cd game && npm run build:wp` (builds and copies the bundle into the plugin)

Art/audio in `game/public/sprites` and `game/public/sfx` are generated placeholders —
replace them with real Stickan art (same filenames) and rebuild.

Design spec: `docs/superpowers/specs/2026-06-17-stickan-sticker-run-game-design.md`
Plan: `docs/superpowers/plans/2026-06-17-stickan-sticker-run-game.md`
