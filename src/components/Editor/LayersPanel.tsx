import type { FabricLayer } from '../../hooks/useFabricEditor.ts';
import { useLang } from '../../lib/LangContext.ts';

interface Props {
  layers: FabricLayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: () => void;
  onForward: () => void;
  onBackward: () => void;
}

export function LayersPanel({ layers, selectedId, onSelect, onDelete, onForward, onBackward }: Props) {
  const { t } = useLang();
  return (
    <div className="w-48 bg-nim-darker border-l border-white/10 p-3 flex flex-col gap-2">
      <p className="nim-label">{t.edLayers}</p>
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
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
      <div className="flex gap-1">
        <button onClick={onBackward} title={t.edTipBackward} aria-label={t.edTipBackward} className="flex-1 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs">↓</button>
        <button onClick={onForward} title={t.edTipForward} aria-label={t.edTipForward} className="flex-1 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs">↑</button>
        <button onClick={onDelete} title={t.edTipDelete} className="flex-1 py-1.5 rounded-lg border border-red-800/50 text-red-400 text-xs">{t.edDelete}</button>
      </div>
    </div>
  );
}
