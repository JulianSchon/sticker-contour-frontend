import { useLang } from '../lib/LangContext.ts';

export const MATERIALS = [
  { value: 'vinyl',     labelKey: 'matVinyl'    },
  { value: 'laminerad', labelKey: 'matLaminerad' },
  { value: 'reflex',    labelKey: 'matReflex'    },
] as const;

export const FINISHES = [
  { value: 'glossy', labelKey: 'finGlossy' },
  { value: 'matte',  labelKey: 'finMatte'  },
] as const;

export type Material = typeof MATERIALS[number]['value'];
export type Finish   = typeof FINISHES[number]['value'];

interface Props {
  material: Material;
  finish: Finish;
  onMaterialChange: (v: Material) => void;
  onFinishChange: (v: Finish) => void;
  /** Restrict which materials are shown. Defaults to all MATERIALS. */
  allowedMaterials?: ReadonlyArray<typeof MATERIALS[number]>;
}

export function MaterialFinishPicker({ material, finish, onMaterialChange, onFinishChange, allowedMaterials }: Props) {
  const { t } = useLang();
  const visibleMaterials = allowedMaterials ?? MATERIALS;

  return (
    <div className="space-y-4">
      {/* Material */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-white">{t.material}</span>
        <div className="flex flex-col gap-1.5">
          {visibleMaterials.map(m => (
            <button
              key={m.value}
              onClick={() => onMaterialChange(m.value)}
              className={`w-full text-left px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                material === m.value
                  ? 'border-nim-yellow bg-nim-yellow/10 text-nim-yellow'
                  : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
              }`}
            >
              {t[m.labelKey as keyof typeof t] as string}
            </button>
          ))}
        </div>
      </div>

      {/* Finish */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-white">{t.finish}</span>
        <div className="grid grid-cols-2 gap-2">
          {FINISHES.map(f => (
            <button
              key={f.value}
              onClick={() => onFinishChange(f.value)}
              className={`py-2 px-2 rounded-lg border-2 text-center text-xs font-semibold transition-all ${
                finish === f.value
                  ? 'border-nim-yellow bg-nim-yellow/10 text-nim-yellow'
                  : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
              }`}
            >
              {t[f.labelKey as keyof typeof t] as string}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
