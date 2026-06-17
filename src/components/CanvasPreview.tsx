import { useEffect, useRef, useState } from 'react';
import { scalePath } from '../lib/pathTransforms.ts';
import type { ContourPreviewResponse, ContourParams } from '../types/contour.ts';

interface Props {
  imageDataUrl: string | null;
  contour: ContourPreviewResponse | null;
  params: ContourParams;
  isLoading: boolean;
}

const CANVAS_MAX = 600;
const MAX_TILT = 14; // degrees

export function CanvasPreview({ imageDataUrl, contour, params, isLoading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [tilting, setTilting] = useState(false);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -py * 2 * MAX_TILT, ry: px * 2 * MAX_TILT });
    setTilting(true);
  };
  const resetTilt = () => { setTilt({ rx: 0, ry: 0 }); setTilting(false); };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!imageDataUrl) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const img = new Image();
    img.onload = () => {
      // The contour path can extend `pad` pixels beyond the image on all sides.
      const pad = contour?.pad ?? 0;
      const totalW = img.naturalWidth + pad * 2;
      const totalH = img.naturalHeight + pad * 2;

      const scale = Math.min(CANVAS_MAX / totalW, CANVAS_MAX / totalH, 1);
      const canvasW = Math.round(totalW * scale);
      const canvasH = Math.round(totalH * scale);
      const padPx = Math.round(pad * scale);

      canvas.width = canvasW;
      canvas.height = canvasH;

      ctx.clearRect(0, 0, canvasW, canvasH);

      const showKiss = params.cutMode === 'kiss' || params.cutMode === 'both';
      const showPerf = (params.cutMode === 'perf' || params.cutMode === 'both') && !!contour?.perfSvgPath;

      if (contour) {
        const scaleX = (img.naturalWidth * scale) / contour.width;
        const scaleY = (img.naturalHeight * scale) / contour.height;

        // Fill the sticker body white — the real die-cut look. The cut outline is
        // the sticker edge; with an offset > 0 this shows as a white margin/border.
        const bodySvg = showPerf && contour.perfSvgPath ? contour.perfSvgPath : contour.kissSvgPath;
        const bodyPath = new Path2D(scalePath(bodySvg, scaleX, scaleY, padPx, padPx));
        ctx.fillStyle = '#ffffff';
        ctx.fill(bodyPath);

        // Artwork on top of the white body.
        ctx.drawImage(img, padPx, padPx, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));

        // Cut outlines.
        if (showKiss) {
          const kissPath = new Path2D(scalePath(contour.kissSvgPath, scaleX, scaleY, padPx, padPx));
          ctx.save();
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = Math.max(1.5, 2 / scale);
          ctx.setLineDash([]);
          ctx.stroke(kissPath);
          ctx.restore();
        }
        if (showPerf && contour.perfSvgPath) {
          const perfPath = new Path2D(scalePath(contour.perfSvgPath, scaleX, scaleY, padPx, padPx));
          ctx.save();
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = Math.max(1.5, 2 / scale);
          ctx.setLineDash([6, 4]);
          ctx.stroke(perfPath);
          ctx.restore();
        }

        // Glossy laminate sheen across the sticker surface (clipped to the body).
        ctx.save();
        ctx.clip(bodyPath);
        const sheen = ctx.createLinearGradient(0, 0, canvasW * 0.7, canvasH);
        sheen.addColorStop(0, 'rgba(255,255,255,0.30)');
        sheen.addColorStop(0.22, 'rgba(255,255,255,0.07)');
        sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
        sheen.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.restore();
      } else {
        // No contour yet — just show the artwork.
        ctx.drawImage(img, padPx, padPx, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));
      }
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, contour, params.cutMode]);

  if (!imageDataUrl) {
    return (
      <div className="flex items-center justify-center h-full min-h-64 bg-[#0d0d0d]">
        <p className="text-white/30 text-sm">Upload or design a sticker to see the preview</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full flex items-center justify-center bg-[#0d0d0d] p-6"
      style={{ perspective: '1000px' }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      <canvas
        ref={canvasRef}
        className="max-w-full"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilting ? 1.03 : 1})`,
          filter: `drop-shadow(${-tilt.ry * 0.7}px ${18 - tilt.rx * 0.7}px 26px rgba(0,0,0,0.6))`,
          transition: tilting ? 'filter 0.08s linear' : 'transform 0.5s ease, filter 0.5s ease',
          transformStyle: 'preserve-3d',
          willChange: 'transform, filter',
        }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-black/70 px-4 py-2 rounded-full text-sm text-white/80">
            <svg className="animate-spin w-4 h-4 text-nim-yellow" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Detecting contour…
          </div>
        </div>
      )}
    </div>
  );
}
