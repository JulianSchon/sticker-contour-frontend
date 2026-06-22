import { describe, it, expect } from 'vitest';
import { MOCKUP_SCENES } from './mockupScenes.ts';

describe('MOCKUP_SCENES', () => {
  it('has at least the five starter scenes', () => {
    expect(MOCKUP_SCENES.length).toBeGreaterThanOrEqual(5);
  });

  it('every scene has a unique id', () => {
    const ids = MOCKUP_SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every scene has exactly four corners and positive photo dimensions', () => {
    for (const s of MOCKUP_SCENES) {
      expect(s.corners).toHaveLength(4);
      s.corners.forEach((c) => {
        expect(Number.isFinite(c.x)).toBe(true);
        expect(Number.isFinite(c.y)).toBe(true);
      });
      expect(s.photoW).toBeGreaterThan(0);
      expect(s.photoH).toBeGreaterThan(0);
      expect(s.photo.startsWith('/mockups/')).toBe(true);
    }
  });

  it('no scene currently uses a foreground overlay (hand quad sits clear of the thumb)', () => {
    // The hand photo is framed so the placement quad lies entirely above the
    // thumb; the sticker never overlaps it, so no thumb cutout is needed. The
    // optional `foreground` field stays supported for future scenes.
    expect(MOCKUP_SCENES.some((s) => s.foreground)).toBe(false);
  });
});
