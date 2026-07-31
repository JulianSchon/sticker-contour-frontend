export interface StickerTemplate {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  sheetCutPath: string;
  sheetBBoxMm: { x: number; y: number; w: number; h: number };
  shields: Array<{ clipPath: string; cutPath: string }>;
}
