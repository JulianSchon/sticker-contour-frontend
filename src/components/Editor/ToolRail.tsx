import type { EditorTool } from '../../types/editor.ts';
import { useLang } from '../../lib/LangContext.ts';

interface Props {
  active: EditorTool;
  onChange: (tool: EditorTool) => void;
}

const ENABLED: EditorTool[] = ['uploads', 'text', 'shape'];

export function ToolRail({ active, onChange }: Props) {
  const { t } = useLang();
  const items: { tool: EditorTool; label: string }[] = [
    { tool: 'templates', label: t.edToolTemplates },
    { tool: 'uploads', label: t.edToolUploads },
    { tool: 'text', label: t.edToolText },
    { tool: 'elements', label: t.edToolElements },
    { tool: 'shape', label: t.edToolShape },
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
            title={!enabled ? t.edComingSoon : it.label}
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
