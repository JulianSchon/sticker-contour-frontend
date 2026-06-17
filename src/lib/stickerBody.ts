export interface Bounds { left: number; top: number; width: number; height: number; }
export interface BodyRect extends Bounds { rx: number; }

/** Bounding rect of all content expanded outward by `borderPx`, with a corner
 *  radius proportional to the border (the classic rounded sticker body). */
export function bodyRectFromBounds(content: Bounds, borderPx: number): BodyRect {
  return {
    left: content.left - borderPx,
    top: content.top - borderPx,
    width: content.width + borderPx * 2,
    height: content.height + borderPx * 2,
    rx: borderPx * 1.5,
  };
}
