import type { ContourParams, ContourPreviewResponse } from '../types/contour.ts';
import type { ExportCopy, RegmarkType } from '../types/printPlanning.ts';

function buildBase(): string {
  let url = import.meta.env.VITE_API_URL ?? '';
  if (url && !url.startsWith('http')) url = 'https://' + url;
  return url.replace(/\/$/, '') + '/api';
}
const BASE = buildBase();

const MM_TO_PX = 300 / 25.4; // offsets stored in mm, backend expects px at 300 DPI

function buildFormData(file: File, params: ContourParams): FormData {
  const fd = new FormData();
  fd.append('image', file);
  fd.append('threshold', String(params.threshold));
  fd.append('kissOffset', String(Math.round(params.kissOffset * MM_TO_PX)));
  fd.append('perfOffset', String(Math.round(params.perfOffset * MM_TO_PX)));
  fd.append('smoothing', String(params.smoothing));
  fd.append('cutMode', params.cutMode);
  fd.append('enclose', String(params.enclose));
  fd.append('shapeType', params.shapeType);
  fd.append('shapeSize', String(params.shapeSize));
  fd.append('shapeOffsetX', String(params.shapeOffsetX));
  fd.append('shapeOffsetY', String(params.shapeOffsetY));
  return fd;
}

export async function fetchContourPreview(
  file: File,
  params: ContourParams
): Promise<ContourPreviewResponse> {
  const res = await fetch(`${BASE}/contour-preview`, {
    method: 'POST',
    body: buildFormData(file, params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Preview failed');
  }

  return res.json() as Promise<ContourPreviewResponse>;
}

export async function generatePdfBlob(file: File, params: ContourParams): Promise<Blob> {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    body: buildFormData(file, params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'PDF generation failed');
  }

  return res.blob();
}

export async function downloadPdf(file: File, params: ContourParams, filename = 'sticker-cutcontour.pdf'): Promise<void> {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    body: buildFormData(file, params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'PDF generation failed');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function enhanceImage(file: File): Promise<{ file: File; dataUrl: string }> {
  const fd = new FormData();
  fd.append('image', file);

  const res = await fetch(`${BASE}/enhance`, { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Enhancement failed');
  }

  const blob = await res.blob();
  const enhancedFile = new File([blob], 'enhanced.png', { type: 'image/png' });
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(blob);
  });

  return { file: enhancedFile, dataUrl };
}

export async function fetchPdfDimensions(
  file: File
): Promise<{ widthMm: number; heightMm: number }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/print-planning/pdf-info`, { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Failed to read PDF dimensions');
  }
  return res.json();
}

export async function exportPrintLayoutBlob(
  files: File[],
  layout: { foilWidthMm: number; totalLengthMm: number; copies: ExportCopy[]; regmarkType: RegmarkType },
): Promise<Blob> {
  const fd = new FormData();
  files.forEach(f => fd.append('files', f, f.name));
  fd.append('layout', JSON.stringify(layout));
  const res = await fetch(`${BASE}/print-planning/export`, { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Export failed');
  }
  return res.blob();
}

export async function exportPrintLayout(
  files: File[],
  layout: { foilWidthMm: number; totalLengthMm: number; copies: ExportCopy[]; regmarkType: RegmarkType },
  filename = 'print-foil.pdf'
): Promise<void> {
  const blob = await exportPrintLayoutBlob(files, layout);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
