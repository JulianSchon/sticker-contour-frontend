import { useLang } from '../../../lib/LangContext.ts';

interface Props {
  onColor: (color: string) => void;
}

const SWATCHES = ['#ffffff', '#000000', '#ffed00', '#ff3b6b', '#3b82f6', '#22c55e'];

export function BackgroundPanel({ onColor }: Props) {
  const { t } = useLang();
  return (
    <div className="space-y-3">
      <p className="nim-label">{t.edToolBackground}</p>
      <label className="text-xs text-white/60">{t.edBgColor}</label>
      <div className="grid grid-cols-6 gap-2">
        {SWATCHES.map(c => (
          <button key={c} onClick={() => onColor(c)} className="aspect-square rounded-lg border border-white/15" style={{ background: c }} />
        ))}
      </div>
      <input type="color" onChange={e => onColor(e.target.value)} className="w-full h-8 rounded-lg bg-transparent cursor-pointer" />
    </div>
  );
}
