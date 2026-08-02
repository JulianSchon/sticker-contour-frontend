import { useEffect, useRef } from 'react';
import type { Canvas } from 'fabric';
import type { BBox } from '../../lib/shieldBBox.ts';
import { bboxToPx } from '../../lib/shieldReplicate.ts';

interface Props {
  fabricCanvas: Canvas | null;
  widthMm: number;
  leftMm: BBox;
  rightMm: BBox;
  displayWidth: number;
  displayHeight: number;
}

/** Live, non-interactive copy of the LEFT shield's design drawn over the RIGHT
 *  shield, updated on every Fabric render. Identical-pair mode only. */
export function ShieldMirror({ fabricCanvas, widthMm, leftMm, rightMm, displayWidth, displayHeight }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const out = ref.current;
    if (!out || !fabricCanvas) return;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    const pxPerMm = displayWidth / widthMm;
    const L = bboxToPx(leftMm, pxPerMm);
    const R = bboxToPx(rightMm, pxPerMm);

    const paint = () => {
      const src = fabricCanvas.lowerCanvasEl;
      if (!src) return;
      ctx.clearRect(0, 0, out.width, out.height);
      ctx.drawImage(src, L.x, L.y, L.w, L.h, R.x, R.y, R.w, R.h);
    };
    paint();
    fabricCanvas.on('after:render', paint);
    return () => { fabricCanvas.off('after:render', paint); };
  }, [fabricCanvas, widthMm, leftMm, rightMm, displayWidth]);

  return (
    <canvas
      ref={ref}
      width={displayWidth}
      height={displayHeight}
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 2 }}
    />
  );
}
