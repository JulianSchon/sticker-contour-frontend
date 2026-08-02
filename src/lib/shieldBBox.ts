import type { StickerTemplate } from '../types/template.ts';

export interface BBox { x: number; y: number; w: number; h: number; }

/** Sort bounding boxes left-to-right (by x). */
export function orderLeftToRight(boxes: BBox[]): BBox[] {
  return [...boxes].sort((a, b) => a.x - b.x);
}

/**
 * Bounding box (in the template's mm space) of each shield's clip path, ordered
 * left-to-right. Uses the browser's SVG getBBox() by rendering each path into a
 * hidden <svg>. Returns [] if getBBox is unavailable (e.g. jsdom).
 */
export function shieldBBoxes(template: StickerTemplate): BBox[] {
  if (typeof document === 'undefined') return [];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${template.widthMm} ${template.heightMm}`);
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;left:-9999px;top:-9999px;';
  const els = template.shields.map((s) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', s.clipPath);
    svg.appendChild(p);
    return p;
  });
  document.body.appendChild(svg);
  try {
    const boxes = els.map((p) => {
      const b = p.getBBox();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    return orderLeftToRight(boxes);
  } catch {
    return [];
  } finally {
    document.body.removeChild(svg);
  }
}
