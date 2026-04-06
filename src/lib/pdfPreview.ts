import * as pdfjsLib from 'pdfjs-dist';

// Point the worker at the bundled worker file served from node_modules via Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).href;

/**
 * Renders the first page of a PDF file to a PNG data URL.
 * @param file  The PDF File object
 * @param scale Resolution multiplier (2 = 2× the CSS pixel density, good for retina)
 */
export async function renderPdfFirstPage(file: File, scale = 2): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width  = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  return canvas.toDataURL('image/png');
}
