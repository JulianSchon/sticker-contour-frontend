import { useEffect, useState } from 'react';
import type { Canvas } from 'fabric';
import { flattenCanvasToFile } from '../../lib/flatten.ts';
import { exportDimensions } from '../../lib/printSize.ts';
import type { ArtboardSize } from '../../types/editor.ts';

/** Produces a flattened PNG File whenever `version` changes (bump it on canvas
 *  edits). Debounced to avoid flattening on every drag frame. */
export function useFlattenedFile(
  canvas: Canvas | null,
  displayWidth: number,
  size: ArtboardSize,
  version: number,
): File | null {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!canvas) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      const { widthPx } = exportDimensions(size.wCm, size.hCm);
      const f = await flattenCanvasToFile(canvas, displayWidth, widthPx);
      if (!cancelled) setFile(f);
    }, 400);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [canvas, displayWidth, size.wCm, size.hCm, version]);

  return file;
}
