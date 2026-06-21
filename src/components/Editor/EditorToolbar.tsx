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
      <div className="flex items-center gap-1">
        <button onClick={onUndo} disabled={!canUndo} title={t.edUndo} aria-label={t.edUndo} className={btn}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v1M3 10l4-4M3 10l4 4" /></svg>
        </button>
        <button onClick={onRedo} disabled={!canRedo} title={t.edRedo} aria-label={t.edRedo} className={btn}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v1M21 10l-4-4M21 10l-4 4" /></svg>
        </button>
      </div>

      {/* Playful build hint — desktop only */}
      <span className="hidden lg:inline font-hand text-xl leading-none text-nim-yellow">{t.edBuildHint}</span>

      <div className="flex items-center gap-2.5 ml-auto">
      {/* Playful size hint — desktop only, sits just left of the size chip */}
      <span className="hidden lg:inline font-hand text-xl leading-none text-nim-yellow">{t.edSizeHint}</span>
      <div className="flex items-center gap-2.5 rounded-xl bg-nim-yellow/10 border border-nim-yellow/30 pl-3 pr-2 py-1.5">
        {/* Ruler icon */}
        <svg className="w-5 h-5 text-nim-yellow flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l4-4 14 14-4 4L3 8z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7l2 2M11 10l2 2M14 13l2 2" />
        </svg>
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-bold uppercase tracking-widest text-nim-yellow/70">{t.edSize}</span>
          <span className="text-sm font-black text-white tabular-nums">{size.wCm} × {size.hCm} cm</span>
        </div>
        <select
          value={`${size.wCm}x${size.hCm}`}
          onChange={e => {
            const [w, h] = e.target.value.split('x').map(Number);
            onSizeChange({ wCm: w, hCm: h });
          }}
          aria-label={t.edSize}
          className="bg-nim-black border border-nim-yellow/40 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white hover:border-nim-yellow/70 focus:outline-none focus:border-nim-yellow cursor-pointer"
        >
          {SIZE_PRESETS.map(p => (
            <option key={`${p.wCm}x${p.hCm}`} value={`${p.wCm}x${p.hCm}`}>
              {lang === 'sv' ? p.labelSv : p.labelEn}
            </option>
          ))}
        </select>
      </div>
      </div>
    </div>
  );
}
