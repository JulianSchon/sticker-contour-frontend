import { Canvas, StaticCanvas, IText, Rect, Circle, Ellipse, Triangle } from 'fabric';
import type { FabricObject } from 'fabric';
import type { Template, TemplateElement } from '../types/content.ts';

/** Percentage (0..100) of a pixel dimension. */
export function pctToPx(pct: number, dimPx: number): number {
  return (pct / 100) * dimPx;
}

/** Build Fabric objects for a template, sized to a w×h canvas (px). Each object
 *  is tagged with `_layer` so it shows in the Layers panel and serialises. */
export function buildTemplateObjects(template: Template, w: number, h: number): FabricObject[] {
  let counter = 0;
  const tag = (o: FabricObject, kind: 'text' | 'shape', label: string) => {
    (o as unknown as { _layer: { id: string; kind: string; label: string } })._layer = {
      id: `tpl_${template.id}_${counter++}`, kind: kind === 'text' ? 'text' : 'shape', label,
    };
    return o;
  };

  return template.elements.map((el: TemplateElement) => {
    if (el.kind === 'text') {
      const t = new IText(el.text, {
        left: pctToPx(el.xPct, w),
        top: pctToPx(el.yPct, h),
        originX: 'center', originY: 'center',
        fontFamily: el.fontFamily,
        fontSize: pctToPx(el.fontPct, h),
        fill: el.fill,
        fontWeight: el.bold ? 'bold' : 'normal',
        textAlign: el.align ?? 'left',
      });
      return tag(t, 'text', el.text || 'Text');
    }
    const common = {
      left: pctToPx(el.xPct, w), top: pctToPx(el.yPct, h),
      originX: 'center' as const, originY: 'center' as const, fill: el.fill,
    };
    const cw = pctToPx(el.wPct, w);
    const ch = pctToPx(el.hPct, h);
    let shape: FabricObject;
    switch (el.shape) {
      case 'rectangle':   shape = new Rect({ ...common, width: cw, height: ch }); break;
      case 'roundedRect': shape = new Rect({ ...common, width: cw, height: ch, rx: cw * 0.12, ry: cw * 0.12 }); break;
      case 'circle':      shape = new Circle({ ...common, radius: Math.min(cw, ch) / 2 }); break;
      case 'ellipse':     shape = new Ellipse({ ...common, rx: cw / 2, ry: ch / 2 }); break;
      case 'triangle':    shape = new Triangle({ ...common, width: cw, height: ch }); break;
    }
    return tag(shape, 'shape', el.shape);
  });
}

/** Apply a template's objects onto a live Fabric canvas (clears existing). */
export function applyTemplateToCanvas(canvas: Canvas, template: Template): void {
  canvas.remove(...canvas.getObjects());
  for (const obj of buildTemplateObjects(template, canvas.getWidth(), canvas.getHeight())) {
    canvas.add(obj);
  }
  canvas.discardActiveObject();
  canvas.renderAll();
}

/** Render a template to a dataURL thumbnail using an offscreen StaticCanvas. */
export function renderTemplateThumb(template: Template, size = 120): string {
  const c = new StaticCanvas(undefined, { width: size, height: size, backgroundColor: '#ffffff' });
  for (const obj of buildTemplateObjects(template, size, size)) c.add(obj);
  c.renderAll();
  const url = c.toDataURL({ format: 'png', multiplier: 1 });
  void c.dispose();
  return url;
}
