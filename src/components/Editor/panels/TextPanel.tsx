import { useState } from 'react';
import { useLang } from '../../../lib/LangContext.ts';
import { EDITOR_FONTS } from '../../../lib/editorFonts.ts';

interface Props {
  onAddText: (value: string) => void;
  onFontChange: (family: string) => void;
  onColorChange: (color: string) => void;
  hasSelection: boolean;
}

export function TextPanel({ onAddText, onFontChange, onColorChange, hasSelection }: Props) {
  const { t } = useLang();
  const [value, setValue] = useState('');

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

      {hasSelection && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="text-xs text-white/60">{t.edFont}</label>
          <select
            onChange={e => onFontChange(e.target.value)}
            className="w-full bg-nim-black border border-white/15 rounded-lg px-2 py-1.5 text-sm text-white"
          >
            {EDITOR_FONTS.map(f => (
              <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label}</option>
            ))}
          </select>
          <label className="text-xs text-white/60">{t.edColor}</label>
          <input type="color" onChange={e => onColorChange(e.target.value)} className="w-full h-8 rounded-lg bg-transparent cursor-pointer" />
        </div>
      )}
    </div>
  );
}
