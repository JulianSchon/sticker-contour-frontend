import type { BBox } from './shieldBBox.ts';
import type { MockupScene } from './mockupScenes.ts';

/**
 * How the composed label is placed inside the scene's quad:
 * - `fit`  — largest aspect-preserving box centered in the quad (loose labels)
 * - `fill` — stretch to the whole quad (prints that cover the entire surface)
 * - `band` — full quad width, height scaled physically: the label's mm height
 *   relative to `zoneHeightMm` (the real-world height the quad represents),
 *   vertically centered and clamped. A 90mm label on a 115mm can covers 78%.
 */
export type MockupLayout =
  | { mode: 'fit' }
  | { mode: 'fill' }
  | { mode: 'band'; zoneHeightMm: number };

/**
 * A product-photo scene for a parametric template. `visibleWidthRatio` is the
 * horizontal fraction of the label that is visible from the scene's viewpoint
 * (centered crop): a full-wrap can only shows its front, and the 170cm bar
 * front only shows the middle 120cm — the rest wraps around the sides.
 */
export interface TemplateMockupScene extends MockupScene {
  visibleWidthRatio: number;
  layout: MockupLayout;
}

export const TEMPLATE_MOCKUP_SCENES: Record<string, TemplateMockupScene> = {
  olburk: {
    id: 'can',
    labelKey: 'mockCan',
    photo: '/mockups/can.jpg',
    photoW: 1000,
    photoH: 1000,
    corners: [{ x: 352, y: 242 }, { x: 648, y: 242 }, { x: 648, y: 748 }, { x: 352, y: 748 }],
    foreground: '/mockups/can-fg.png',
    // ~45% of the full 360° wrap reads as the visible front of the can.
    visibleWidthRatio: 0.45,
    // The drawn can body is 33cl-proportioned: quad height = 115mm of can.
    layout: { mode: 'band', zoneHeightMm: 115 },
  },
  vinflaska: {
    id: 'wine',
    labelKey: 'mockWine',
    photo: '/mockups/wine.jpg',
    photoW: 1000,
    photoH: 1000,
    corners: [{ x: 408, y: 430 }, { x: 592, y: 430 }, { x: 592, y: 845 }, { x: 408, y: 845 }],
    foreground: '/mockups/wine-fg.png',
    visibleWidthRatio: 1,
    layout: { mode: 'fit' },
  },
  barfront: {
    id: 'bar',
    labelKey: 'mockBar',
    photo: '/mockups/bar.jpg',
    photoW: 1000,
    photoH: 1000,
    corners: [{ x: 165, y: 140 }, { x: 855, y: 112 }, { x: 855, y: 712 }, { x: 165, y: 800 }],
    // 120cm of the 170cm print shows on the front; the rest wraps the sides.
    visibleWidthRatio: 1200 / 1700,
    // The print covers the entire bar front — fill the measured quad.
    layout: { mode: 'fill' },
  },
};

export interface CropRectMm {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Centered horizontal crop of the label bbox (mm) down to the visible fraction. */
export function visibleLabelCropMm(label: BBox, visibleWidthRatio: number): CropRectMm {
  const w = label.w * Math.min(1, Math.max(0, visibleWidthRatio));
  return { x: label.x + (label.w - w) / 2, y: label.y, w, h: label.h };
}

type Pt = { x: number; y: number };
type Quad = [Pt, Pt, Pt, Pt];

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/**
 * Full-width horizontal band of the quad, `fraction` of its height (clamped to
 * [0, 1]), vertically centered — interpolated along the quad's side edges so
 * perspective is preserved.
 */
export function bandInQuad(quad: Quad, fraction: number): Quad {
  const f = Math.min(1, Math.max(0, fraction));
  const top = (1 - f) / 2;
  const bottom = top + f;
  const [tl, tr, br, bl] = quad;
  return [lerp(tl, bl, top), lerp(tr, br, top), lerp(tr, br, bottom), lerp(tl, bl, bottom)];
}
