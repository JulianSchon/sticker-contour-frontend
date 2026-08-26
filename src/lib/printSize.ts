/** Print-size math. Artboard is defined in cm; raster export targets 300 DPI,
 *  capped so the longest side never exceeds MAX_EXPORT_PX (keeps us inside the
 *  backend's 20 MB upload + processing limits). */

export const EXPORT_DPI = 300;
export const MAX_EXPORT_PX = 3100; // 25 cm @ 300 DPI ≈ 2953 px, so it stays full-res
const CM_PER_INCH = 2.54;

export interface SizePreset {
  labelEn: string;
  labelSv: string;
  wCm: number;
  hCm: number;
}

export const SIZE_PRESETS: SizePreset[] = [
  { labelEn: 'Small 5×5',   labelSv: 'Liten 5×5',   wCm: 5,  hCm: 5  },
  { labelEn: 'Medium 7×7',  labelSv: 'Mellan 7×7',  wCm: 7,  hCm: 7  },
  { labelEn: 'Large 10×10', labelSv: 'Stor 10×10',  wCm: 10, hCm: 10 },
  { labelEn: '15×15',       labelSv: '15×15',       wCm: 15, hCm: 15 },
  { labelEn: '20×20',       labelSv: '20×20',       wCm: 20, hCm: 20 },
  { labelEn: 'XL 25×25',    labelSv: 'XL 25×25',    wCm: 25, hCm: 25 },
];

/**
 * Parse a typed size into whole centimetres (≥ 1), or null when empty/invalid.
 * WooCommerce's CPO width/height fields are integer-typed, so a decimal cm
 * would make add-to-cart fail silently. There is no upper limit — oversize
 * stickers are handled by the backend at a lower effective DPI.
 */
export function parseWholeCm(raw: string): number | null {
  const val = parseFloat(raw);
  if (isNaN(val) || val <= 0) return null;
  return Math.max(1, Math.round(val));
}

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
