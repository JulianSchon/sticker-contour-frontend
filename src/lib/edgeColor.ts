export interface EdgeColor { r: number; g: number; b: number; }

const ALPHA_MIN = 8;
const WHITE: EdgeColor = { r: 255, g: 255, b: 255 };

/**
 * Average of the opaque border pixels of an RGBA buffer (row-major, width*height*4).
 * Falls back to white when the border is fully transparent or the image is empty.
 * Mirrors the backend `sampleEdgeColor` exactly so preview and print match.
 */
export function sampleEdgeColorRGBA(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): EdgeColor {
  if (width < 1 || height < 1) return WHITE;

  let sr = 0, sg = 0, sb = 0, n = 0;
  const at = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    if (rgba[i + 3] >= ALPHA_MIN) { sr += rgba[i]; sg += rgba[i + 1]; sb += rgba[i + 2]; n++; }
  };

  for (let x = 0; x < width; x++) { at(x, 0); at(x, height - 1); }
  for (let y = 1; y < height - 1; y++) { at(0, y); at(width - 1, y); }

  if (n === 0) return WHITE;
  return { r: Math.round(sr / n), g: Math.round(sg / n), b: Math.round(sb / n) };
}

/**
 * Sample the edge color of a loaded image via a scratch canvas. Caps the sampled
 * dimension for speed (border color of a solid background is scale-invariant).
 * Returns white if a 2D context is unavailable (e.g. jsdom).
 */
export function edgeColorFromImage(img: HTMLImageElement): EdgeColor {
  const CAP = 512;
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  if (nw < 1 || nh < 1) return WHITE;

  const scale = Math.min(1, CAP / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return WHITE;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  return sampleEdgeColorRGBA(data, w, h);
}
