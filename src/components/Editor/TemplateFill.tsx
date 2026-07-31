import type { StickerTemplate } from '../../types/template.ts';

interface Props { template: StickerTemplate; bgColor: string; width: number; height: number; }

/** Under-layer for template mode: white sheet + the shield interiors filled with the
 *  chosen colour, sized to the editor canvas. Sits BEHIND the (transparent) design
 *  canvas so the customer sees their artwork on the coloured shields — matching the
 *  generated PDF. Purely visual; never part of the design/flatten. */
export function TemplateFill({ template, bgColor, width, height }: Props) {
  const { widthMm, heightMm, shields } = template;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${widthMm} ${heightMm}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect width={widthMm} height={heightMm} fill="#ffffff" />
      {shields.map((s, i) => (
        <path key={i} d={s.clipPath} fill={bgColor} />
      ))}
    </svg>
  );
}
