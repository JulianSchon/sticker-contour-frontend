import { useMemo, useState } from 'react';
import { useLang } from '../../../lib/LangContext.ts';
import type { ClipartItem } from '../../../types/content.ts';

interface Props {
  clipart: ClipartItem[];
  isLoading: boolean;
  onAdd: (item: ClipartItem) => void;
}

export function ElementsPanel({ clipart, isLoading, onAdd }: Props) {
  const { t } = useLang();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return clipart;
    return clipart.filter(c =>
      c.name.toLowerCase().includes(needle) || c.tags.some(tag => tag.includes(needle)),
    );
  }, [clipart, q]);

  return (
    <div className="space-y-3">
      <p className="nim-label">{t.edToolElements}</p>
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={t.edSearch}
        className="w-full bg-nim-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
      />
      {isLoading && <p className="text-xs text-white/40">{t.edLoading}</p>}
      <div className="grid grid-cols-3 gap-2">
        {filtered.map(item => (
          <button
            key={item.id}
            onClick={() => onAdd(item)}
            title={item.name}
            className="aspect-square rounded-lg border border-white/10 hover:border-nim-yellow bg-white/5 p-1.5 flex items-center justify-center transition-colors"
          >
            <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain" />
          </button>
        ))}
      </div>
      {!isLoading && filtered.length === 0 && (
        <p className="text-xs text-white/30">{t.edNoResults}</p>
      )}
    </div>
  );
}
