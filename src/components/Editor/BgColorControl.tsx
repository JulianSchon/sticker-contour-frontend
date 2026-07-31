interface Props { value: string; onChange: (hex: string) => void; label: string; }

const SWATCHES = ['#f3e627', '#ffffff', '#000000', '#e11d48', '#2563eb', '#16a34a'];

export function BgColorControl({ value, onChange, label }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">{label}</span>
      {SWATCHES.map(c => (
        <button key={c} onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full border-2 transition ${value.toLowerCase() === c ? 'border-nim-yellow' : 'border-white/20'}`}
          style={{ background: c }} aria-label={c} />
      ))}
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent" />
    </div>
  );
}
