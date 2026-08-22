import { useEffect, useMemo, useRef } from 'react';
import type { Canvas } from 'fabric';
import { cornerPin, fitRectInQuad } from '../../lib/cornerPin.ts';
import { shieldBBoxes } from '../../lib/shieldBBox.ts';
import { TEMPLATE_MOCKUP_SCENES, bandInQuad, visibleLabelCropMm } from '../../lib/templateMockupScenes.ts';
import { useLang } from '../../lib/LangContext.ts';
import type { StickerTemplate } from '../../types/template.ts';

interface Props {
  fabricCanvas: Canvas | null;
  template: StickerTemplate;
  bgColor: string;
}

const BOX_W = 460;      // displayed width of the scene box in px
const OUT_W = 800;      // composed label bitmap width in px

/**
 * Live product mockup for single-shield parametric templates: composes the
 * visible part of the label (bgColor + design, cropped per the scene's
 * visibleWidthRatio) from the Fabric canvas on every render, and corner-pins
 * it onto the scene photo — same mechanics as the sticker MockupCarousel.
 */
export function TemplateMockup({ fabricCanvas, template, bgColor }: Props) {
  const { t } = useLang();
  const outRef = useRef<HTMLCanvasElement>(null);

  const scene = template.shields.length === 1 ? TEMPLATE_MOCKUP_SCENES[template.id] : undefined;

  // Visible slice of the label cut, in template mm space.
  const crop = useMemo(() => {
    if (!scene) return null;
    const cut = shieldBBoxes(template, 'cutPath')[0];
    if (!cut || cut.w <= 0 || cut.h <= 0) return null;
    return visibleLabelCropMm(cut, scene.visibleWidthRatio);
  }, [template, scene]);

  const outH = crop ? Math.max(1, Math.round((OUT_W * crop.h) / crop.w)) : 1;

  // Repaint the composed label whenever Fabric re-renders. Uses a clean
  // snapshot (toCanvasElement) rather than lowerCanvasEl so selection borders
  // and handles never leak into the mockup, throttled to animation frames.
  useEffect(() => {
    const out = outRef.current;
    if (!out || !fabricCanvas || !crop) return;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let timer = 0;
    let last = 0;
    const MIN_MS = 66; // ~15 fps cap — toCanvasElement is a full extra render pass
    const paint = () => {
      last = performance.now();
      const snap = fabricCanvas.toCanvasElement(2);
      if (snap.width === 0) return;
      // Snapshot px per template mm (the snapshot spans the artboard).
      const ppm = snap.width / template.widthMm;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(
        snap,
        crop.x * ppm, crop.y * ppm, crop.w * ppm, crop.h * ppm,
        0, 0, out.width, out.height,
      );
    };
    // Coalesce to animation frames AND rate-limit with a trailing call, so
    // rapid drags repaint at most every MIN_MS but always settle correctly.
    const schedule = () => {
      if (raf || timer) return;
      const wait = Math.max(0, MIN_MS - (performance.now() - last));
      timer = window.setTimeout(() => {
        timer = 0;
        raf = requestAnimationFrame(() => { raf = 0; paint(); });
      }, wait);
    };
    paint();
    fabricCanvas.on('after:render', schedule);
    return () => {
      fabricCanvas.off('after:render', schedule);
      if (raf) cancelAnimationFrame(raf);
      if (timer) window.clearTimeout(timer);
    };
  }, [fabricCanvas, template.widthMm, crop, bgColor]);

  // Pin the composed label onto the scene's quad per the scene's layout mode.
  const transform = useMemo(() => {
    if (!scene || !crop) return 'none';
    const target =
      scene.layout.mode === 'fill' ? scene.corners
      : scene.layout.mode === 'band' ? bandInQuad(scene.corners, crop.h / scene.layout.zoneHeightMm)
      : fitRectInQuad(scene.corners, crop.w / crop.h);
    return cornerPin(OUT_W, outH, target);
  }, [scene, crop, outH]);

  if (!scene || !crop) return null;

  const boxScale = BOX_W / scene.photoW;
  const boxH = scene.photoH * boxScale;

  return (
    <div className="flex flex-col gap-2 items-center">
      <p className="nim-label">{t.mockHeading}</p>
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20"
        style={{ width: BOX_W, height: boxH, maxWidth: '100%' }}
      >
        <div
          style={{
            position: 'absolute', top: 0, left: 0,
            width: scene.photoW, height: scene.photoH,
            transform: `scale(${boxScale})`, transformOrigin: '0 0',
          }}
        >
          <img
            src={scene.photo}
            alt={String(t[scene.labelKey])}
            style={{ position: 'absolute', top: 0, left: 0, width: scene.photoW, height: scene.photoH }}
          />
          <canvas
            ref={outRef}
            width={OUT_W}
            height={outH}
            style={{
              position: 'absolute', top: 0, left: 0,
              transformOrigin: '0 0', transform,
              filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.25))',
            }}
          />
          {scene.foreground && (
            <img
              src={scene.foreground}
              alt=""
              aria-hidden="true"
              style={{ position: 'absolute', top: 0, left: 0, width: scene.photoW, height: scene.photoH, pointerEvents: 'none' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
