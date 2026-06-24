import { describe, it, expect } from 'vitest';
import {
  GRAPHTEC_MARGIN_MM, GRAPHTEC_INSET_X_MM, GRAPHTEC_INSET_Y_MM,
  GRAPHTEC_MARK_LEN_MM, GRAPHTEC_MARK_W_MM, getGraphtecCorners,
} from './graphtecMarks.ts';

describe('graphtec mark constants', () => {
  it('mark length is within Graphtec ARMS range (4–20 mm)', () => {
    expect(GRAPHTEC_MARK_LEN_MM).toBeGreaterThanOrEqual(4);
    expect(GRAPHTEC_MARK_LEN_MM).toBeLessThanOrEqual(20);
  });
  it('line thickness is within range (0.3–1.0 mm)', () => {
    expect(GRAPHTEC_MARK_W_MM).toBeGreaterThanOrEqual(0.3);
    expect(GRAPHTEC_MARK_W_MM).toBeLessThanOrEqual(1.0);
  });
  it('margin band leaves room for a mark plus clearance', () => {
    expect(GRAPHTEC_MARGIN_MM).toBeGreaterThanOrEqual(GRAPHTEC_INSET_Y_MM + GRAPHTEC_MARK_LEN_MM / 2);
  });
});

describe('getGraphtecCorners', () => {
  const W = 500, H = 700;
  const marks = getGraphtecCorners(W, H);

  it('returns four marks', () => {
    expect(marks).toHaveLength(4);
  });
  it('places corners inset from the foil left/right edges', () => {
    const xs = marks.map(m => m.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(GRAPHTEC_INSET_X_MM, 5);
    expect(xs[3]).toBeCloseTo(W - GRAPHTEC_INSET_X_MM, 5);
  });
  it('top corners sit inside the top band (negative y), bottom inside the bottom band', () => {
    const top = marks.filter(m => m.y < 0);
    const bot = marks.filter(m => m.y > H);
    expect(top).toHaveLength(2);
    expect(bot).toHaveLength(2);
    top.forEach(m => expect(m.y).toBeCloseTo(-GRAPHTEC_MARGIN_MM + GRAPHTEC_INSET_Y_MM, 5));
    bot.forEach(m => expect(m.y).toBeCloseTo(H + GRAPHTEC_MARGIN_MM - GRAPHTEC_INSET_Y_MM, 5));
  });
  it('arms always point toward the content (inward)', () => {
    for (const m of marks) {
      expect(m.dirX).toBe(m.x < W / 2 ? 1 : -1);
      expect(m.dirY).toBe(m.y < 0 ? 1 : -1);
    }
  });
});
