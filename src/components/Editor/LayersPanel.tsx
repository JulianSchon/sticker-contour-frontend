import type { FabricLayer, SelectedProps } from '../../hooks/useFabricEditor.ts';
import { useLang } from '../../lib/LangContext.ts';

interface Props {
  layers: FabricLayer[];
  selectedId: string | null;
  selected: SelectedProps | null;
  onSelect: (id: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onForward: () => void;
  onBackward: () => void;
  onUpdate: (patch: Record<string, unknown>) => void;
  onRemoveBg: () => void;
  removingBg: boolean;
  bgError: string | null;
}

export function LayersPanel({ layers, selectedId, selected, onSelect, onDelete, onDuplicate, onForward, onBackward, onUpdate, onRemoveBg, removingBg, bgError }: Props) {
  const { t } = useLang();
  return (
    <div className="shrink-0 bg-nim-darker border-t border-white/10 p-3 flex flex-col gap-2">
      <p className="nim-label">{t.edLayers}</p>
      <div className="flex flex-col gap-1 overflow-y-auto max-h-32">
        {layers.map(l => (
          <button
            key={l.id}
            onClick={() => onSelect(l.id)}
            className={`text-left px-2 py-1.5 rounded-lg text-xs truncate border ${
              selectedId === l.id ? 'border-nim-yellow bg-nim-yellow/10 text-nim-yellow' : 'border-white/10 text-white/60'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Selected-object properties */}
      {selected && (
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/40">{t.edOpacity}</span>
            <span className="text-xs text-nim-yellow tabular-nums">{Math.round(selected.opacity * 100)}%</span>
          </div>
          <input
            type="range" min={0.1} max={1} step={0.05}
            value={selected.opacity}
            onChange={e => onUpdate({ opacity: Number(e.target.value) })}
            className="w-full"
          />
          <button onClick={onDuplicate} title={t.edDuplicate} className="py-1.5 rounded-lg border border-white/10 text-white/60 text-xs hover:text-white hover:border-white/30">
            ⧉ {t.edDuplicate}
          </button>
          {/* Background removal — images only */}
          {selected.kind === 'image' && (
            <>
              <button
                onClick={onRemoveBg}
                disabled={removingBg}
                title={t.edRemoveBg}
                className="py-1.5 rounded-lg border border-nim-yellow/40 text-nim-yellow text-xs hover:bg-nim-yellow/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removingBg ? t.edRemovingBg : `✂ ${t.edRemoveBg}`}
              </button>
              {bgError && <p className="text-[10px] text-red-400 leading-tight">{bgError}</p>}
            </>
          )}
        </div>
      )}

      <div className="flex gap-1">
        <button onClick={onBackward} title={t.edTipBackward} aria-label={t.edTipBackward} className="flex-1 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs">↓</button>
        <button onClick={onForward} title={t.edTipForward} aria-label={t.edTipForward} className="flex-1 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs">↑</button>
        <button onClick={onDelete} title={t.edTipDelete} className="flex-1 py-1.5 rounded-lg border border-red-800/50 text-red-400 text-xs">{t.edDelete}</button>
      </div>

      {/* Playful hint about the layer-order buttons — desktop only */}
      <p className="hidden lg:block font-hand text-base leading-tight text-nim-yellow text-center">{t.edLayersHint}</p>
    </div>
  );
}
