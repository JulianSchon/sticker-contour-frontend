import { useEffect, useRef, type ReactNode } from 'react';
import { useLang } from '../../lib/LangContext.ts';

export const RULER = 22; // px gutter for the rulers

interface RulerColors { bg: string; tick: string; label: string; }
const RULER_COLORS: Record<'dark' | 'light', RulerColors> = {
  dark:  { bg: '#141414', tick: 'rgba(255,255,255,0.28)', label: 'rgba(255,255,255,0.5)' },
  light: { bg: '#f3f4f6', tick: 'rgba(0,0,0,0.42)',       label: 'rgba(0,0,0,0.68)' },
};

interface Props {
  canvasElRef: React.RefObject<HTMLCanvasElement>;
  displayWidth: number;
  displayHeight: number;
  widthCm: number;
  heightCm: number;
  /** Centering guides to overlay while dragging (canvas h/v center). */
  guides?: { v: boolean; h: boolean };
  /** Non-interactive overlay drawn over the design canvas (e.g. a template guide). */
  overlay?: ReactNode;
}

/** Renders the Fabric design canvas with cm rulers (0.5 cm ticks) along the
 *  top and left edges. Cut-contour refinement happens on the contour page. */
export function EditorCanvas({ canvasElRef, displayWidth, displayHeight, widthCm, heightCm, guides, overlay }: Props) {
  const { theme } = useLang();
  const topRef = useRef<HTMLCanvasElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);
  const pxPerCm = widthCm > 0 ? displayWidth / widthCm : 0;

  useEffect(() => {
    const colors = RULER_COLORS[theme];
    drawRuler(topRef.current, 'h', displayWidth, widthCm, pxPerCm, colors);
    drawRuler(leftRef.current, 'v', displayHeight, heightCm, pxPerCm, colors);
  }, [displayWidth, displayHeight, widthCm, heightCm, pxPerCm, theme]);

  return (
    <div className="relative" style={{ width: displayWidth + RULER, height: displayHeight + RULER }}>
      {/* corner */}
      <div
        className="absolute top-0 left-0 bg-nim-darker border-r border-b border-white/10 flex items-center justify-center text-[8px] text-white/30"
        style={{ width: RULER, height: RULER }}
      >cm</div>
      {/* top ruler */}
      <canvas ref={topRef} className="absolute top-0" style={{ left: RULER }} />
      {/* left ruler */}
      <canvas ref={leftRef} className="absolute left-0" style={{ top: RULER }} />
      {/* design canvas */}
      <div className="absolute" style={{ left: RULER, top: RULER, width: displayWidth, height: displayHeight }}>
        <canvas ref={canvasElRef} width={displayWidth} height={displayHeight} className="absolute inset-0" />
        {overlay && (
          <div className="pointer-events-none absolute inset-0" style={{ zIndex: 15 }}>{overlay}</div>
        )}
        {/* Centering guides (overlay; non-interactive) */}
        {guides?.v && (
          <div
            className="pointer-events-none absolute top-0 bottom-0"
            style={{ left: '50%', width: 1, marginLeft: -0.5, background: '#FFE600', zIndex: 20 }}
          />
        )}
        {guides?.h && (
          <div
            className="pointer-events-none absolute left-0 right-0"
            style={{ top: '50%', height: 1, marginTop: -0.5, background: '#FFE600', zIndex: 20 }}
          />
        )}
      </div>
    </div>
  );
}

function drawRuler(
  cv: HTMLCanvasElement | null,
  orient: 'h' | 'v',
  lengthPx: number,
  cm: number,
  pxPerCm: number,
  colors: RulerColors,
) {
  if (!cv || pxPerCm <= 0) return;
  const w = orient === 'h' ? lengthPx : RULER;
  const h = orient === 'h' ? RULER : lengthPx;
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = colors.tick;
  ctx.fillStyle = colors.label;
  ctx.font = '9px system-ui, sans-serif';
  ctx.lineWidth = 1;

  for (let i = 0; i <= cm + 1e-6; i += 0.5) {
    const pos = Math.round(i * pxPerCm) + 0.5;
    if (orient === 'h' ? pos > w : pos > h) break;
    const major = Math.abs(i - Math.round(i)) < 1e-6;
    const len = major ? RULER * 0.6 : RULER * 0.3;

    ctx.beginPath();
    if (orient === 'h') { ctx.moveTo(pos, h); ctx.lineTo(pos, h - len); }
    else { ctx.moveTo(w, pos); ctx.lineTo(w - len, pos); }
    ctx.stroke();

    if (major && i > 0) {
      const label = String(Math.round(i));
      if (orient === 'h') ctx.fillText(label, pos + 2, 9);
      else ctx.fillText(label, 2, pos - 2);
    }
  }
}
