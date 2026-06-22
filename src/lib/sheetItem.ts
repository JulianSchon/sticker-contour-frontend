import { generatePdfBlob } from './api.ts';
import { renderPdfFirstPage, getPdfPageSizeMm } from './pdfPreview.ts';
import type { ContourParams } from '../types/contour.ts';
import type { PlannedFile } from '../types/printPlanning.ts';

export const SHEET_COLORS = [
  '#FFE600', '#ef4444', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b',
];

/** Turn a flattened design into a kiss-cut (CutContour) sticker for the sheet. */
export async function buildSheetItem(
  file: File,
  params: ContourParams,
  wCm: number,
  hCm: number,
  colorIndex: number,
): Promise<PlannedFile> {
  const kissParams: ContourParams = { ...params, cutMode: 'kiss', kissOffset: params.perfOffset };
  const pdfBlob = await generatePdfBlob(file, kissParams);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const pdfFile = new File([pdfBlob], `${baseName}.pdf`, { type: 'application/pdf' });
  const previewUrl = await renderPdfFirstPage(pdfFile).catch(() => undefined);
  // Size the sheet item by the cut-contour PDF (already cropped to the sticker)
  // so it packs by the real sticker size, not the larger artboard. Fall back to
  // the artboard size if the PDF can't be measured.
  const size = await getPdfPageSizeMm(pdfFile).catch(() => null);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file: pdfFile,
    name: baseName,
    widthMm: size ? size.widthMm : wCm * 10,
    heightMm: size ? size.heightMm : hCm * 10,
    quantity: 1,
    color: SHEET_COLORS[colorIndex % SHEET_COLORS.length],
    previewUrl,
  };
}
