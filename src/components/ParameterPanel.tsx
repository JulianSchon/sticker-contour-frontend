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
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <label className="font-medium text-gray-700">{label}</label>
        <span className="text-gray-500 tabular-nums">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

const CUT_MODES = [
  { value: 'kiss', label: 'Kiss cut', desc: 'Solid line only' },
  { value: 'perf', label: 'Perf cut', desc: 'Dashed line only' },
  { value: 'both', label: 'Both', desc: 'Solid + dashed' },
] as const;

export function ParameterPanel({ params, onChange }: Props) {
  const set = <K extends keyof ContourParams>(key: K, value: ContourParams[K]) =>
    onChange({ ...params, [key]: value });

  const showKiss = params.cutMode === 'kiss' || params.cutMode === 'both';
  const showPerf = params.cutMode === 'perf' || params.cutMode === 'both';

  return (
    <div className="space-y-5">
      <Slider
        label="Threshold sensitivity"
        value={params.threshold}
        min={1}
        max={255}
        step={1}
        onChange={(v) => set('threshold', v)}
      />

      <Slider
        label="Smoothing level"
        value={params.smoothing}
        min={0}
        max={4}
        step={1}
        onChange={(v) => set('smoothing', v)}
      />

      <div className="space-y-2">
        <span className="text-sm font-medium text-gray-700">Cut mode</span>
        <div className="flex gap-2">
          {CUT_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => set('cutMode', mode.value)}
              className={`flex-1 py-2 px-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                params.cutMode === mode.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {mode.label}
              <p className="text-xs font-normal mt-0.5 opacity-70">{mode.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {showKiss && (
        <div className="pl-3 border-l-2 border-pink-400 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-6 h-0.5 bg-pink-500" />
            <span className="text-xs font-semibold text-pink-600 uppercase tracking-wide">Kiss cut offset</span>
          </div>
          <Slider
            label=""
            value={params.kissOffset}
            min={0}
            max={50}
            step={1}
            unit=" px"
            onChange={(v) => set('kissOffset', v)}
          />
        </div>
      )}

      {showPerf && (
        <div className="pl-3 border-l-2 border-orange-400 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-6 border-t-2 border-dashed border-orange-500" />
            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Perf cut offset</span>
          </div>
          <Slider
            label=""
            value={params.perfOffset}
            min={0}
            max={50}
            step={1}
            unit=" px"
            onChange={(v) => set('perfOffset', v)}
          />
        </div>
      )}

      <div className="pt-1">
        <button
          onClick={() => set('enclose', !params.enclose)}
          className={`w-full py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors flex items-center gap-2 ${
            params.enclose
              ? 'border-violet-500 bg-violet-50 text-violet-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
            params.enclose ? 'border-violet-500 bg-violet-500' : 'border-gray-400'
          }`}>
            {params.enclose && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          <span>Enclose — outer contour only</span>
          <span className="ml-auto text-xs font-normal opacity-60">removes inner cuts</span>
        </button>
      </div>
    </div>
  );
}
