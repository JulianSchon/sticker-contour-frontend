import type { EditorTool } from '../../types/editor.ts';
import { useLang } from '../../lib/LangContext.ts';

interface Props {
  active: EditorTool;
  onChange: (tool: EditorTool) => void;
}

const ENABLED: EditorTool[] = ['uploads', 'text', 'shape'];

export function ToolRail({ active, onChange }: Props) {
  const { t } = useLang();
  const items: { tool: EditorTool; label: string; tip: string }[] = [
    { tool: 'templates', label: t.edToolTemplates, tip: t.edTipTemplates },
    { tool: 'uploads', label: t.edToolUploads, tip: t.edTipUploads },
    { tool: 'text', label: t.edToolText, tip: t.edTipText },
    { tool: 'elements', label: t.edToolElements, tip: t.edTipElements },
    { tool: 'shape', label: t.edToolShape, tip: t.edTipShape },
  ];
  return (
    <div className="w-20 bg-nim-darker border-r border-white/10 flex flex-col items-center gap-1 py-3">
      {items.map(it => {
        const enabled = ENABLED.includes(it.tool);
        return (
          <button
            key={it.tool}
            disabled={!enabled}
            onClick={() => enabled && onChange(it.tool)}
            title={it.tip}
            className={`w-16 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${
              active === it.tool ? 'bg-nim-yellow text-nim-black'
              : enabled ? 'text-white/50 hover:text-white/80' : 'text-white/15 cursor-not-allowed'
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
