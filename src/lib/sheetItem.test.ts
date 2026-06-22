import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api.ts', () => ({
  generatePdfBlob: vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })),
}));
vi.mock('./pdfPreview.ts', () => ({
  renderPdfFirstPage: vi.fn(async () => 'data:image/png;base64,AAAA'),
  getPdfPageSizeMm: vi.fn(async () => ({ widthMm: 55, heightMm: 80 })),
}));

import { buildSheetItem, SHEET_COLORS } from './sheetItem.ts';
import { generatePdfBlob } from './api.ts';
import type { ContourParams } from '../types/contour.ts';

const PARAMS: ContourParams = {
  threshold: 128, kissOffset: 0, perfOffset: 3, smoothing: 4, enclose: true,
  cutMode: 'perf', shapeType: 'contour', shapeSize: 90, shapeOffsetX: 0, shapeOffsetY: 0,
};

beforeEach(() => vi.clearAllMocks());

describe('buildSheetItem', () => {
  it('builds a kiss-cut PlannedFile sized by the trimmed PDF, quantity 1', async () => {
    const src = new File(['x'], 'cowgirl.png', { type: 'image/png' });
    const item = await buildSheetItem(src, PARAMS, 7, 5, 0);
    // dims come from the cut-contour PDF (getPdfPageSizeMm), not the artboard
    expect(item.widthMm).toBe(55);
    expect(item.heightMm).toBe(80);
    expect(item.quantity).toBe(1);
    expect(item.name).toBe('cowgirl');
    expect(item.file.type).toBe('application/pdf');
    expect(item.previewUrl).toBe('data:image/png;base64,AAAA');
    expect(item.color).toBe(SHEET_COLORS[0]);
    const passedParams = (generatePdfBlob as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as ContourParams;
    expect(passedParams.cutMode).toBe('kiss');
    expect(passedParams.kissOffset).toBe(3);
  });

  it('cycles colors by index and survives a thumbnail failure', async () => {
    const { renderPdfFirstPage } = await import('./pdfPreview.ts');
    (renderPdfFirstPage as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no canvas'));
    const item = await buildSheetItem(new File(['x'], 'a.png'), PARAMS, 5, 5, SHEET_COLORS.length);
    expect(item.color).toBe(SHEET_COLORS[0]);
    expect(item.previewUrl).toBeUndefined();
  });

  it('falls back to the artboard size if the PDF size cannot be read', async () => {
    const { getPdfPageSizeMm } = await import('./pdfPreview.ts');
    (getPdfPageSizeMm as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('bad pdf'));
    const item = await buildSheetItem(new File(['x'], 'a.png'), PARAMS, 7, 7, 0);
    expect(item.widthMm).toBe(70);
    expect(item.heightMm).toBe(70);
  });
});
