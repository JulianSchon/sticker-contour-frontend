# WP Single-vs-Sheet Flow Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** On the WordPress start page, let the user pick Single sticker or Sheet; both open the design editor, but the single-sticker flow hides all sheet/ARK functionality.

**Architecture:** Add a `flow: 'single' | 'sheet'` intent state in `src/App.tsx`, set by the two start-page cards (both then enter the editor via `wpMode='design'`). Gate the four sheet UI elements (Send-to-sheet button, ARK header badge, post-cut prompt modal, arrange view) on `flow === 'sheet'`. `wpMode` continues to route views; `flow` only controls sheet-feature visibility.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest. WordPress mode = `VITE_MODE=wordpress`.

**Spec:** `docs/superpowers/specs/2026-06-24-wp-single-vs-sheet-flow-design.md`

**Repo/branch:** `c:\Users\hulle\scf-editor`, branch `feat/wp-single-sheet-split` (already created). The cut step is the `wpMode === 'single'` *view* — do not confuse it with `flow === 'single'`; leave the view name as-is.

**Testing note:** `App.tsx` is the top-level shell and isn't unit-tested here. Verification is `tsc` + build + existing tests staying green, plus the manual WP-mode checklist in Task 2.

---

## Task 1: Add `flow` intent and gate sheet UI

**Files:**
- Modify: `src/App.tsx`

All edits below match unique anchor text (line numbers may drift). Make every edit, then verify and commit.

- [ ] **Step 1: Add the `flow` state**

Find:
```tsx
  const [wpMode, setWpMode] = useState<WpMode>('design');
```
Add immediately after it:
```tsx
  // Single vs sheet INTENT, chosen on the WP start page. Separate from wpMode
  // (which only routes views): flow === 'single' hides ALL sheet/ARK UI.
  const [flow, setFlow] = useState<'single' | 'sheet'>('single');
```

- [ ] **Step 2: Single-sticker start card — set flow + relabel**

Find the first start-page card (the "Design your own" button):
```tsx
              <button
                onClick={() => setWpMode('design')}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-white/10 bg-nim-darker hover:border-nim-yellow hover:bg-nim-yellow/5 transition-all text-left"
              >
```
Change its `onClick` to set the single flow:
```tsx
              <button
                onClick={() => { setFlow('single'); setWpMode('design'); }}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-white/10 bg-nim-darker hover:border-nim-yellow hover:bg-nim-yellow/5 transition-all text-left"
              >
```
Then, inside that same button, relabel it from the "design your own" strings to the "single sticker" strings. Find:
```tsx
                  <p className="text-base font-black text-white uppercase tracking-wider group-hover:text-nim-yellow transition-colors">{t.modeDesign}</p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{t.modeDesignDesc}</p>
```
and change them to:
```tsx
                  <p className="text-base font-black text-white uppercase tracking-wider group-hover:text-nim-yellow transition-colors">{t.modeSingle}</p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{t.modeSingleDesc}</p>
```
(`modeSingle` / `modeSingleDesc` already exist in `src/lib/i18n.ts` for both `en` and `sv` — no i18n change needed.)

- [ ] **Step 3: Sheet start card — set flow + enter the editor**

Find the second start-page card (the "Kiss cut sheet" button):
```tsx
              <button
                onClick={() => setWpMode('sheet')}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-white/10 bg-nim-darker hover:border-pink-400 hover:bg-pink-500/5 transition-all text-left"
              >
```
Change its `onClick` to set the sheet flow and enter the EDITOR (not the arrange view):
```tsx
              <button
                onClick={() => { setFlow('sheet'); setWpMode('design'); }}
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-white/10 bg-nim-darker hover:border-pink-400 hover:bg-pink-500/5 transition-all text-left"
              >
```
(Its `modeSheet` / `modeSheetDesc` labels stay unchanged.)

- [ ] **Step 4: Gate the "Send to sheet" button block on the sheet flow**

Find (the cut step's WP-only block containing the Send-to-sheet button):
```tsx
            {IS_WORDPRESS && (
              <>
                <button
                  onClick={handleSendToSheet}
                  disabled={!file || sendingToSheet}
```
Change the opening condition to also require the sheet flow:
```tsx
            {IS_WORDPRESS && flow === 'sheet' && (
              <>
                <button
                  onClick={handleSendToSheet}
                  disabled={!file || sendingToSheet}
```
(Leave the rest of the `<> … </>` block, including `sheetError`, unchanged.)

- [ ] **Step 5: Gate the post-cut "sent to sheet" prompt modal**

Find:
```tsx
      {IS_WORDPRESS && showSheetPrompt && (
```
Change to:
```tsx
      {IS_WORDPRESS && flow === 'sheet' && showSheetPrompt && (
```

- [ ] **Step 6: Gate the ARK header badge**

Find:
```tsx
            {IS_WORDPRESS && sheetItems.length > 0 && (
```
Change to:
```tsx
            {IS_WORDPRESS && flow === 'sheet' && sheetItems.length > 0 && (
```

- [ ] **Step 7: Gate the sheet arrange view render**

Find:
```tsx
        {/* ── WordPress: sheet mode ── */}
        {IS_WORDPRESS && wpMode === 'sheet' && (
          <WordpressPrintPlanningTab
```
Change the condition to also require the sheet flow:
```tsx
        {/* ── WordPress: sheet mode (only in the sheet flow) ── */}
        {IS_WORDPRESS && flow === 'sheet' && wpMode === 'sheet' && (
          <WordpressPrintPlanningTab
```

- [ ] **Step 8: Typecheck + build + tests**

Run:
```bash
cd /c/Users/hulle/scf-editor && npx tsc --noEmit && npx vitest run && npm run build
```
Expected: tsc clean; all existing tests pass; build succeeds. (`flow` is now read in four places and written in two — no unused-variable error.)

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx
git commit -m "feat(wp): split single vs sheet flows; single hides sheet/ARK UI"
```

Then self-review: confirm both cards set `flow` and enter `wpMode='design'`; all four sheet UI elements require `flow === 'sheet'`; no other path can reach the arrange view or build sheet items in single flow; the single card shows `modeSingle` labels. Report Status, results, commit SHA, concerns.

---

## Task 2: Manual verification + PR

**Files:** none (verification + git).

- [ ] **Step 1: Full green check**

Run:
```bash
cd /c/Users/hulle/scf-editor && npx tsc --noEmit && npx vitest run && npm run build
```
Expected: tsc clean, tests pass, build succeeds.

- [ ] **Step 2: Manual verification (WP mode dev build)**

Run a WP-mode dev server (`VITE_MODE=wordpress npm run dev`) and on the start page:
1. **Single sticker:** pick it → design a sticker → continue to cut. Confirm there is **no** "Send to sheet" button, **no** ARK badge in the header, and **no** post-cut sheet prompt; the add-to-cart (DownloadButton) works. Confirm you cannot reach the arrange view.
2. **Sheet:** back to start → pick Sheet → design → cut → confirm the **Send to sheet** button is present, sending shows the prompt, the **ARK(N)** badge appears, and the arrange view (Save Sheet) works — i.e. the full sheet flow is intact.
3. **Back-and-forth:** from sheet flow with items, back-arrow to start, pick Single → confirm sheet UI is hidden; pick Sheet again → confirm items/badge return.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/wp-single-sheet-split
gh pr create --base master --head feat/wp-single-sheet-split \
  --title "feat(wp): split single-sticker vs sheet flows on the start page" \
  --body "Start page now routes Single sticker and Sheet into the same editor, but single-sticker hides all sheet/ARK UI (send-to-sheet button, ARK badge, post-cut prompt, arrange view) via a new \`flow\` intent. Sheet flow unchanged. Spec: docs/superpowers/specs/2026-06-24-wp-single-vs-sheet-flow-design.md"
```

- [ ] **Step 4: Report the PR URL and await the merge decision.**

---

## Notes for the implementer

- **YAGNI:** only add the `flow` state and the four gates + the two card wirings. Do not rename `wpMode` values, touch the editor internals, the cut/contour logic, add-to-cart, or the non-WordPress layout.
- **DRY:** all gating uses the same `flow === 'sheet'` check; no duplicated logic.
- **No data loss:** switching to single flow keeps `sheetItems` in state (just hidden); switching back to sheet restores the badge/arrange view.
