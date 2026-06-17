import type { ArtboardSize } from '../../types/editor.ts';
import { SIZE_PRESETS } from '../../lib/printSize.ts';
import { useLang } from '../../lib/LangContext.ts';

interface Props {
  size: ArtboardSize;
  onSizeChange: (size: ArtboardSize) => void;
}

export function EditorToolbar({ size, onSizeChange }: Props) {
  const { t, lang } = useLang();
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-nim-darker border-b border-white/10 flex-wrap">
      <span className="text-xs text-white/50">{t.edSize}</span>
      <select
        value={`${size.wCm}x${size.hCm}`}
        onChange={e => {
          const [w, h] = e.target.value.split('x').map(Number);
          onSizeChange({ wCm: w, hCm: h });
        }}
        className="bg-nim-black border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white"
      >
        {SIZE_PRESETS.map(p => (
          <option key={`${p.wCm}x${p.hCm}`} value={`${p.wCm}x${p.hCm}`}>
            {lang === 'sv' ? p.labelSv : p.labelEn}
          </option>
        ))}
      </select>
    </div>
  );
}
