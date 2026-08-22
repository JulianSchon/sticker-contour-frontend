import { describe, it, expect } from 'vitest';
import { TEMPLATE_MOCKUP_SCENES, visibleLabelCropMm } from './templateMockupScenes';

describe('visibleLabelCropMm', () => {
  const label = { x: 6, y: 6, w: 204, h: 90 };

  it('full ratio returns the label untouched', () => {
    expect(visibleLabelCropMm(label, 1)).toEqual({ x: 6, y: 6, w: 204, h: 90 });
  });

  it('crops centered horizontally', () => {
    const c = visibleLabelCropMm(label, 0.5);
    expect(c.w).toBeCloseTo(102);
    expect(c.x).toBeCloseTo(6 + 51);
    expect(c.y).toBe(6);
    expect(c.h).toBe(90);
  });

  it('bar shows 120 of 170 cm centered', () => {
    const bar = { x: 6, y: 6, w: 1700, h: 878 };
    const c = visibleLabelCropMm(bar, TEMPLATE_MOCKUP_SCENES.barfront.visibleWidthRatio);
    expect(c.w).toBeCloseTo(1200);
    expect(c.x).toBeCloseTo(6 + 250);
  });

  it('clamps ratio to [0, 1]', () => {
    expect(visibleLabelCropMm(label, 1.5).w).toBe(204);
    expect(visibleLabelCropMm(label, -1).w).toBe(0);
  });
});

describe('TEMPLATE_MOCKUP_SCENES', () => {
  it('covers the three parametric templates with clockwise quads', () => {
    for (const id of ['olburk', 'vinflaska', 'barfront']) {
      const s = TEMPLATE_MOCKUP_SCENES[id];
      expect(s, id).toBeDefined();
      expect(s.corners).toHaveLength(4);
      const [tl, tr, br, bl] = s.corners;
      expect(tr.x).toBeGreaterThan(tl.x);
      expect(br.y).toBeGreaterThan(tr.y);
      expect(bl.y).toBeGreaterThan(tl.y);
      expect(s.visibleWidthRatio).toBeGreaterThan(0);
      expect(s.visibleWidthRatio).toBeLessThanOrEqual(1);
    }
  });
});
