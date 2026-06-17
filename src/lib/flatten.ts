import type { Canvas } from 'fabric';
import { ensureFontsLoaded } from './fontLoading.ts';
import { EDITOR_FONTS } from './editorFonts.ts';

/** The on-screen Fabric canvas is sized for display. To export at print
 *  resolution we render with a multiplier = targetPx / displayPx. */
export function computeExportMultiplier(displayPx: number, targetPx: number): number {
  return targetPx / displayPx;
}

export interface FlattenResult {
  file: File;
  dataUrl: string;
}

/** Render the Fabric canvas to a transparent PNG at the target pixel size and
 *  return both a File (for upload to the contour pipeline) and its data URL
 *  (for the contour page's image preview). `displayWidthPx` is the canvas's
 *  current on-screen width. */
export async function flattenCanvas(
  canvas: Canvas,
  displayWidthPx: number,
  targetWidthPx: number,
  filename = 'design.png',
): Promise<FlattenResult> {
  await ensureFontsLoaded(EDITOR_FONTS.map(f => f.family), 64);
  const multiplier = computeExportMultiplier(displayWidthPx, targetWidthPx);
  const dataUrl = canvas.toDataURL({ format: 'png', multiplier });
  const blob = await (await fetch(dataUrl)).blob();
  return { file: new File([blob], filename, { type: 'image/png' }), dataUrl };
}
