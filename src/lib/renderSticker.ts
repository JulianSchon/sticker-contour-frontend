import { scalePath } from './pathTransforms.ts';
import type { ContourPreviewResponse, ContourParams } from '../types/contour.ts';
import type { Finish } from '../components/MaterialFinishPicker.tsx';

const CANVAS_MAX = 600;

export interface RenderStickerOpts {
  /** Draw the pink/orange kiss/perf guide strokes. Off for realistic mockups. */
  showCutLines: boolean;
}

/**
 * Draw the die-cut sticker (white body clipped to the contour path, artwork,
 * optional cut-line guides, finish sheen/haze) into `canvas`, sizing the canvas
 * to fit the contour. The canvas is transparent outside the sticker body, so
 * the output doubles as a composite source. No-op if there is no 2D context
 * (e.g. jsdom in tests).
 */
export function renderSticker(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  contour: ContourPreviewResponse | null,
  params: ContourParams,
  finish: Finish,
  opts: RenderStickerOpts,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

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

  const showKiss = opts.showCutLines && (params.cutMode === 'kiss' || params.cutMode === 'both');
  const showPerf =
    (params.cutMode === 'perf' || params.cutMode === 'both') && !!contour?.perfSvgPath;

  if (!contour) {
    ctx.drawImage(img, padPx, padPx, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));
    return;
  }

  const scaleX = (img.naturalWidth * scale) / contour.width;
  const scaleY = (img.naturalHeight * scale) / contour.height;

  // White sticker body clipped to the cut path (the die-cut look).
  const bodySvg = showPerf && contour.perfSvgPath ? contour.perfSvgPath : contour.kissSvgPath;
  const bodyPath = new Path2D(scalePath(bodySvg, scaleX, scaleY, padPx, padPx));
  ctx.fillStyle = '#ffffff';
  ctx.fill(bodyPath);

  // Artwork on the white body.
  ctx.drawImage(img, padPx, padPx, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));

  // Cut-line guides (preview only; never the real product).
  if (showKiss) {
    const kissPath = new Path2D(scalePath(contour.kissSvgPath, scaleX, scaleY, padPx, padPx));
    ctx.save();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke(kissPath);
    ctx.restore();
  }
  if (showPerf && contour.perfSvgPath && opts.showCutLines) {
    const perfPath = new Path2D(scalePath(contour.perfSvgPath, scaleX, scaleY, padPx, padPx));
    ctx.save();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke(perfPath);
    ctx.restore();
  }

  // Surface finish over the body (clipped). Preview only.
  ctx.save();
  ctx.clip(bodyPath);
  if (finish === 'matte') {
    ctx.fillStyle = 'rgba(150,150,150,0.22)';
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else {
    const sheen = ctx.createLinearGradient(0, 0, canvasW * 0.7, canvasH);
    sheen.addColorStop(0, 'rgba(255,255,255,0.30)');
    sheen.addColorStop(0.22, 'rgba(255,255,255,0.07)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }
  ctx.restore();
}
