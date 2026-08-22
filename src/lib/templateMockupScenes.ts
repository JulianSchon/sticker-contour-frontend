import type { BBox } from './shieldBBox.ts';
import type { MockupScene } from './mockupScenes.ts';

/**
 * A product-photo scene for a parametric template. `visibleWidthRatio` is the
 * horizontal fraction of the label that is visible from the scene's viewpoint
 * (centered crop): a full-wrap can only shows its front, and the 170cm bar
 * front only shows the middle 120cm — the rest wraps around the sides.
 */
export interface TemplateMockupScene extends MockupScene {
  visibleWidthRatio: number;
}

export const TEMPLATE_MOCKUP_SCENES: Record<string, TemplateMockupScene> = {
  olburk: {
    id: 'can',
    labelKey: 'mockCan',
    photo: '/mockups/can.jpg',
    photoW: 1000,
    photoH: 1000,
    corners: [{ x: 388, y: 258 }, { x: 612, y: 258 }, { x: 612, y: 782 }, { x: 388, y: 782 }],
    foreground: '/mockups/can-fg.png',
    // ~45% of the full 360° wrap reads as the visible front of the can.
    visibleWidthRatio: 0.45,
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
