import type { ShapeType } from '../types/contour.ts';
import { useLang } from '../lib/LangContext.ts';

interface Props {
  value: ShapeType;
  onChange: (shape: ShapeType) => void;
  shapeSize: number;
  onSizeChange: (size: number) => void;
  shapeOffsetX: number;
  shapeOffsetY: number;
  onOffsetChange: (x: number, y: number) => void;
}

const SHAPES: { value: ShapeType; labelEn: string; labelSv: string; icon: React.ReactNode }[] = [
  {
    value: 'contour',
    labelEn: 'Contour',
    labelSv: 'Kontur',
    icon: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 6 C10 6 6 12 6 20 C6 30 12 34 20 34 C30 34 34 28 34 20 C34 10 28 6 20 6 Z" strokeDasharray="none" />
        <path d="M20 10 C13 10 10 14 10 20 C10 27 14 30 20 30 C27 30 30 26 30 20 C30 13 26 10 20 10 Z" opacity="0.3" />
      </svg>
    ),
  },
  {
    value: 'circle',
    labelEn: 'Circle',
    labelSv: 'Cirkel',
    icon: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="20" cy="20" r="14" />
      </svg>
    ),
  },
  {
    value: 'square',
    labelEn: 'Square',
    labelSv: 'Kvadrat',
    icon: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="6" y="6" width="28" height="28" rx="2" />
      </svg>
    ),
  },
  {
    value: 'triangle',
    labelEn: 'Triangle',
    labelSv: 'Triangel',
    icon: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="20,5 35,34 5,34" />
      </svg>
    ),
  },
];

export function ShapeSelector({ value, onChange, shapeSize, onSizeChange, shapeOffsetX, shapeOffsetY, onOffsetChange }: Props) {
  const { lang } = useLang();
  const pct = ((shapeSize - 10) / (100 - 10)) * 100;
  const STEP = 5;
  const clamp = (v: number) => Math.max(-50, Math.min(50, v));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {SHAPES.map(shape => (
          <button
            key={shape.value}
            onClick={() => onChange(shape.value)}
            className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border-2 transition-all ${
              value === shape.value
                ? 'border-nim-yellow bg-nim-yellow/10 text-nim-yellow'
                : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
            }`}
          >
            {shape.icon}
            <span className="text-xs font-bold uppercase tracking-wide">
              {lang === 'sv' ? shape.labelSv : shape.labelEn}
            </span>
          </button>
        ))}
      </div>

      {/* Size slider — only for geometric shapes */}
      {value !== 'contour' && (
        <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-semibold text-white">{lang === 'sv' ? 'Storlek' : 'Size'}</span>
            <span className="text-xs font-bold text-nim-yellow tabular-nums">{shapeSize}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={1}
            value={shapeSize}
            onChange={e => onSizeChange(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #ffed00 ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }}
          />
          <div className="flex justify-between text-xs text-white/20">
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Move controls */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-white">{lang === 'sv' ? 'Flytta' : 'Move'}</span>
          <div className="flex flex-col items-center gap-1">
            {/* Up */}
            <button onClick={() => onOffsetChange(shapeOffsetX, clamp(shapeOffsetY - STEP))}
              className="w-8 h-8 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/30 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>
            </button>
            <div className="flex items-center gap-1">
              {/* Left */}
              <button onClick={() => onOffsetChange(clamp(shapeOffsetX - STEP), shapeOffsetY)}
                className="w-8 h-8 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/30 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              </button>
              {/* Center reset */}
              <button onClick={() => onOffsetChange(0, 0)}
                className="w-8 h-8 rounded-lg border border-white/10 text-white/30 hover:text-white hover:border-white/30 flex items-center justify-center transition-colors text-xs font-bold">
                ○
              </button>
              {/* Right */}
              <button onClick={() => onOffsetChange(clamp(shapeOffsetX + STEP), shapeOffsetY)}
                className="w-8 h-8 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/30 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
            {/* Down */}
            <button onClick={() => onOffsetChange(shapeOffsetX, clamp(shapeOffsetY + STEP))}
              className="w-8 h-8 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/30 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </button>
          </div>
          <p className="text-xs text-white/20 text-center">{shapeOffsetX > 0 ? '+' : ''}{shapeOffsetX}% / {shapeOffsetY > 0 ? '+' : ''}{shapeOffsetY}%</p>
        </div>
        </div>
      )}
    </div>
  );
}
