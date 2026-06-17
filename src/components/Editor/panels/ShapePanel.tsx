import { useState, type ReactNode } from 'react';
import { useLang } from '../../../lib/LangContext.ts';
import type { ShapeKind } from '../../../types/editor.ts';

interface Props {
  /** Insert a new shape of the given kind, filled with the current color. */
  onAddShape: (kind: ShapeKind, color: string) => void;
  /** Recolor the currently-selected object (if any). */
  onColorChange: (color: string) => void;
}

const SWATCHES = ['#ffffff', '#000000', '#ffed00', '#ff3b6b', '#3b82f6', '#22c55e'];

const SHAPES: { kind: ShapeKind; svg: ReactNode }[] = [
  { kind: 'rectangle',   svg: <rect x="3" y="7" width="26" height="18" rx="1" /> },
  { kind: 'roundedRect', svg: <rect x="3" y="7" width="26" height="18" rx="6" /> },
  { kind: 'circle',      svg: <circle cx="16" cy="16" r="12" /> },
  { kind: 'ellipse',     svg: <ellipse cx="16" cy="16" rx="13" ry="9" /> },
  { kind: 'triangle',    svg: <polygon points="16,4 29,28 3,28" /> },
];

export function ShapePanel({ onAddShape, onColorChange }: Props) {
  const { t } = useLang();
  const [color, setColor] = useState('#ffffff');

  const pickColor = (c: string) => {
    setColor(c);
    onColorChange(c); // live-recolor the selection if one exists
  };

  return (
    <div className="space-y-4">
      <p className="nim-label">{t.edToolShape}</p>

      <div className="grid grid-cols-3 gap-2">
        {SHAPES.map(s => (
          <button
            key={s.kind}
            onClick={() => onAddShape(s.kind, color)}
            title={t.edAddShape}
            className="aspect-square rounded-lg border-2 border-white/10 text-white/60 hover:border-nim-yellow hover:text-nim-yellow flex items-center justify-center transition-colors"
          >
            <svg viewBox="0 0 32 32" className="w-7 h-7" fill="currentColor">{s.svg}</svg>
          </button>
        ))}
      </div>

      <div className="space-y-2 pt-2 border-t border-white/10">
        <label className="text-xs text-white/60">{t.edShapeColor}</label>
        <div className="grid grid-cols-6 gap-2">
          {SWATCHES.map(c => (
            <button
              key={c}
              onClick={() => pickColor(c)}
              className={`aspect-square rounded-lg border ${color === c ? 'border-nim-yellow' : 'border-white/15'}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <input
          type="color"
          value={color}
          onChange={e => pickColor(e.target.value)}
          className="w-full h-8 rounded-lg bg-transparent cursor-pointer"
        />
      </div>
    </div>
  );
}
