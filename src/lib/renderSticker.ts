import { scalePath } from './pathTransforms.ts';
import { edgeColorFromImage } from './edgeColor.ts';
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
  finish: Finish = 'glossy',
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

  // Use the perf (outer) path for the sticker BODY shape — independent of whether
  // we draw its colored guide stroke. Mockups want the real body shape, no stroke.
  const usePerf = (params.cutMode === 'perf' || params.cutMode === 'both') && !!contour?.perfSvgPath;
  const showKissStroke = opts.showCutLines && (params.cutMode === 'kiss' || params.cutMode === 'both');
  const showPerfStroke = opts.showCutLines && usePerf;

  if (!contour) {
    ctx.drawImage(img, padPx, padPx, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));
    return;
  }

  const scaleX = (img.naturalWidth * scale) / contour.width;
  const scaleY = (img.naturalHeight * scale) / contour.height;

  // Sticker body clipped to the cut path (the die-cut look). For geometric shapes
  // the cut can extend past the artwork, so fill the body with the image's sampled
  // edge color (background continues to the edge). Contour hugs the art → white.
  const bodySvg = usePerf && contour.perfSvgPath ? contour.perfSvgPath : contour.kissSvgPath;
  const bodyPath = new Path2D(scalePath(bodySvg, scaleX, scaleY, padPx, padPx));
  if (params.shapeType !== 'contour') {
    const c = edgeColorFromImage(img);
    ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fill(bodyPath);

  // Artwork on the body — CLIPPED to the cut path so only what's inside the cut
  // line shows (the real die-cut result). Without this, a rectangular image whose
  // corners fall outside a geometric cut (e.g. a square image in an oval) would
  // poke past the cutline and look wrong.
  ctx.save();
  ctx.clip(bodyPath);
  ctx.drawImage(img, padPx, padPx, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));
  ctx.restore();

  // Cut-line guides (preview only; never the real product).
  if (showKissStroke) {
    const kissPath = new Path2D(scalePath(contour.kissSvgPath, scaleX, scaleY, padPx, padPx));
    ctx.save();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke(kissPath);
    ctx.restore();
  }
  if (showPerfStroke && contour.perfSvgPath) {
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
