import { describe, it, expect } from 'vitest';
import { sampleEdgeColorRGBA } from './edgeColor';

const solid = (w: number, h: number, r: number, g: number, b: number, a: number) => {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { buf[i*4]=r; buf[i*4+1]=g; buf[i*4+2]=b; buf[i*4+3]=a; }
  return buf;
};

describe('sampleEdgeColorRGBA', () => {
  it('all-black opaque → black', () => {
    expect(sampleEdgeColorRGBA(solid(4, 4, 0, 0, 0, 255), 4, 4)).toEqual({ r: 0, g: 0, b: 0 });
  });
  it('solid red → red', () => {
    expect(sampleEdgeColorRGBA(solid(4, 4, 255, 0, 0, 255), 4, 4)).toEqual({ r: 255, g: 0, b: 0 });
  });
  it('fully transparent border → white fallback', () => {
    expect(sampleEdgeColorRGBA(solid(4, 4, 0, 0, 0, 0), 4, 4)).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('framed: opaque border counted, transparent center ignored', () => {
    const w = 5, h = 5, buf = new Uint8ClampedArray(w*h*4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y*w + x) * 4;
      const border = x === 0 || y === 0 || x === w-1 || y === h-1;
      buf[i] = 0; buf[i+1] = border ? 200 : 50; buf[i+2] = 0; buf[i+3] = border ? 255 : 0;
    }
    expect(sampleEdgeColorRGBA(buf, w, h)).toEqual({ r: 0, g: 200, b: 0 });
  });
});
