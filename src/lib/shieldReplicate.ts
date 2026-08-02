import type { BBox } from './shieldBBox.ts';

/** Convert an mm bounding box to pixels at the given pixels-per-mm. */
export function bboxToPx(b: BBox, pxPerMm: number): BBox {
  return { x: Math.round(b.x * pxPerMm), y: Math.round(b.y * pxPerMm), w: Math.round(b.w * pxPerMm), h: Math.round(b.h * pxPerMm) };
}

/**
 * Given a flattened design PNG (data URL) over the whole sheet, copy the LEFT
 * shield region onto the RIGHT shield region (exact copy) and return a new
 * File + data URL. `leftMm`/`rightMm` are the shield bboxes in mm; the PNG is
 * `widthMm` wide, so pxPerMm = image.naturalWidth / widthMm.
 */
export async function replicateLeftToRight(
  dataUrl: string,
  widthMm: number,
  leftMm: BBox,
  rightMm: BBox,
  filename = 'design.png',
): Promise<{ file: File; dataUrl: string }> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { file: await dataUrlToFile(dataUrl, filename), dataUrl };
  ctx.drawImage(img, 0, 0);
  const pxPerMm = img.naturalWidth / widthMm;
  const L = bboxToPx(leftMm, pxPerMm);
  const R = bboxToPx(rightMm, pxPerMm);
  ctx.clearRect(R.x, R.y, R.w, R.h);
  ctx.drawImage(img, L.x, L.y, L.w, L.h, R.x, R.y, R.w, R.h);
  const outUrl = canvas.toDataURL('image/png');
  return { file: await dataUrlToFile(outUrl, filename), dataUrl: outUrl };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

async function dataUrlToFile(url: string, name: string): Promise<File> {
  const blob = await (await fetch(url)).blob();
  return new File([blob], name, { type: 'image/png' });
}
