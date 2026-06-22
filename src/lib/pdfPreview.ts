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

/**
 * Reads the first page's physical size in millimetres. The backend crops the
 * CutContour PDF to the cut-contour bounding box, so this is the real sticker
 * size — used to pack sheet items tightly instead of by the (larger) artboard.
 */
export async function getPdfPageSizeMm(file: File): Promise<{ widthMm: number; heightMm: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const { width, height } = page.getViewport({ scale: 1 }); // PDF points (1/72")
  const PT_TO_MM = 25.4 / 72;
  return { widthMm: width * PT_TO_MM, heightMm: height * PT_TO_MM };
}

/**
 * Renders the first page of a PDF file to a PNG Blob (for upload, not display).
 * @param file  The PDF File object
 * @param scale Resolution multiplier
 */
export async function renderPdfFirstPageBlob(file: File, scale = 1): Promise<Blob> {
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

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Failed to render PDF thumbnail'))),
      'image/png',
    );
  });
}
