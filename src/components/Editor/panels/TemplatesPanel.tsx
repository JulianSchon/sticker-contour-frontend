import { useMemo } from 'react';
import { useLang } from '../../../lib/LangContext.ts';
import { renderTemplateThumb } from '../../../lib/templateObjects.ts';
import type { Template } from '../../../types/content.ts';

interface Props {
  templates: Template[];
  isLoading: boolean;
  onApply: (template: Template) => void;
}

export function TemplatesPanel({ templates, isLoading, onApply }: Props) {
  const { t } = useLang();
  const thumbs = useMemo(
    () => templates.map(tpl => ({ tpl, src: renderTemplateThumb(tpl) })),
    [templates],
  );

  return (
    <div className="space-y-3">
      <p className="nim-label">{t.edToolTemplates}</p>
      {isLoading && <p className="text-xs text-white/40">{t.edLoading}</p>}
      <div className="grid grid-cols-2 gap-2">
        {thumbs.map(({ tpl, src }) => (
          <button
            key={tpl.id}
            onClick={() => onApply(tpl)}
            title={tpl.name}
            className="rounded-lg border border-white/10 hover:border-nim-yellow overflow-hidden bg-white/5 transition-colors"
          >
            <img src={src} alt={tpl.name} className="w-full aspect-square object-contain" />
            <span className="block text-[10px] text-white/50 px-1 py-1 truncate">{tpl.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
