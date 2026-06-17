import type { ArtboardSize } from '../../types/editor.ts';
import { SIZE_PRESETS } from '../../lib/printSize.ts';
import { useLang } from '../../lib/LangContext.ts';

interface Props {
  size: ArtboardSize;
  onSizeChange: (size: ArtboardSize) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function EditorToolbar({ size, onSizeChange, canUndo, canRedo, onUndo, onRedo }: Props) {
  const { t, lang } = useLang();
  const btn = 'w-8 h-8 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center';
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

      <div className="flex items-center gap-1 ml-auto">
        <button onClick={onUndo} disabled={!canUndo} title={t.edUndo} aria-label={t.edUndo} className={btn}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v1M3 10l4-4M3 10l4 4" /></svg>
        </button>
        <button onClick={onRedo} disabled={!canRedo} title={t.edRedo} aria-label={t.edRedo} className={btn}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v1M21 10l-4-4M21 10l-4 4" /></svg>
        </button>
      </div>
    </div>
  );
}
