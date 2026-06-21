import type { EditorTool } from '../../types/editor.ts';
import { useLang } from '../../lib/LangContext.ts';

interface Props {
  active: EditorTool;
  onChange: (tool: EditorTool) => void;
}

const ENABLED: EditorTool[] = ['templates', 'uploads', 'text', 'elements', 'shape'];

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
    <div className="flex flex-row lg:flex-col items-stretch lg:items-center gap-1 w-full lg:w-20 bg-nim-darker border-b lg:border-b-0 lg:border-r border-white/10 px-2 lg:px-0 py-2 lg:py-3 overflow-x-auto lg:overflow-visible">
      {items.map(it => {
        const enabled = ENABLED.includes(it.tool);
        return (
          <button
            key={it.tool}
            disabled={!enabled}
            onClick={() => enabled && onChange(it.tool)}
            title={it.tip}
            className={`flex-shrink-0 flex-1 lg:flex-none min-w-16 lg:w-16 py-2 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${
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
