import { useState } from 'react';
import { useLang } from '../../../lib/LangContext.ts';
import { EDITOR_FONTS } from '../../../lib/editorFonts.ts';
import type { SelectedProps } from '../../../hooks/useFabricEditor.ts';

interface Props {
  onAddText: (value: string) => void;
  /** The currently-selected object (text controls show when it's a text). */
  selected: SelectedProps | null;
  /** Patch properties of the selected text object. */
  onUpdate: (patch: Record<string, unknown>) => void;
}

const ALIGNMENTS = ['left', 'center', 'right'] as const;

export function TextPanel({ onAddText, selected, onUpdate }: Props) {
  const { t } = useLang();
  const [value, setValue] = useState('');
  const isText = selected?.isText ?? false;

  return (
    <div className="space-y-3">
      <p className="nim-label">{t.edToolText}</p>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={t.edAddText}
        className="w-full bg-nim-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
      />
      <button onClick={() => { onAddText(value); setValue(''); }} className="nim-btn-yellow w-full">
        + {t.edAddText}
      </button>

      {isText && selected && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          {/* Font */}
          <div>
            <label className="text-xs text-white/60">{t.edFont}</label>
            <select
              value={selected.fontFamily ?? ''}
              onChange={e => onUpdate({ fontFamily: e.target.value })}
              className="mt-1 w-full bg-nim-black border border-white/15 rounded-lg px-2 py-1.5 text-sm text-white"
            >
              {EDITOR_FONTS.map(f => (
                <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Size + bold/italic */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-white/60">{t.edFontSize}</label>
              <input
                type="number" min={6} max={400}
                value={Math.round(selected.fontSize ?? 48)}
                onChange={e => onUpdate({ fontSize: Math.max(6, Number(e.target.value) || 6) })}
                className="mt-1 w-full bg-nim-black border border-white/15 rounded-lg px-2 py-1.5 text-sm text-white"
              />
            </div>
            <button
              title={t.edBold}
              onClick={() => onUpdate({ fontWeight: selected.bold ? 'normal' : 'bold' })}
              className={`w-9 h-9 rounded-lg border text-sm font-black ${selected.bold ? 'border-nim-yellow bg-nim-yellow/10 text-nim-yellow' : 'border-white/15 text-white/60'}`}
            >B</button>
            <button
              title={t.edItalic}
              onClick={() => onUpdate({ fontStyle: selected.italic ? 'normal' : 'italic' })}
              className={`w-9 h-9 rounded-lg border text-sm italic ${selected.italic ? 'border-nim-yellow bg-nim-yellow/10 text-nim-yellow' : 'border-white/15 text-white/60'}`}
            >I</button>
          </div>

          {/* Alignment */}
          <div>
            <label className="text-xs text-white/60">{t.edAlign}</label>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {ALIGNMENTS.map(a => (
                <button
                  key={a}
                  onClick={() => onUpdate({ textAlign: a })}
                  className={`py-1.5 rounded-lg border text-xs capitalize ${selected.textAlign === a ? 'border-nim-yellow bg-nim-yellow/10 text-nim-yellow' : 'border-white/15 text-white/50'}`}
                >{a}</button>
              ))}
            </div>
          </div>

          {/* Color + outline */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs text-white/60 flex items-center gap-2">
              {t.edColor}
              <input type="color" value={selected.fill} onChange={e => onUpdate({ fill: e.target.value })} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
            </label>
            <label className="text-xs text-white/60 flex items-center gap-2">
              {t.edOutline}
              <input type="color" value={selected.stroke ?? '#000000'} onChange={e => onUpdate({ stroke: e.target.value, strokeWidth: selected.strokeWidth || 2 })} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
            </label>
          </div>
          <input
            type="range" min={0} max={12} step={0.5}
            value={selected.strokeWidth ?? 0}
            onChange={e => onUpdate({ strokeWidth: Number(e.target.value), stroke: selected.stroke ?? '#000000' })}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
