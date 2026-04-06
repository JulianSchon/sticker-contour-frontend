import { useEffect, useRef } from 'react';
import { scalePath } from '../lib/pathTransforms.ts';
import type { ContourPreviewResponse, ContourParams } from '../types/contour.ts';

interface Props {
  imageDataUrl: string | null;
  contour: ContourPreviewResponse | null;
  params: ContourParams;
  isLoading: boolean;
}

const CANVAS_MAX = 600;

export function CanvasPreview({ imageDataUrl, contour, params, isLoading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      // Expand the canvas to show that area, and shift the image inward by padPx.
      const pad = contour?.pad ?? 0;
      const totalW = img.naturalWidth  + pad * 2;
      const totalH = img.naturalHeight + pad * 2;

      const scale = Math.min(CANVAS_MAX / totalW, CANVAS_MAX / totalH, 1);
      const canvasW = Math.round(totalW * scale);
      const canvasH = Math.round(totalH * scale);
      const padPx = Math.round(pad * scale); // pad in canvas pixels

      canvas.width = canvasW;
      canvas.height = canvasH;

      drawCheckerboard(ctx, canvasW, canvasH);
      // Draw image offset inward by padPx so path coords align with the image
      ctx.drawImage(img, padPx, padPx, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));

      if (!contour) return;

      // Path coords are in bitmap pixel space (0..contour.width, 0..contour.height),
      // but can be negative by up to `pad` pixels.
      // Scale to canvas coords and shift right/down by padPx so negative coords show.
      const scaleX = (img.naturalWidth  * scale) / contour.width;
      const scaleY = (img.naturalHeight * scale) / contour.height;

      const showKiss = params.cutMode === 'kiss' || params.cutMode === 'both';
      const showPerf = (params.cutMode === 'perf' || params.cutMode === 'both') && contour.perfSvgPath;

      if (showKiss) {
        const kissPath = new Path2D(scalePath(contour.kissSvgPath, scaleX, scaleY, padPx, padPx));
        ctx.save();
        ctx.strokeStyle = '#ff00aa';
        ctx.lineWidth = Math.max(1.5, 2 / scale);
        ctx.setLineDash([]);
        ctx.stroke(kissPath);
        ctx.restore();
      }

      if (showPerf && contour.perfSvgPath) {
        const perfPath = new Path2D(scalePath(contour.perfSvgPath, scaleX, scaleY, padPx, padPx));
        ctx.save();
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = Math.max(1.5, 2 / scale);
        ctx.setLineDash([6, 4]);
        ctx.stroke(perfPath);
        ctx.restore();
      }
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, contour, params.cutMode]);

  if (!imageDataUrl) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl border border-gray-200">
        <p className="text-gray-400 text-sm">Upload an image to see the preview</p>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <canvas ref={canvasRef} className="rounded-xl border border-gray-200 max-w-full" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow text-sm text-gray-600">
            <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Detecting contour…
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
        <span className="inline-block w-4 h-0.5 bg-[#ff00aa]" />
        <span>Kiss cut</span>
        <span className="inline-block w-4 border-t-2 border-dashed border-[#ff6600]" />
        <span>Perf cut</span>
        <span className="ml-auto italic">Preview is approximate</span>
      </div>
    </div>
  );
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = 12;
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? '#e0e0e0' : '#f8f8f8';
      ctx.fillRect(x, y, size, size);
    }
  }
}
