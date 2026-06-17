/** Print-size math. Artboard is defined in cm; raster export targets 300 DPI,
 *  capped so the longest side never exceeds MAX_EXPORT_PX (keeps us inside the
 *  backend's 20 MB upload + processing limits). */

export const EXPORT_DPI = 300;
export const MAX_EXPORT_PX = 3000;
const CM_PER_INCH = 2.54;

export interface SizePreset {
  labelEn: string;
  labelSv: string;
  wCm: number;
  hCm: number;
}

export const SIZE_PRESETS: SizePreset[] = [
  { labelEn: 'Small 5×5',  labelSv: 'Liten 5×5',  wCm: 5,  hCm: 5 },
  { labelEn: 'Medium 7×7', labelSv: 'Mellan 7×7', wCm: 7,  hCm: 7 },
  { labelEn: 'Large 10×10', labelSv: 'Stor 10×10', wCm: 10, hCm: 10 },
];

export function cmToPx(cm: number, dpi: number): number {
  return Math.round((cm / CM_PER_INCH) * dpi);
}

export interface ExportDims {
  widthPx: number;
  heightPx: number;
  dpi: number;
}

/** Pixel size for a cm artboard at EXPORT_DPI, scaled down if the longest side
 *  would exceed MAX_EXPORT_PX (effective DPI drops to keep physical size). */
export function exportDimensions(wCm: number, hCm: number): ExportDims {
  let widthPx = cmToPx(wCm, EXPORT_DPI);
  let heightPx = cmToPx(hCm, EXPORT_DPI);
  let dpi = EXPORT_DPI;

  const longest = Math.max(widthPx, heightPx);
  if (longest > MAX_EXPORT_PX) {
    const scale = MAX_EXPORT_PX / longest;
    widthPx = Math.round(widthPx * scale);
    heightPx = Math.round(heightPx * scale);
    dpi = Math.round(EXPORT_DPI * scale);
  }
  return { widthPx, heightPx, dpi };
}
