import { describe, it, expect } from 'vitest';
import { TEMPLATE_MOCKUP_SCENES, bandInQuad, visibleLabelCropMm } from './templateMockupScenes';

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

describe('bandInQuad', () => {
  const quad = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 200 }, { x: 0, y: 200 }] as const;

  it('full fraction returns the whole quad', () => {
    expect(bandInQuad([...quad], 1)).toEqual([...quad]);
  });

  it('half fraction returns a centered full-width band', () => {
    const b = bandInQuad([...quad], 0.5);
    expect(b[0]).toEqual({ x: 0, y: 50 });
    expect(b[1]).toEqual({ x: 100, y: 50 });
    expect(b[2]).toEqual({ x: 100, y: 150 });
    expect(b[3]).toEqual({ x: 0, y: 150 });
  });

  it('interpolates along slanted edges (perspective preserved)', () => {
    const slanted = [{ x: 0, y: 0 }, { x: 100, y: 20 }, { x: 100, y: 180 }, { x: 0, y: 200 }] as const;
    const b = bandInQuad([...slanted], 0.5);
    expect(b[0].y).toBeCloseTo(50);
    expect(b[1].y).toBeCloseTo(60);
  });

  it('clamps the fraction above 1 (oversized label fills the zone)', () => {
    expect(bandInQuad([...quad], 130 / 115)).toEqual([...quad]);
  });

  it('90mm label on a 115mm can covers 78% of the body', () => {
    const b = bandInQuad([...quad], 90 / 115);
    expect((b[2].y - b[1].y) / 200).toBeCloseTo(90 / 115);
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
