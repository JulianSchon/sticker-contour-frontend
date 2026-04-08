import { useRef, useState, useEffect, useCallback } from 'react';
import type { PackedCopy, PlannedFile, RegmarkType } from '../../types/printPlanning.ts';
import { GAP_MM } from '../../lib/packer.ts';
import {
  OPOS_MARK_SIZE_MM,
  OPOS_MARGIN_MM,
  OPOS_CENTER_DEPTH,
  getOposMarkXPositions,
} from '../../lib/oposMarks.ts';
import {
  ROLAND_MARGIN_MM,
  ROLAND_HEADER_MM,
  ROLAND_CIRCLE_R_MM,
  ROLAND_INSET_X_MM,
  ROLAND_LMARK_LEN,
  ROLAND_LMARK_W,
  ROLAND_BOT_W_MM,
  ROLAND_BOT_H_MM,
  ROLAND_BOT_GAP_MM,
  ROLAND_INSET_Y_MM,
  ROLAND_WORK_CLEARANCE_MM,
  getRolandCorners,
} from '../../lib/rolandMarks.ts';

interface Props {
  foilWidthMm: number;
  totalLengthMm: number;
  copies: PackedCopy[];
  files: PlannedFile[];
  regmarkType: RegmarkType;
  onCopiesChange: (copies: PackedCopy[]) => void;
  pageLengthMm?: number;  // when set, canvas shows this fixed page height
}

const CANVAS_PAD_MM = 40;

function snapMm(v: number): number {
  return Math.round(v / GAP_MM) * GAP_MM;
}

// ─── OPOS mark layer ─────────────────────────────────────────────────────────
function OposLayer({
  foilWidthMm,
  totalH,
  zoom,
  strokeW,
}: {
  foilWidthMm: number;
  totalH: number;
  zoom: number;
  strokeW: number;
}) {
  const markXPositions = foilWidthMm > 0 ? getOposMarkXPositions(foilWidthMm) : [];
  const markHalf = OPOS_MARK_SIZE_MM / 2;
  const topMarkCY = -OPOS_MARGIN_MM + OPOS_CENTER_DEPTH;
  const botMarkCY = totalH + OPOS_MARGIN_MM - OPOS_CENTER_DEPTH;

  return (
    <>
      {/* Stripe pattern for margin bands */}
      <defs>
        <pattern id="opos-stripe" x="0" y="0" width={8} height={8} patternUnits="userSpaceOnUse"
          patternTransform={`scale(${1 / zoom})`}>
          <line x1="0" y1="8" x2="8" y2="0" stroke="rgba(99,102,241,0.25)" strokeWidth="1.5" />
        </pattern>
      </defs>

      {/* Top margin band */}
      <rect x={0} y={-OPOS_MARGIN_MM} width={foilWidthMm} height={OPOS_MARGIN_MM}
        fill="rgba(99,102,241,0.07)" stroke="rgba(99,102,241,0.3)" strokeWidth={strokeW} />
      <rect x={0} y={-OPOS_MARGIN_MM} width={foilWidthMm} height={OPOS_MARGIN_MM}
        fill="url(#opos-stripe)" />

      {/* Bottom margin band */}
      <rect x={0} y={totalH} width={foilWidthMm} height={OPOS_MARGIN_MM}
        fill="rgba(99,102,241,0.07)" stroke="rgba(99,102,241,0.3)" strokeWidth={strokeW} />
      <rect x={0} y={totalH} width={foilWidthMm} height={OPOS_MARGIN_MM}
        fill="url(#opos-stripe)" opacity={0.5} />

      {/* Band labels */}
      {(['top', 'bot'] as const).map(side => (
        <text key={side}
          x={foilWidthMm / 2}
          y={side === 'top' ? -OPOS_MARGIN_MM / 2 : totalH + OPOS_MARGIN_MM / 2}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={Math.max(4, 7 / zoom)} fill="rgba(99,102,241,0.6)"
          fontFamily="sans-serif" fontWeight="600" letterSpacing={1}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          OPOS REGISTRATION MARKS
        </text>
      ))}

      {/* Top marks */}
      {markXPositions.map(cx => (
        <g key={`top-${cx}`}>
          <rect x={cx - markHalf - 3} y={topMarkCY - markHalf - 3}
            width={OPOS_MARK_SIZE_MM + 6} height={OPOS_MARK_SIZE_MM + 6}
            fill="white" rx={1} />
          <rect x={cx - markHalf} y={topMarkCY - markHalf}
            width={OPOS_MARK_SIZE_MM} height={OPOS_MARK_SIZE_MM} fill="#111827" />
        </g>
      ))}

      {/* Bottom marks */}
      {markXPositions.map(cx => (
        <g key={`bot-${cx}`}>
          <rect x={cx - markHalf - 3} y={botMarkCY - markHalf - 3}
            width={OPOS_MARK_SIZE_MM + 6} height={OPOS_MARK_SIZE_MM + 6}
            fill="white" rx={1} />
          <rect x={cx - markHalf} y={botMarkCY - markHalf}
            width={OPOS_MARK_SIZE_MM} height={OPOS_MARK_SIZE_MM} fill="#111827" />
        </g>
      ))}
    </>
  );
}

// ─── Roland VersaWorks mark layer ────────────────────────────────────────────
function RolandLayer({
  foilWidthMm,
  totalH,
  zoom,
  strokeW,
}: {
  foilWidthMm: number;
  totalH: number;
  zoom: number;
  strokeW: number;
}) {
  const corners = getRolandCorners(foilWidthMm, totalH);
  const r   = ROLAND_CIRCLE_R_MM;
  const lW  = ROLAND_LMARK_W;
  const lLen = ROLAND_LMARK_LEN;

  // L-mark corners sit exactly at the four content-area boundary corners.
  // Each mark has two arms of length lLen:
  //   - one arm along the foil edge pointing toward the nearest circle
  //   - one arm inward along the content boundary
  const lMarks = [
    // TL corner (0, 0): arm up toward circle, arm right into content
    { key:'tl', cx:0,            cy:0,      ex:0,            ey:-lLen,       ix:lLen,          iy:0      },
    // TR corner (foilW, 0)
    { key:'tr', cx:foilWidthMm,  cy:0,      ex:foilWidthMm,  ey:-lLen,       ix:foilWidthMm-lLen, iy:0   },
    // BL corner (0, totalH): arm down toward circle, arm right into content
    { key:'bl', cx:0,            cy:totalH, ex:0,            ey:totalH+lLen, ix:lLen,          iy:totalH },
    // BR corner (foilW, totalH)
    { key:'br', cx:foilWidthMm,  cy:totalH, ex:foilWidthMm,  ey:totalH+lLen, ix:foilWidthMm-lLen, iy:totalH },
  ];

  // Bottom-right sensor rectangle:
  //   right edge = BR circle left edge − BOT_GAP_MM
  const brCircleLeftX = foilWidthMm - ROLAND_INSET_X_MM - r;
  const botRectRightX = brCircleLeftX - ROLAND_BOT_GAP_MM;
  const botRectX      = botRectRightX - ROLAND_BOT_W_MM;
  const botCircleCY   = totalH + ROLAND_MARGIN_MM - ROLAND_INSET_Y_MM; // = totalH + 10
  const botRectY      = botCircleCY - ROLAND_BOT_H_MM / 2;

  return (
    <>
      {/* Top margin band */}
      <rect x={0} y={-ROLAND_MARGIN_MM} width={foilWidthMm} height={ROLAND_MARGIN_MM}
        fill="rgba(234,179,8,0.05)" stroke="rgba(234,179,8,0.25)" strokeWidth={strokeW} />

      {/* Dark VersaWorks header bar */}
      <rect x={0} y={-ROLAND_MARGIN_MM} width={foilWidthMm} height={ROLAND_HEADER_MM}
        fill="rgba(20,14,0,0.82)" />
      <text
        x={foilWidthMm / 2} y={-ROLAND_MARGIN_MM + ROLAND_HEADER_MM / 2}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={Math.max(3, 5.5 / zoom)}
        fill="rgba(255,230,0,0.9)" fontFamily="sans-serif" fontWeight="700" letterSpacing={2}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        VersaWorks
      </text>

      {/* Bottom margin band */}
      <rect x={0} y={totalH} width={foilWidthMm} height={ROLAND_MARGIN_MM}
        fill="rgba(234,179,8,0.05)" stroke="rgba(234,179,8,0.25)" strokeWidth={strokeW} />

      {/* 5 mm clearance zones inside the content area */}
      <rect x={0} y={0} width={foilWidthMm} height={ROLAND_WORK_CLEARANCE_MM}
        fill="rgba(234,179,8,0.12)" />
      <rect x={0} y={totalH - ROLAND_WORK_CLEARANCE_MM} width={foilWidthMm} height={ROLAND_WORK_CLEARANCE_MM}
        fill="rgba(234,179,8,0.12)" />
      <line x1={0} y1={ROLAND_WORK_CLEARANCE_MM} x2={foilWidthMm} y2={ROLAND_WORK_CLEARANCE_MM}
        stroke="rgba(234,179,8,0.55)" strokeWidth={strokeW} strokeDasharray={`${3/zoom} ${3/zoom}`} />
      <line x1={0} y1={totalH - ROLAND_WORK_CLEARANCE_MM} x2={foilWidthMm} y2={totalH - ROLAND_WORK_CLEARANCE_MM}
        stroke="rgba(234,179,8,0.55)" strokeWidth={strokeW} strokeDasharray={`${3/zoom} ${3/zoom}`} />
      <text x={5 / zoom} y={ROLAND_WORK_CLEARANCE_MM / 2} dominantBaseline="middle"
        fontSize={Math.max(3, 5 / zoom)} fill="rgba(234,179,8,0.75)"
        fontFamily="sans-serif" fontWeight="700"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >5 mm clearance</text>
      <text x={5 / zoom} y={totalH - ROLAND_WORK_CLEARANCE_MM / 2} dominantBaseline="middle"
        fontSize={Math.max(3, 5 / zoom)} fill="rgba(234,179,8,0.75)"
        fontFamily="sans-serif" fontWeight="700"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >5 mm clearance</text>

      {/* White clearance halos around circles */}
      {Object.values(corners).map((c, i) => (
        <circle key={`halo-${i}`} cx={c.x} cy={c.y} r={r + 1.5} fill="white" />
      ))}

      {/* Registration circles (Ø10 mm, solid black, tangent to foil/margin edges) */}
      {Object.entries(corners).map(([key, c]) => (
        <circle key={`circle-${key}`} cx={c.x} cy={c.y} r={r} fill="black" />
      ))}

      {/* L-shaped crop marks at content boundary corners */}
      {lMarks.map(m => (
        <g key={`lmark-${m.key}`}>
          {/* Arm along foil edge toward circle */}
          <line x1={m.cx} y1={m.cy} x2={m.ex} y2={m.ey}
            stroke="black" strokeWidth={lW} strokeLinecap="square" />
          {/* Arm inward along content boundary */}
          <line x1={m.cx} y1={m.cy} x2={m.ix} y2={m.iy}
            stroke="black" strokeWidth={lW} strokeLinecap="square" />
        </g>
      ))}

      {/* Bottom-right sensor rectangle (7×4 mm, 4 mm from BR circle left edge) */}
      <rect x={botRectX} y={botRectY} width={ROLAND_BOT_W_MM} height={ROLAND_BOT_H_MM} fill="black" />
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LayoutCanvas({ foilWidthMm, totalLengthMm, copies, files, regmarkType, onCopiesChange, pageLengthMm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [zoom, setZoom] = useState(0.3);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [showStickers, setShowStickers] = useState(false);

  const [dragging, setDragging] = useState<{
    copyId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const marginMm = regmarkType === 'roland' ? ROLAND_MARGIN_MM
    : regmarkType === 'none' ? 0
    : OPOS_MARGIN_MM;

  const fitView = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const totalH = pageLengthMm ?? (totalLengthMm > 0 ? totalLengthMm : 300);
    const viewH = totalH + marginMm * 2 + CANVAS_PAD_MM * 2;
    const viewW = foilWidthMm + CANVAS_PAD_MM * 2;
    const zoomX = (cw - 60) / viewW;
    const zoomY = (ch - 60) / viewH;
    const newZoom = Math.min(zoomX, zoomY, 2);
    const scaledW = foilWidthMm * newZoom;
    const scaledH = (totalH + marginMm * 2) * newZoom;
    const px = (cw - scaledW) / 2;
    const py = (ch - scaledH) / 2;
    setZoom(newZoom);
    setPan({ x: px, y: py - marginMm * newZoom });
  }, [foilWidthMm, totalLengthMm, marginMm]);

  useEffect(() => { fitView(); }, [fitView]);

  function screenToMm(screenX: number, screenY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top  - pan.y) / zoom,
    };
  }

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.85 : 1.18;
    const newZoom = Math.max(0.03, Math.min(10, zoom * factor));
    setPan({ x: mx - (mx - pan.x) * (newZoom / zoom), y: my - (my - pan.y) * (newZoom / zoom) });
    setZoom(newZoom);
  }

  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    const target = e.target as SVGElement;
    if (target.dataset.background === 'true' || target === svgRef.current) {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }

  function handleCopyMouseDown(e: React.MouseEvent, copyId: string) {
    e.stopPropagation();
    const copy = copies.find(c => c.id === copyId);
    if (!copy) return;
    const mm = screenToMm(e.clientX, e.clientY);
    setDragging({ copyId, offsetX: mm.x - copy.x, offsetY: mm.y - copy.y });
    setDragPos({ x: copy.x, y: copy.y });
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    } else if (dragging) {
      const mm = screenToMm(e.clientX, e.clientY);
      setDragPos({ x: mm.x - dragging.offsetX, y: mm.y - dragging.offsetY });
    }
  }

  function handleMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (dragging) {
      const mm = screenToMm(e.clientX, e.clientY);
      const copy = copies.find(c => c.id === dragging.copyId)!;
      let nx = snapMm(mm.x - dragging.offsetX);
      let ny = snapMm(mm.y - dragging.offsetY);
      nx = Math.max(GAP_MM, Math.min(foilWidthMm - copy.w - GAP_MM, nx));
      ny = Math.max(GAP_MM, ny);
      onCopiesChange(copies.map(c => c.id === dragging.copyId ? { ...c, x: nx, y: ny } : c));
      setDragging(null);
      setDragPos(null);
    }
    setIsPanning(false);
  }

  const totalH = pageLengthMm ?? (totalLengthMm > 0 ? totalLengthMm : 300);
  const strokeW = 1 / zoom;
  const zoomPct = Math.round(zoom * 100);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden rounded-xl" style={{ background: '#1e1e2e' }}>

      {/* ── Toolbar ── */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">

        {/* Left: zoom level */}
        <div className="pointer-events-auto flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs text-white/70 font-mono select-none">
          {zoomPct}%
        </div>

        {/* Right: controls */}
        <div className="pointer-events-auto flex items-center gap-1">
          {/* Sticker toggle */}
          <button
            onClick={() => setShowStickers(s => !s)}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all ${
              showStickers
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white/10 text-white/70 hover:bg-white/20 backdrop-blur-sm'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Stickers
          </button>

          <div className="w-px h-4 bg-white/20 mx-0.5" />

          <button
            onClick={() => { const nz = Math.max(zoom * 0.77, 0.03); const cw = containerRef.current?.clientWidth ?? 0; const ch = containerRef.current?.clientHeight ?? 0; setPan(p => ({ x: cw/2 - (cw/2 - p.x) * (nz/zoom), y: ch/2 - (ch/2 - p.y) * (nz/zoom) })); setZoom(nz); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/80 backdrop-blur-sm text-sm font-bold transition-colors"
          >−</button>

          <button
            onClick={() => { const nz = Math.min(zoom * 1.3, 10); const cw = containerRef.current?.clientWidth ?? 0; const ch = containerRef.current?.clientHeight ?? 0; setPan(p => ({ x: cw/2 - (cw/2 - p.x) * (nz/zoom), y: ch/2 - (ch/2 - p.y) * (nz/zoom) })); setZoom(nz); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/80 backdrop-blur-sm text-sm font-bold transition-colors"
          >+</button>

          <button
            onClick={fitView}
            className="h-7 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 backdrop-blur-sm text-xs font-semibold transition-colors"
          >Fit</button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {copies.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
            <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </div>
          <p className="text-white/30 text-sm font-medium">Add files and click Auto-Layout</p>
        </div>
      )}

      <svg
        ref={svgRef}
        className="w-full h-full select-none"
        onWheel={handleWheel}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : 'default' }}
      >
        <defs>
          <pattern id="dotgrid" x="0" y="0" width={20} height={20} patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.06)" />
          </pattern>
          <filter id="foil-shadow" x="-5%" y="-2%" width="115%" height="110%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.5)" floodOpacity="1" />
          </filter>
        </defs>

        {/* Dot-grid background */}
        <rect width="100%" height="100%" fill="url(#dotgrid)" />

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Invisible pan hit-target */}
          <rect
            x={-CANVAS_PAD_MM} y={-marginMm - CANVAS_PAD_MM}
            width={foilWidthMm + CANVAS_PAD_MM * 2}
            height={totalH + (marginMm + CANVAS_PAD_MM) * 2}
            fill="transparent" data-background="true"
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          />

          {/* Foil shadow */}
          <rect x={0} y={-marginMm} width={foilWidthMm} height={totalH + marginMm * 2}
            fill="white" filter="url(#foil-shadow)" opacity={0.15} />

          {/* ── Registration marks ── */}
          {regmarkType === 'opos' && (
            <OposLayer foilWidthMm={foilWidthMm} totalH={totalH} zoom={zoom} strokeW={strokeW} />
          )}
          {regmarkType === 'roland' && (
            <RolandLayer foilWidthMm={foilWidthMm} totalH={totalH} zoom={zoom} strokeW={strokeW} />
          )}

          {/* ── Foil body ── */}
          <rect x={0} y={0} width={foilWidthMm} height={totalH}
            fill="white" stroke="rgba(255,255,255,0.2)" strokeWidth={strokeW} />

          {/* Gap guide dashed border */}
          <rect x={GAP_MM} y={GAP_MM}
            width={Math.max(0, foilWidthMm - GAP_MM * 2)} height={Math.max(0, totalH - GAP_MM * 2)}
            fill="none" stroke="#d1d5db" strokeWidth={strokeW * 0.7}
            strokeDasharray={`${4/zoom} ${4/zoom}`} />

          {/* Page size label when fixed */}
          {pageLengthMm != null && (
            <text
              x={foilWidthMm / 2} y={totalH - 6 / zoom}
              textAnchor="middle" fontSize={10 / zoom}
              fill="rgba(0,0,0,0.25)" fontFamily="sans-serif" fontWeight="700"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {foilWidthMm === 210 ? 'A4' : 'A5'} — {foilWidthMm}×{pageLengthMm} mm
            </text>
          )}

          {/* Width annotation */}
          <text
            x={foilWidthMm / 2} y={-marginMm - 6 / zoom}
            textAnchor="middle" fontSize={11 / zoom}
            fill="rgba(255,255,255,0.45)" fontFamily="sans-serif" fontWeight="600"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {foilWidthMm} mm
          </text>

          {/* Height annotation */}
          {totalLengthMm > 0 && (
            <>
              <line x1={foilWidthMm + 6/zoom} y1={0} x2={foilWidthMm + 6/zoom} y2={totalH}
                stroke="rgba(255,255,255,0.2)" strokeWidth={strokeW} />
              <line x1={foilWidthMm + 3/zoom} y1={0} x2={foilWidthMm + 9/zoom} y2={0}
                stroke="rgba(255,255,255,0.2)" strokeWidth={strokeW} />
              <line x1={foilWidthMm + 3/zoom} y1={totalH} x2={foilWidthMm + 9/zoom} y2={totalH}
                stroke="rgba(255,255,255,0.2)" strokeWidth={strokeW} />
              <text
                x={foilWidthMm + 14/zoom} y={totalH / 2}
                textAnchor="start" dominantBaseline="middle" fontSize={11/zoom}
                fill="rgba(255,255,255,0.45)" fontFamily="sans-serif" fontWeight="600"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {Math.round(totalLengthMm)} mm
              </text>
            </>
          )}

          {/* ── Packed copies ── */}
          {copies.map(copy => {
            const file = files.find(f => f.id === copy.fileId);
            if (!file) return null;
            const isDraggingThis = dragging?.copyId === copy.id;
            const dx = isDraggingThis && dragPos ? dragPos.x : copy.x;
            const dy = isDraggingThis && dragPos ? dragPos.y : copy.y;
            const label = file.name.replace(/\.pdf$/i, '').slice(0, 16);
            const fontSize = Math.max(3, Math.min(9, copy.h * 0.14));
            const useImage = showStickers && !!file.previewUrl;

            return (
              <g
                key={copy.id}
                transform={`translate(${dx},${dy})`}
                onMouseDown={e => handleCopyMouseDown(e, copy.id)}
                style={{ cursor: isDraggingThis ? 'grabbing' : 'grab' }}
                opacity={isDraggingThis ? 0.85 : 1}
              >
                {useImage ? (
                  <>
                    <image href={file.previewUrl} width={copy.w} height={copy.h}
                      preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }} />
                    <rect width={copy.w} height={copy.h} fill="none"
                      stroke={file.color} strokeWidth={Math.max(0.3, strokeW * 0.6)} rx={1.5/zoom} />
                  </>
                ) : (
                  <>
                    <rect width={copy.w} height={copy.h} fill={`${file.color}22`} rx={2/zoom} />
                    <rect width={copy.w} height={copy.h} fill="none"
                      stroke={file.color} strokeWidth={Math.max(0.4, strokeW * 0.8)} rx={2/zoom} />
                    <text x={copy.w/2} y={copy.h/2 - fontSize * 0.7}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={fontSize} fill={file.color}
                      fontFamily="sans-serif" fontWeight="700"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {label}
                    </text>
                    <text x={copy.w/2} y={copy.h/2 + fontSize * 0.9}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={fontSize * 0.8} fill={file.color}
                      fontFamily="sans-serif" opacity={0.55}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      #{copy.copyIndex + 1}{copy.rotated ? ' ↺' : ''}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
