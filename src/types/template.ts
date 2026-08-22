export interface TemplateSizeOption {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
}

export interface TemplateSizeRange {
  min: number;
  max: number;
}

export interface TemplateCustomSize {
  widthMm: TemplateSizeRange;
  heightMm: TemplateSizeRange;
}

export interface StickerTemplate {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  sheetCutPath: string;
  sheetBBoxMm: { x: number; y: number; w: number; h: number };
  shields: Array<{ clipPath: string; cutPath: string }>;
  /** Standard label sizes (parametric templates only; first = default). */
  sizes?: TemplateSizeOption[];
  /** Allowed free-size range, or null when only the listed sizes exist. */
  custom?: TemplateCustomSize | null;
}

/** A requested label size in mm for parametric templates. */
export interface TemplateSizeMm {
  widthMm: number;
  heightMm: number;
}
