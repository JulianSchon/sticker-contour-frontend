import type { ContourParams } from '../types/contour.ts';

interface Props {
  params: ContourParams;
  onChange: (params: ContourParams) => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, unit = '', onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-semibold text-white/60">{label}</span>
          <span className="text-xs font-bold text-nim-yellow tabular-nums">{value}{unit}</span>
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #FFE600 ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-white/20">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

const CUT_MODES = [
  { value: 'kiss', label: 'Kiss',  desc: 'Solid line',       color: '#ec4899' },
  { value: 'perf', label: 'Perf',  desc: 'Dashed line',      color: '#f97316' },
  { value: 'both', label: 'Both',  desc: 'Solid + dashed',   color: '#FFE600' },
] as const;

export function ParameterPanel({ params, onChange }: Props) {
  const set = <K extends keyof ContourParams>(key: K, value: ContourParams[K]) =>
    onChange({ ...params, [key]: value });

  const showKiss = params.cutMode === 'kiss' || params.cutMode === 'both';
  const showPerf = params.cutMode === 'perf' || params.cutMode === 'both';

  return (
    <div className="space-y-6">

      <Slider
        label="Threshold sensitivity"
        value={params.threshold}
        min={1} max={255} step={1}
        onChange={v => set('threshold', v)}
      />

      <Slider
        label="Smoothing level"
        value={params.smoothing}
        min={0} max={4} step={1}
        onChange={v => set('smoothing', v)}
      />

      {/* Cut mode */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-white/60">Cut mode</span>
        <div className="grid grid-cols-3 gap-2">
          {CUT_MODES.map(mode => (
            <button
              key={mode.value}
              onClick={() => set('cutMode', mode.value)}
              className={`py-2.5 px-2 rounded-lg border-2 text-center transition-all ${
                params.cutMode === mode.value
                  ? 'border-nim-yellow bg-nim-yellow/10 text-nim-yellow'
                  : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wider">{mode.label}</p>
              <p className="text-xs font-normal mt-0.5 opacity-60">{mode.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Kiss offset */}
      {showKiss && (
        <div className="pl-3 border-l-2 border-pink-500/60 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-5 h-0.5 bg-pink-500" />
            <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">Kiss cut offset</span>
          </div>
          <Slider
            label=""
            value={params.kissOffset}
            min={0} max={50} step={1} unit=" px"
            onChange={v => set('kissOffset', v)}
          />
        </div>
      )}

      {/* Perf offset */}
      {showPerf && (
        <div className="pl-3 border-l-2 border-orange-500/60 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-5 border-t-2 border-dashed border-orange-500" />
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Perf cut offset</span>
          </div>
          <Slider
            label=""
            value={params.perfOffset}
            min={0} max={50} step={1} unit=" px"
            onChange={v => set('perfOffset', v)}
          />
        </div>
      )}

      {/* Enclose toggle */}
      <button
        onClick={() => set('enclose', !params.enclose)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-all ${
          params.enclose
            ? 'border-nim-yellow bg-nim-yellow/10'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          params.enclose ? 'border-nim-yellow bg-nim-yellow' : 'border-white/30'
        }`}>
          {params.enclose && (
            <svg className="w-3 h-3 text-nim-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
        <span className={`text-xs font-bold uppercase tracking-wider ${params.enclose ? 'text-nim-yellow' : 'text-white/40'}`}>
          Enclose
        </span>
        <span className="ml-auto text-xs text-white/25">outer contour only</span>
      </button>
    </div>
  );
}
