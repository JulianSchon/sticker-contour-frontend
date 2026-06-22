import { useEffect, useMemo, useRef, useState } from 'react';
import { renderSticker } from '../lib/renderSticker.ts';
import { cornerPin } from '../lib/cornerPin.ts';
import { MOCKUP_SCENES, type MockupScene } from '../lib/mockupScenes.ts';
import { useLang } from '../lib/LangContext.ts';
import type { ContourPreviewResponse, ContourParams } from '../types/contour.ts';
import type { Finish } from './MaterialFinishPicker.tsx';

interface Props {
  imageDataUrl: string | null;
  contour: ContourPreviewResponse | null;
  params: ContourParams;
  finish: Finish;
  /** Injectable for tests; defaults to the bundled manifest. */
  scenes?: MockupScene[];
}

const ROTATE_MS = 4000;
const BOX_W = 460; // displayed width of the scene box in px

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MockupCarousel({ imageDataUrl, contour, params, finish, scenes = MOCKUP_SCENES }: Props) {
  const { t } = useLang();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [bitmapSize, setBitmapSize] = useState({ w: 1, h: 1 });
  const stickerRef = useRef<HTMLCanvasElement>(null);

  const reduced = prefersReducedMotion();
  // Scenes whose photo loaded (or hasn't failed yet). Spec: drop on load error.
  const visible = useMemo(() => scenes.filter((s) => !failed.has(s.id)), [scenes, failed]);
  const count = visible.length;
  const scene = count > 0 ? visible[index % count] : undefined;

  // Keep the index in range as scenes drop out.
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0);
  }, [count, index]);

  // Render the die-cut sticker (no guide strokes) whenever inputs change.
  useEffect(() => {
    const canvas = stickerRef.current;
    if (!canvas || !imageDataUrl) return;
    const img = new Image();
    img.onload = () => {
      renderSticker(canvas, img, contour, params, finish, { showCutLines: false });
      setBitmapSize({ w: canvas.width, h: canvas.height });
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, contour, params.cutMode, params.kissOffset, params.perfOffset, finish, scene]);

  // Auto-rotate (unless paused or reduced-motion).
  useEffect(() => {
    if (paused || reduced || count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, reduced, count]);

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);
  const dropScene = (id: string) => setFailed((prev) => new Set(prev).add(id));

  // Warp transform for the current scene. The sticker canvas lays out at its
  // bitmap size; we corner-pin that box onto the scene's measured quad.
  // bitmapSize is tracked via state so it is reactive (refs are not).
  const transform = useMemo(() => {
    if (!scene) return 'none';
    return cornerPin(bitmapSize.w, bitmapSize.h, scene.corners);
  }, [scene, bitmapSize]);

  if (!imageDataUrl || !contour || !scene) return null;

  const boxScale = BOX_W / scene.photoW;
  const boxH = scene.photoH * boxScale;

  return (
    <div className="flex flex-col gap-2">
      <p className="nim-label">{t.mockHeading}</p>
      <div
        className="relative mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black/20"
        style={{ width: BOX_W, height: boxH }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        onTouchCancel={() => setPaused(false)}
      >
        {/* Unscaled photo-space coordinate box, scaled down to fit. */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0,
            width: scene.photoW, height: scene.photoH,
            transform: `scale(${boxScale})`, transformOrigin: '0 0',
          }}
        >
          <img
            data-testid="mockup-photo"
            src={scene.photo}
            alt={String(t[scene.labelKey])}
            onError={() => dropScene(scene.id)}
            style={{ position: 'absolute', top: 0, left: 0, width: scene.photoW, height: scene.photoH }}
          />
          <canvas
            ref={stickerRef}
            style={{
              position: 'absolute', top: 0, left: 0,
              transformOrigin: '0 0', transform,
              filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.35))',
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

        <button
          aria-label="prev"
          onClick={() => go(-1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white grid place-items-center hover:bg-black/70"
        >‹</button>
        <button
          aria-label="next"
          onClick={() => go(1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white grid place-items-center hover:bg-black/70"
        >›</button>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {visible.map((s, i) => (
          <button
            key={s.id}
            data-testid="mockup-dot"
            aria-label={String(t[s.labelKey])}
            onClick={() => setIndex(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === (index % count) ? 'bg-nim-yellow' : 'bg-white/25'}`}
          />
        ))}
      </div>
    </div>
  );
}
