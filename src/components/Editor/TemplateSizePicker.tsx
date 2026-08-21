import { useState } from 'react';
import { useLang } from '../../lib/LangContext.ts';
import { clampToRange, pillLabel, sizeMatches } from '../../lib/templateSize.ts';
import type { TemplateCustomSize, TemplateSizeMm, TemplateSizeOption } from '../../types/template.ts';

interface Props {
  sizes: TemplateSizeOption[];
  custom: TemplateCustomSize | null | undefined;
  value: TemplateSizeMm;
  onChange: (size: TemplateSizeMm) => void;
}

/**
 * Floating size control for parametric templates: one pill per standard size,
 * plus mm inputs (clamped to the template's allowed range) when the template
 * permits a custom size. Hidden entirely for fixed single-size templates.
 */
export function TemplateSizePicker({ sizes, custom, value, onChange }: Props) {
  const { t } = useLang();
  const isStandard = sizes.some(s => sizeMatches(s, value));
  const [customOpen, setCustomOpen] = useState(!isStandard);

  if (sizes.length <= 1 && !custom) return null;

  const widthLocked = !!custom && custom.widthMm.min === custom.widthMm.max;

  const applyCustom = (field: 'widthMm' | 'heightMm', input: HTMLInputElement) => {
    if (!custom) return;
    const n = Number(input.value.replace(',', '.'));
    if (!Number.isFinite(n)) { input.value = String(value[field]); return; }
    const clamped = clampToRange(n, field === 'widthMm' ? custom.widthMm : custom.heightMm);
    // Write the clamped value back so the field never displays out-of-range
    // text, even when clamping lands on the already-applied value.
    input.value = String(clamped);
    onChange({ ...value, [field]: clamped });
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
      <div className="flex rounded-full overflow-hidden border border-white/20 bg-black/80 backdrop-blur shadow-lg text-xs font-bold">
        {sizes.map(s => (
          <button
            key={s.id}
            title={s.name}
            onClick={() => { setCustomOpen(false); onChange({ widthMm: s.widthMm, heightMm: s.heightMm }); }}
            className={`px-4 py-1.5 transition ${!customOpen && sizeMatches(s, value) ? 'bg-nim-yellow text-black' : 'text-white/70 hover:text-white'}`}
          >
            {pillLabel(s.name)}
          </button>
        ))}
        {custom && (
          <button
            onClick={() => setCustomOpen(true)}
            className={`px-4 py-1.5 transition ${customOpen || !isStandard ? 'bg-nim-yellow text-black' : 'text-white/70 hover:text-white'}`}
          >
            {t.tplSizeCustom}
          </button>
        )}
      </div>
      {custom && (customOpen || !isStandard) && (
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/80 backdrop-blur shadow-lg px-4 py-1.5 text-xs">
          {!widthLocked && (
            <label className="flex items-center gap-1.5 text-white/70">
              {t.width}
              <input
                type="number"
                min={custom.widthMm.min}
                max={custom.widthMm.max}
                step={1}
                defaultValue={value.widthMm}
                key={`w-${value.widthMm}`}
                onBlur={e => applyCustom('widthMm', e.target)}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                className="w-16 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-white text-right tabular-nums focus:border-nim-yellow outline-none"
              />
            </label>
          )}
          <label className="flex items-center gap-1.5 text-white/70">
            {t.height}
            <input
              type="number"
              min={custom.heightMm.min}
              max={custom.heightMm.max}
              step={1}
              defaultValue={value.heightMm}
              key={`h-${value.heightMm}`}
              onBlur={e => applyCustom('heightMm', e.target)}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="w-16 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-white text-right tabular-nums focus:border-nim-yellow outline-none"
            />
          </label>
          <span className="text-white/40">mm</span>
        </div>
      )}
    </div>
  );
}
