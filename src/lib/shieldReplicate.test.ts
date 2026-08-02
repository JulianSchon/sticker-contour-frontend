import { describe, it, expect } from 'vitest';
import { bboxToPx } from './shieldReplicate';

describe('bboxToPx', () => {
  it('scales an mm bbox to px by pxPerMm', () => {
    expect(bboxToPx({ x: 10, y: 5, w: 20, h: 8 }, 4)).toEqual({ x: 40, y: 20, w: 80, h: 32 });
  });
});
