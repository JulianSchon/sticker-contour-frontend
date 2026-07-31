import type { StickerTemplate } from '../../types/template.ts';

interface Props { template: StickerTemplate; width: number; height: number; }

/** Non-interactive overlay: the sheet outline + the two shield cut lines, sized to
 *  the editor canvas. Purely visual — never part of the design/flatten. */
export function TemplateGuide({ template, width, height }: Props) {
  const { widthMm, heightMm, sheetCutPath, shields } = template;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${widthMm} ${heightMm}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {shields.map((s, i) => (
        <path key={i} d={s.cutPath} fill="none" stroke="#ec4899" strokeWidth={0.6} strokeDasharray="2 1.5" opacity={0.9} />
      ))}
      <path d={sheetCutPath} fill="none" stroke="#38bdf8" strokeWidth={0.6} strokeDasharray="3 2" opacity={0.9} />
    </svg>
  );
}
