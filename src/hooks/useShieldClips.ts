import { useEffect } from 'react';
import { Path, Point, type Canvas, type FabricObject } from 'fabric';
import type { StickerTemplate } from '../types/template.ts';
import type { BBox } from '../lib/shieldBBox.ts';
import { nearestShieldIndex } from '../lib/shieldClip.ts';

/**
 * "Different designs" mode: clip every object to the shield its centre sits on,
 * so artwork for one shield can never spill onto the other. The backend only
 * clips the flattened design to the UNION of both shields, so without this an
 * image on the right shield that overhangs left is printed on the left shield.
 *
 * Applied in `before:render`, which also runs for toDataURL/flatten, so the
 * on-screen view and the saved print file always agree. The clips are
 * `excludeFromExport`, keeping them out of undo-history snapshots.
 */
export function useShieldClips(
  canvas: Canvas | null,
  template: StickerTemplate | undefined,
  boxesMm: BBox[],
  enabled: boolean,
  displayWidth: number,
  displayHeight: number,
): void {
  useEffect(() => {
    if (!canvas || !template || !enabled || boxesMm.length < 2) return;

    const sx = displayWidth / template.widthMm;
    const sy = displayHeight / template.heightMm;
    const boxesPx = boxesMm.map(b => ({ x: b.x * sx, y: b.y * sy, w: b.w * sx, h: b.h * sy }));
    const clips = orderToBoxes(template.shields.map(s => toCanvasPath(s.clipPath, sx, sy)), boxesPx);

    const assign = () => {
      for (const obj of canvas.getObjects()) applyClip(obj, clips, boxesPx);
    };
    canvas.on('before:render', assign);
    canvas.requestRenderAll();

    return () => {
      canvas.off('before:render', assign);
      for (const obj of canvas.getObjects()) {
        if (obj.clipPath && clips.includes(obj.clipPath as Path)) {
          obj.clipPath = undefined;
          obj.dirty = true;
        }
      }
      canvas.requestRenderAll();
    };
  }, [canvas, template, boxesMm, enabled, displayWidth, displayHeight]);
}

function applyClip(obj: FabricObject, clips: Path[], boxesPx: BBox[]): void {
  // Translation of the full transform = the object's centre in the canvas plane,
  // correct even while it sits inside a multi-selection group.
  const m = obj.calcTransformMatrix();
  const idx = nearestShieldIndex({ x: m[4], y: m[5] }, boxesPx);
  const clip = idx >= 0 ? clips[idx] : undefined;
  if (obj.clipPath !== clip) {
    obj.clipPath = clip;
    obj.dirty = true;
  }
}

/** Reorder the clip paths so clips[i] is the one sitting in boxesPx[i]. */
function orderToBoxes(paths: Path[], boxesPx: BBox[]): Path[] {
  const out: Path[] = [];
  for (const p of paths) {
    const c = p.getCenterPoint();
    const i = nearestShieldIndex(c, boxesPx);
    if (i >= 0 && !out[i]) out[i] = p;
  }
  return boxesPx.map((_, i) => out[i] ?? paths[i]);
}

function toCanvasPath(d: string, sx: number, sy: number): Path {
  const p = new Path(d, { strokeWidth: 0, stroke: undefined, fill: '#000', absolutePositioned: true, excludeFromExport: true });
  const c = p.getCenterPoint(); // mm
  p.set({ scaleX: sx, scaleY: sy });
  p.setPositionByOrigin(new Point(c.x * sx, c.y * sy), 'center', 'center');
  p.setCoords();
  return p;
}
