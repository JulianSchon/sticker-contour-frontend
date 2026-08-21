import type { TemplateSizeMm, TemplateSizeOption, TemplateSizeRange } from '../types/template.ts';

export const clampToRange = (v: number, range: TemplateSizeRange): number =>
  Math.min(range.max, Math.max(range.min, v));

export const sizeMatches = (s: TemplateSizeOption, v: TemplateSizeMm): boolean =>
  Math.abs(s.widthMm - v.widthMm) < 0.001 && Math.abs(s.heightMm - v.heightMm) < 0.001;

export const sameSize = (a: TemplateSizeMm | null, b: TemplateSizeMm): boolean =>
  a !== null && Math.abs(a.widthMm - b.widthMm) < 0.001 && Math.abs(a.heightMm - b.heightMm) < 0.001;

/** Short pill label: "33 cl — helt varv (204 × 90 mm)" → "33 cl". */
export const pillLabel = (name: string): string => name.split(' — ')[0].split(' (')[0];
