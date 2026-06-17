import { useEffect, useRef } from 'react';
import { scalePath } from '../../lib/pathTransforms.ts';
import type { ContourPreviewResponse } from '../../types/contour.ts';

interface Props {
  canvasElRef: React.RefObject<HTMLCanvasElement>;
  displayWidth: number;
  displayHeight: number;
  contour: ContourPreviewResponse | null;
}

/** Renders the Fabric canvas element and a sibling overlay canvas that draws
 *  the live dashed cut line returned by /contour-preview. */
export function EditorCanvas({ canvasElRef, displayWidth, displayHeight, contour }: Props) {
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.width = displayWidth;
    overlay.height = displayHeight;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    if (!contour) return;

    // contour.width/height include pad*2; path coords may be negative by up to pad.
    const scaleX = displayWidth / (contour.width || displayWidth);
    const scaleY = displayHeight / (contour.height || displayHeight);
    const padX = contour.pad * scaleX;
    const padY = contour.pad * scaleY;
    const path = new Path2D(scalePath(contour.kissSvgPath, scaleX, scaleY, padX, padY));
    ctx.strokeStyle = '#ff3b6b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke(path);
  }, [contour, displayWidth, displayHeight]);

  return (
    <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
      <canvas ref={canvasElRef} width={displayWidth} height={displayHeight} className="absolute inset-0" />
      <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
