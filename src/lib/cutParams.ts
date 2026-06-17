import type { ContourParams } from '../types/contour.ts';
import type { CutSettings } from '../types/editor.ts';

/** Convert editor cut settings into the ContourParams the backend already
 *  consumes. Offsets are in mm (lib/api.ts converts mm→px at 300 DPI). */
export function toContourParams(cut: CutSettings): ContourParams {
  return {
    threshold: 128,
    kissOffset: cut.borderMm,
    perfOffset: cut.borderMm,
    smoothing: 4,
    enclose: true,
    cutMode: 'perf',
    shapeType: cut.mode === 'diecut' ? 'contour' : cut.shapeType,
    shapeSize: 90,
    shapeOffsetX: 0,
    shapeOffsetY: 0,
  };
}
