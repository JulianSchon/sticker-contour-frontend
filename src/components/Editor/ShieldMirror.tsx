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
      // Fabric renders into a device-pixel backing store (lowerCanvasEl.width =
      // displayWidth × retina/devicePixelRatio), but L/R are in CSS/display px.
      // Scale the SOURCE rect by the backing-store ratio so the copy matches the
      // original's position and size (otherwise it's offset and scaled by DPR).
      const s = out.width > 0 ? src.width / out.width : 1;
      ctx.clearRect(0, 0, out.width, out.height);
      ctx.drawImage(src, L.x * s, L.y * s, L.w * s, L.h * s, R.x, R.y, R.w, R.h);
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
