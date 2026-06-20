# Phase 2 (Slice 1) — Templates & Clipart Libraries

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Enable the editor's **Templates** (MALLAR) and **Elements/clipart** (ELEMENT) tools — apply a starter design, and drop clipart/icons onto the canvas — with content loaded from a **configurable REST endpoint** and a **bundled fallback** (hybrid), so it's fully usable now and WordPress-ready later.

**Architecture:** A `contentSource` module returns `{ templates, clipart }` — fetched from `VITE_CONTENT_URL` (a future WordPress REST base) when set, otherwise the bundled set; malformed remote data is validated and falls back. Templates use a **percent-based element schema** (positions/sizes as % of the artboard) so they're resolution-independent and the same JSON works bundled or from WP (and is what a future "Save as template" will emit). Clipart are image/SVG assets added to the canvas from a URL. New hook methods `applyTemplate()` and `addImageFromUrl()`; two new tool panels; both tools enabled in the rail.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind, `fabric` v6, `@tanstack/react-query` (existing), Vitest + Playwright (existing).

**Repo:** `sticker-contour-frontend` (flat `src/`). Branch: continue on `diy-sticker-editor` (PR #1) unless told otherwise.

**Out of scope (later slices):** the WordPress plugin (CPTs + REST endpoints), "Save as template" persistence, fonts-from-WP, design-JSON-to-order. The backgrounds endpoint is dropped (the Shape tool replaced canvas backgrounds).

**Conventions:** imports use explicit `.ts`/`.tsx`; dark/light theme via the `--w` CSS var + `[data-theme=light]` overrides (don't hardcode whites you don't want themed); i18n via `useLang()`.

---

## File Structure

**New:**
- `src/types/content.ts` — `TemplateElement`, `Template`, `ClipartItem`, `ContentLibrary` types.
- `src/lib/contentSource.ts` — `parseTemplates`, `parseClipart` (validate unknown → typed, drop invalid), `loadContentLibrary(restBase)` (REST-or-bundled + fallback).
- `src/lib/bundledContent.ts` — `BUNDLED_TEMPLATES`, `BUNDLED_CLIPART`.
- `src/lib/templateObjects.ts` — `buildTemplateObjects(template, w, h)` pure-ish factory used by both apply + thumbnail; `pctToPx` helper (pure, tested).
- `src/lib/templateThumb.ts` — `renderTemplateThumb(template)` → dataURL via offscreen Fabric StaticCanvas.
- `src/hooks/useContentLibrary.ts` — react-query hook returning `{ templates, clipart, isLoading }`.
- `src/components/Editor/panels/TemplatesPanel.tsx` — thumbnail grid; click applies.
- `src/components/Editor/panels/ElementsPanel.tsx` — searchable clipart grid; click adds.
- `public/clipart/*.svg` — bundled clipart assets (star, heart, circle-badge, arrow, paw, crown, leaf, bolt).

**Modified:**
- `src/hooks/useFabricEditor.ts` — add `addImageFromUrl(url, label)` and `applyTemplate(template)`.
- `src/components/Editor/ToolRail.tsx` — enable `templates` + `elements`.
- `src/components/Editor/DesignEditor.tsx` — render the two panels, wire library + hook methods.
- `src/lib/i18n.ts` — new strings (en + sv).
- `.env.example` (create if absent) — document `VITE_CONTENT_URL`.

---

## Task 1: Content types

**Files:** Create `src/types/content.ts`

- [ ] **Step 1: Create the types**

```ts
/** A template element positioned in PERCENT of the artboard (0..100), so the
 *  same template renders at any canvas size. Shared by bundled + REST content. */
export type TemplateElement =
  | {
      kind: 'text';
      text: string;
      xPct: number;        // center X, 0..100
      yPct: number;        // center Y, 0..100
      fontPct: number;     // font size as % of artboard height
      fill: string;
      fontFamily: string;
      bold?: boolean;
      align?: 'left' | 'center' | 'right';
    }
  | {
      kind: 'shape';
      shape: 'rectangle' | 'roundedRect' | 'circle' | 'ellipse' | 'triangle';
      xPct: number;        // center X
      yPct: number;        // center Y
      wPct: number;        // width as % of artboard width
      hPct: number;        // height as % of artboard height
      fill: string;
    };

export interface Template {
  id: string;
  name: string;
  category: string;
  elements: TemplateElement[];
}

export interface ClipartItem {
  id: string;
  name: string;
  tags: string[];
  url: string;   // svg/png URL (bundled path or absolute REST URL)
}

export interface ContentLibrary {
  templates: Template[];
  clipart: ClipartItem[];
}
```

- [ ] **Step 2: Verify it compiles**

Run (from repo root): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/content.ts
git commit -m "feat: add content library types (templates, clipart)"
```

---

## Task 2: pctToPx helper (pure, TDD)

**Files:** Create `src/lib/templateObjects.ts`, Test `src/lib/templateObjects.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { pctToPx } from './templateObjects.ts';

describe('pctToPx', () => {
  it('maps a percentage of a dimension to pixels', () => {
    expect(pctToPx(50, 600)).toBe(300);
    expect(pctToPx(0, 600)).toBe(0);
    expect(pctToPx(100, 600)).toBe(600);
  });
  it('handles fractional percentages', () => {
    expect(pctToPx(12.5, 800)).toBe(100);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- templateObjects`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement (helper only for now)**

```ts
import { Canvas, StaticCanvas, IText, Rect, Circle, Ellipse, Triangle } from 'fabric';
import type { FabricObject } from 'fabric';
import type { Template, TemplateElement } from '../types/content.ts';

/** Percentage (0..100) of a pixel dimension. */
export function pctToPx(pct: number, dimPx: number): number {
  return (pct / 100) * dimPx;
}

/** Build Fabric objects for a template, sized to a w×h canvas (px). Each object
 *  is tagged with `_layer` so it shows in the Layers panel and serialises. */
export function buildTemplateObjects(template: Template, w: number, h: number): FabricObject[] {
  let counter = 0;
  const tag = (o: FabricObject, kind: 'text' | 'shape', label: string) => {
    (o as unknown as { _layer: { id: string; kind: string; label: string } })._layer = {
      id: `tpl_${template.id}_${counter++}`, kind: kind === 'text' ? 'text' : 'shape', label,
    };
    return o;
  };

  return template.elements.map((el: TemplateElement) => {
    if (el.kind === 'text') {
      const t = new IText(el.text, {
        left: pctToPx(el.xPct, w),
        top: pctToPx(el.yPct, h),
        originX: 'center', originY: 'center',
        fontFamily: el.fontFamily,
        fontSize: pctToPx(el.fontPct, h),
        fill: el.fill,
        fontWeight: el.bold ? 'bold' : 'normal',
        textAlign: el.align ?? 'left',
      });
      return tag(t, 'text', el.text || 'Text');
    }
    const common = {
      left: pctToPx(el.xPct, w), top: pctToPx(el.yPct, h),
      originX: 'center' as const, originY: 'center' as const, fill: el.fill,
    };
    const cw = pctToPx(el.wPct, w);
    const ch = pctToPx(el.hPct, h);
    let shape: FabricObject;
    switch (el.shape) {
      case 'rectangle':   shape = new Rect({ ...common, width: cw, height: ch }); break;
      case 'roundedRect': shape = new Rect({ ...common, width: cw, height: ch, rx: cw * 0.12, ry: cw * 0.12 }); break;
      case 'circle':      shape = new Circle({ ...common, radius: Math.min(cw, ch) / 2 }); break;
      case 'ellipse':     shape = new Ellipse({ ...common, rx: cw / 2, ry: ch / 2 }); break;
      case 'triangle':    shape = new Triangle({ ...common, width: cw, height: ch }); break;
    }
    return tag(shape, 'shape', el.shape);
  });
}

/** Apply a template's objects onto a live Fabric canvas (clears existing). */
export function applyTemplateToCanvas(canvas: Canvas, template: Template): void {
  canvas.remove(...canvas.getObjects());
  for (const obj of buildTemplateObjects(template, canvas.getWidth(), canvas.getHeight())) {
    canvas.add(obj);
  }
  canvas.discardActiveObject();
  canvas.renderAll();
}

/** Render a template to a dataURL thumbnail using an offscreen StaticCanvas. */
export function renderTemplateThumb(template: Template, size = 120): string {
  const c = new StaticCanvas(undefined, { width: size, height: size, backgroundColor: '#ffffff' });
  for (const obj of buildTemplateObjects(template, size, size)) c.add(obj);
  c.renderAll();
  const url = c.toDataURL({ format: 'png', multiplier: 1 });
  void c.dispose();
  return url;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- templateObjects`
Expected: PASS (the `pctToPx` tests).

- [ ] **Step 5: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors. If any fabric v6 name differs (`StaticCanvas`, `toDataURL` options), check `node_modules/fabric` types and adjust; report the change.

- [ ] **Step 6: Commit**

```bash
git add src/lib/templateObjects.ts src/lib/templateObjects.test.ts
git commit -m "feat: percent-based template object builder + thumbnail"
```

---

## Task 3: Bundled content

**Files:** Create `src/lib/bundledContent.ts`; Create the clipart SVGs under `public/clipart/`.

- [ ] **Step 1: Create 8 clipart SVGs**

Create these files (simple single-color icons; `currentColor` not needed — use a fill). Example `public/clipart/star.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 5l13 27 30 4-22 21 6 30-27-15-27 15 6-30L7 36l30-4z" fill="#FFCC00"/></svg>
```
Create the remaining 7 with these names + simple shapes/colors (any clean single icon is fine):
`heart.svg` (red heart), `badge.svg` (yellow circle ring), `arrow.svg` (blue arrow), `paw.svg` (dark paw), `crown.svg` (gold crown), `leaf.svg` (green leaf), `bolt.svg` (yellow lightning bolt).

- [ ] **Step 2: Create the bundled manifest**

Create `src/lib/bundledContent.ts`:
```ts
import type { Template, ClipartItem } from '../types/content.ts';

export const BUNDLED_CLIPART: ClipartItem[] = [
  { id: 'star',  name: 'Star',  tags: ['star', 'favourite', 'rating'], url: '/clipart/star.svg' },
  { id: 'heart', name: 'Heart', tags: ['heart', 'love', 'like'],       url: '/clipart/heart.svg' },
  { id: 'badge', name: 'Badge', tags: ['badge', 'circle', 'ring'],     url: '/clipart/badge.svg' },
  { id: 'arrow', name: 'Arrow', tags: ['arrow', 'direction'],          url: '/clipart/arrow.svg' },
  { id: 'paw',   name: 'Paw',   tags: ['paw', 'pet', 'dog', 'cat'],    url: '/clipart/paw.svg' },
  { id: 'crown', name: 'Crown', tags: ['crown', 'king', 'royal'],      url: '/clipart/crown.svg' },
  { id: 'leaf',  name: 'Leaf',  tags: ['leaf', 'nature', 'plant'],     url: '/clipart/leaf.svg' },
  { id: 'bolt',  name: 'Bolt',  tags: ['bolt', 'lightning', 'energy'], url: '/clipart/bolt.svg' },
];

export const BUNDLED_TEMPLATES: Template[] = [
  {
    id: 'name-badge', name: 'Name badge', category: 'Basics',
    elements: [
      { kind: 'shape', shape: 'roundedRect', xPct: 50, yPct: 50, wPct: 86, hPct: 46, fill: '#ffed00' },
      { kind: 'text', text: 'YOUR NAME', xPct: 50, yPct: 50, fontPct: 13, fill: '#111111', fontFamily: 'Poppins', bold: true, align: 'center' },
    ],
  },
  {
    id: 'circle-logo', name: 'Circle logo', category: 'Basics',
    elements: [
      { kind: 'shape', shape: 'circle', xPct: 50, yPct: 50, wPct: 80, hPct: 80, fill: '#111111' },
      { kind: 'text', text: 'LOGO', xPct: 50, yPct: 50, fontPct: 16, fill: '#ffed00', fontFamily: 'Impact', bold: true, align: 'center' },
    ],
  },
  {
    id: 'quote', name: 'Quote', category: 'Fun',
    elements: [
      { kind: 'shape', shape: 'rectangle', xPct: 50, yPct: 50, wPct: 92, hPct: 60, fill: '#3b82f6' },
      { kind: 'text', text: 'STAY\nWILD', xPct: 50, yPct: 50, fontPct: 18, fill: '#ffffff', fontFamily: 'Impact', bold: true, align: 'center' },
    ],
  },
];
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/bundledContent.ts public/clipart
git commit -m "feat: bundled templates + clipart assets"
```

---

## Task 4: Content source (REST or bundled, validated) — TDD

**Files:** Create `src/lib/contentSource.ts`, Test `src/lib/contentSource.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseTemplates, parseClipart } from './contentSource.ts';

describe('parseClipart', () => {
  it('keeps valid items and drops malformed ones', () => {
    const out = parseClipart([
      { id: 'a', name: 'A', tags: ['x'], url: '/a.svg' },
      { id: 'b', url: 123 },              // bad url
      { name: 'no id' },                  // missing id
      'nonsense',
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a');
  });
  it('returns [] for non-arrays', () => {
    expect(parseClipart(null)).toEqual([]);
    expect(parseClipart({})).toEqual([]);
  });
});

describe('parseTemplates', () => {
  it('keeps templates with a valid elements array', () => {
    const out = parseTemplates([
      { id: 't1', name: 'T1', category: 'C', elements: [{ kind: 'text', text: 'Hi', xPct: 50, yPct: 50, fontPct: 10, fill: '#000', fontFamily: 'Poppins' }] },
      { id: 't2', name: 'no elements' },  // missing elements
    ]);
    expect(out.map(t => t.id)).toEqual(['t1']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- contentSource`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
import type { ClipartItem, Template, ContentLibrary } from '../types/content.ts';
import { BUNDLED_TEMPLATES, BUNDLED_CLIPART } from './bundledContent.ts';

function isStr(v: unknown): v is string { return typeof v === 'string'; }

export function parseClipart(data: unknown): ClipartItem[] {
  if (!Array.isArray(data)) return [];
  const out: ClipartItem[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    if (!isStr(o.id) || !isStr(o.name) || !isStr(o.url)) continue;
    const tags = Array.isArray(o.tags) ? o.tags.filter(isStr) : [];
    out.push({ id: o.id, name: o.name, url: o.url, tags });
  }
  return out;
}

export function parseTemplates(data: unknown): Template[] {
  if (!Array.isArray(data)) return [];
  const out: Template[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    if (!isStr(o.id) || !isStr(o.name) || !Array.isArray(o.elements) || o.elements.length === 0) continue;
    out.push({
      id: o.id, name: o.name,
      category: isStr(o.category) ? o.category : 'Other',
      elements: o.elements as Template['elements'],
    });
  }
  return out;
}

/** Load the content library. With a REST base (e.g. WordPress), fetch
 *  /templates and /clipart and validate; otherwise (or on any error) use the
 *  bundled set. A partial/empty remote result also falls back to bundled. */
export async function loadContentLibrary(restBase?: string): Promise<ContentLibrary> {
  if (!restBase) return { templates: BUNDLED_TEMPLATES, clipart: BUNDLED_CLIPART };
  const base = restBase.replace(/\/$/, '');
  try {
    const [tplRes, clipRes] = await Promise.all([
      fetch(`${base}/templates`),
      fetch(`${base}/clipart`),
    ]);
    const templates = parseTemplates(tplRes.ok ? await tplRes.json() : null);
    const clipart = parseClipart(clipRes.ok ? await clipRes.json() : null);
    return {
      templates: templates.length ? templates : BUNDLED_TEMPLATES,
      clipart: clipart.length ? clipart : BUNDLED_CLIPART,
    };
  } catch {
    return { templates: BUNDLED_TEMPLATES, clipart: BUNDLED_CLIPART };
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- contentSource`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/contentSource.ts src/lib/contentSource.test.ts
git commit -m "feat: content source with REST-or-bundled fallback + validation"
```

---

## Task 5: useContentLibrary hook

**Files:** Create `src/hooks/useContentLibrary.ts`

- [ ] **Step 1: Implement**

```ts
import { useQuery } from '@tanstack/react-query';
import { loadContentLibrary } from '../lib/contentSource.ts';
import type { ContentLibrary } from '../types/content.ts';

const REST_BASE = import.meta.env.VITE_CONTENT_URL as string | undefined;

const EMPTY: ContentLibrary = { templates: [], clipart: [] };

export function useContentLibrary(): { library: ContentLibrary; isLoading: boolean } {
  const query = useQuery({
    queryKey: ['content-library', REST_BASE ?? 'bundled'],
    queryFn: () => loadContentLibrary(REST_BASE),
    staleTime: 5 * 60 * 1000,
  });
  return { library: query.data ?? EMPTY, isLoading: query.isLoading };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors. (A QueryClientProvider already wraps the app — used by `useContour`.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useContentLibrary.ts
git commit -m "feat: useContentLibrary hook (react-query)"
```

---

## Task 6: Hook — addImageFromUrl + applyTemplate

**Files:** Modify `src/hooks/useFabricEditor.ts`

- [ ] **Step 1: Add imports**

At the top of `src/hooks/useFabricEditor.ts`, add:
```ts
import { applyTemplateToCanvas } from '../lib/templateObjects.ts';
import type { Template } from '../types/content.ts';
```

- [ ] **Step 2: Add the two methods to the interface**

In the `UseFabricEditor` interface, after `addShape`:
```ts
  addImageFromUrl: (url: string, label: string) => Promise<void>;
  applyTemplate: (template: Template) => void;
```

- [ ] **Step 3: Implement the methods**

Add these callbacks inside the hook (next to `addImageFromFile`):
```ts
  const addImageFromUrl = useCallback(async (url: string, label: string) => {
    if (!canvas) return;
    const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
    const target = canvas.getWidth() * 0.4;
    if (img.width && img.width > 0) img.scaleToWidth(target);
    img.set({ left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: 'center', originY: 'center' });
    setLayerOf(img, { id: nextId(), kind: 'image', label });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
  }, [canvas]);

  const applyTemplate = useCallback((template: Template) => {
    if (!canvas) return;
    applyTemplateToCanvas(canvas, template);
  }, [canvas]);
```

- [ ] **Step 4: Return them**

Add `addImageFromUrl, applyTemplate,` to the hook's returned object.

- [ ] **Step 5: Verify compile + tests**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; existing tests still pass. (`applyTemplateToCanvas` fires `object:added`/`object:removed`, so history + layers update via existing listeners. The clear+add will create a single coalesced-ish history burst; acceptable.)

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useFabricEditor.ts
git commit -m "feat: addImageFromUrl + applyTemplate on the editor hook"
```

---

## Task 7: Templates & Elements panels

**Files:** Create `src/components/Editor/panels/TemplatesPanel.tsx`, `src/components/Editor/panels/ElementsPanel.tsx`

- [ ] **Step 1: TemplatesPanel**

```tsx
import { useMemo } from 'react';
import { useLang } from '../../../lib/LangContext.ts';
import { renderTemplateThumb } from '../../../lib/templateObjects.ts';
import type { Template } from '../../../types/content.ts';

interface Props {
  templates: Template[];
  isLoading: boolean;
  onApply: (template: Template) => void;
}

export function TemplatesPanel({ templates, isLoading, onApply }: Props) {
  const { t } = useLang();
  const thumbs = useMemo(
    () => templates.map(tpl => ({ tpl, src: renderTemplateThumb(tpl) })),
    [templates],
  );

  return (
    <div className="space-y-3">
      <p className="nim-label">{t.edToolTemplates}</p>
      {isLoading && <p className="text-xs text-white/40">{t.edLoading}</p>}
      <div className="grid grid-cols-2 gap-2">
        {thumbs.map(({ tpl, src }) => (
          <button
            key={tpl.id}
            onClick={() => onApply(tpl)}
            title={tpl.name}
            className="rounded-lg border border-white/10 hover:border-nim-yellow overflow-hidden bg-white/5 transition-colors"
          >
            <img src={src} alt={tpl.name} className="w-full aspect-square object-contain" />
            <span className="block text-[10px] text-white/50 px-1 py-1 truncate">{tpl.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ElementsPanel**

```tsx
import { useMemo, useState } from 'react';
import { useLang } from '../../../lib/LangContext.ts';
import type { ClipartItem } from '../../../types/content.ts';

interface Props {
  clipart: ClipartItem[];
  isLoading: boolean;
  onAdd: (item: ClipartItem) => void;
}

export function ElementsPanel({ clipart, isLoading, onAdd }: Props) {
  const { t } = useLang();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return clipart;
    return clipart.filter(c =>
      c.name.toLowerCase().includes(needle) || c.tags.some(tag => tag.includes(needle)),
    );
  }, [clipart, q]);

  return (
    <div className="space-y-3">
      <p className="nim-label">{t.edToolElements}</p>
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={t.edSearch}
        className="w-full bg-nim-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
      />
      {isLoading && <p className="text-xs text-white/40">{t.edLoading}</p>}
      <div className="grid grid-cols-3 gap-2">
        {filtered.map(item => (
          <button
            key={item.id}
            onClick={() => onAdd(item)}
            title={item.name}
            className="aspect-square rounded-lg border border-white/10 hover:border-nim-yellow bg-white/5 p-1.5 flex items-center justify-center transition-colors"
          >
            <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain" />
          </button>
        ))}
      </div>
      {!isLoading && filtered.length === 0 && (
        <p className="text-xs text-white/30">{t.edNoResults}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors (i18n keys added in Task 9 — if it errors on `t.edLoading` etc., do Task 9 first, then re-run).

- [ ] **Step 4: Commit**

```bash
git add src/components/Editor/panels/TemplatesPanel.tsx src/components/Editor/panels/ElementsPanel.tsx
git commit -m "feat: Templates and Elements (clipart) panels"
```

---

## Task 8: Enable the tools in the rail

**Files:** Modify `src/components/Editor/ToolRail.tsx`

- [ ] **Step 1: Enable both tools**

Change:
```ts
const ENABLED: EditorTool[] = ['uploads', 'text', 'shape'];
```
to:
```ts
const ENABLED: EditorTool[] = ['templates', 'uploads', 'text', 'elements', 'shape'];
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Editor/ToolRail.tsx
git commit -m "feat: enable Templates and Elements tools in the rail"
```

---

## Task 9: i18n strings

**Files:** Modify `src/lib/i18n.ts`

- [ ] **Step 1: Add to the `en` object** (near the other `ed*` keys):
```ts
    edSearch: 'Search…',
    edLoading: 'Loading…',
    edNoResults: 'No matches',
```

- [ ] **Step 2: Add to the `sv` object:**
```ts
    edSearch: 'Sök…',
    edLoading: 'Laddar…',
    edNoResults: 'Inga träffar',
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors (en/sv key sets match).

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: i18n strings for content panels"
```

---

## Task 10: Wire panels into DesignEditor

**Files:** Modify `src/components/Editor/DesignEditor.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { TemplatesPanel } from './panels/TemplatesPanel.tsx';
import { ElementsPanel } from './panels/ElementsPanel.tsx';
import { useContentLibrary } from '../../hooks/useContentLibrary.ts';
```

- [ ] **Step 2: Load the library inside the component**

After `const editor = useFabricEditor(...)`:
```tsx
  const { library, isLoading: libLoading } = useContentLibrary();
```

- [ ] **Step 3: Replace the disabled-stub block**

Replace:
```tsx
          {(tool === 'templates' || tool === 'elements') && (
            <p className="text-xs text-white/30">—</p>
          )}
```
with:
```tsx
          {tool === 'templates' && (
            <TemplatesPanel
              templates={library.templates}
              isLoading={libLoading}
              onApply={editor.applyTemplate}
            />
          )}
          {tool === 'elements' && (
            <ElementsPanel
              clipart={library.clipart}
              isLoading={libLoading}
              onAdd={item => void editor.addImageFromUrl(item.url, item.name)}
            />
          )}
```

- [ ] **Step 4: Verify compile + build + tests**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: clean; tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/Editor/DesignEditor.tsx
git commit -m "feat: wire Templates + Elements panels into the editor"
```

---

## Task 11: Document the content endpoint

**Files:** Create/modify `.env.example`

- [ ] **Step 1: Add the variable**

Append to `.env.example` (create if it doesn't exist):
```
# Optional: WordPress REST base that serves /templates and /clipart.
# When unset, the editor uses the bundled content set.
VITE_CONTENT_URL=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: document VITE_CONTENT_URL content endpoint"
```

---

## Task 12: E2E — apply a template and add clipart

**Files:** Modify `e2e/design-editor.spec.ts` (add a new test)

- [ ] **Step 1: Add the test**

```ts
test('templates and clipart libraries work', async ({ page }) => {
  await page.goto('/');

  // Templates: open MALLAR, apply the first template, expect layers to appear.
  await page.getByRole('button', { name: /mallar|templates/i }).click();
  await page.getByRole('button', { name: /name badge|namnbricka|circle logo|quote/i }).first().click();
  await expect(page.getByText(/^(Lager|Layers)$/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /your name|logo|stay/i }).first()).toBeVisible();

  // Elements: open ELEMENT, add a clipart, expect it as a layer.
  await page.getByRole('button', { name: /element/i }).first().click();
  await page.getByRole('button', { name: /star/i }).first().click();
  await expect(page.getByRole('button', { name: /^Star$/ })).toBeVisible();
});
```

- [ ] **Step 2: Run it**

Run: `npm run e2e`
Expected: passes (plus the existing test). If a selector is ambiguous, adjust to match the real DOM; keep the assertions meaningful.

- [ ] **Step 3: Commit**

```bash
git add e2e/design-editor.spec.ts
git commit -m "test: E2E for templates + clipart libraries"
```

---

## Self-Review (completed during planning)

**Spec coverage (Phase 2, slice 1):**
- Templates library + apply → Tasks 2, 3, 7, 10. ✓
- Clipart/Elements library + add to canvas → Tasks 3, 6, 7, 10. ✓
- Enable the disabled Templates/Elements tools → Task 8. ✓
- Hybrid content sourcing (configurable REST + bundled fallback) → Tasks 4, 5, 11. ✓
- Deferred (stated): WP plugin CPTs+REST, Save-as-template, fonts-from-WP, design-JSON-to-order, backgrounds endpoint. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. The clipart SVGs in Task 3 Step 1 list exact filenames + one full example; the remaining 7 are simple single-icon SVGs (acceptable author latitude, not a logic placeholder).

**Type consistency:** `Template`/`TemplateElement`/`ClipartItem`/`ContentLibrary` are defined in Task 1 and used consistently; `buildTemplateObjects`/`applyTemplateToCanvas`/`renderTemplateThumb`/`pctToPx` names match across Tasks 2/6/7; `addImageFromUrl`/`applyTemplate` signatures match between hook (Task 6) and panels/DesignEditor (Tasks 7/10); i18n keys `edSearch`/`edLoading`/`edNoResults` defined in Task 9 and used in Task 7.

**Known simplifications (documented):** template thumbnails render via an offscreen StaticCanvas at mount (fine for a handful of templates); clipart added at 40% canvas width centered; applying a template clears the canvas (replaces current design) — intentional for a starter template.
