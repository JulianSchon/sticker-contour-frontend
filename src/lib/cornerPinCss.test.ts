import { describe, it, expect } from 'vitest';
import { cornerPin } from './cornerPin.ts';
import { MOCKUP_SCENES } from './mockupScenes.ts';

// Reproduce how a browser resolves a CSS matrix3d: it is column-major, applied
// to [x, y, 0, 1], then perspective-divided by w'. This guards the column/row
// layout in cornerPin against regressions and confirms each scene's transform
// actually lands the sticker rectangle on its measured quad.
function projectViaCss(css: string, x: number, y: number): [number, number] {
  const a = css.slice('matrix3d('.length, -1).split(',').map(Number);
  expect(a).toHaveLength(16);
  // column-major: M[row][col] = a[col*4 + row]; z input is 0.
  const xp = a[0] * x + a[4] * y + a[12];
  const yp = a[1] * x + a[5] * y + a[13];
  const wp = a[3] * x + a[7] * y + a[15];
  return [xp / wp, yp / wp];
}

describe('cornerPin CSS matrix3d (browser convention)', () => {
  const sw = 280;
  const sh = 360;
  const srcCorners = [
    { x: 0, y: 0 }, { x: sw, y: 0 }, { x: sw, y: sh }, { x: 0, y: sh },
  ];

  it('maps the sticker rectangle onto every scene quad', () => {
    for (const scene of MOCKUP_SCENES) {
      const css = cornerPin(sw, sh, scene.corners);
      srcCorners.forEach((p, i) => {
        const [x, y] = projectViaCss(css, p.x, p.y);
        // Sub-pixel: only matrix-rounding (6 decimals) error remains (~0.02px).
        expect(Math.abs(x - scene.corners[i].x)).toBeLessThan(0.5);
        expect(Math.abs(y - scene.corners[i].y)).toBeLessThan(0.5);
      });
    }
  });
});
