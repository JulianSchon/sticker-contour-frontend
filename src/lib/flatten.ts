import type { Canvas } from 'fabric';
import { ensureFontsLoaded } from './fontLoading.ts';
import { EDITOR_FONTS } from './editorFonts.ts';

/** The on-screen Fabric canvas is sized for display. To export at print
 *  resolution we render with a multiplier = targetPx / displayPx. */
export function computeExportMultiplier(displayPx: number, targetPx: number): number {
  return targetPx / displayPx;
}

/** Render the Fabric canvas to a transparent PNG File at the target pixel size.
 *  `displayWidthPx` is the canvas's current on-screen width. */
export async function flattenCanvasToFile(
  canvas: Canvas,
  displayWidthPx: number,
  targetWidthPx: number,
  filename = 'design.png',
): Promise<File> {
  await ensureFontsLoaded(EDITOR_FONTS.map(f => f.family), 64);
  const multiplier = computeExportMultiplier(displayWidthPx, targetWidthPx);
  const dataUrl = canvas.toDataURL({ format: 'png', multiplier });
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], filename, { type: 'image/png' });
}
