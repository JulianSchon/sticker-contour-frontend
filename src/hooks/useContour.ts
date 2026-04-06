import { useQuery } from '@tanstack/react-query';
import { fetchContourPreview } from '../lib/api.ts';
import { useDebounce } from './useDebounce.ts';
import type { ContourParams, ContourPreviewResponse } from '../types/contour.ts';

interface UseContourResult {
  data: ContourPreviewResponse | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches a contour preview from the backend.
 *
 * Threshold changes trigger a debounced re-fetch (300ms) because they require
 * server-side bitmap re-computation. Offset and smoothing are also sent to the
 * server because they affect the potrace input; the canvas then renders the
 * returned path at face value.
 */
export function useContour(
  file: File | null,
  params: ContourParams
): UseContourResult {
  // Debounce all params to avoid hammering the server while sliders are being dragged
  const debouncedParams = useDebounce(params, 300);

  const query = useQuery({
    queryKey: ['contour', file?.name, file?.size, debouncedParams],
    queryFn: () => fetchContourPreview(file!, debouncedParams),
    enabled: file !== null,
    staleTime: 0,
  });

  return {
    data: query.data,
    isLoading: query.isFetching,
    error: query.error as Error | null,
  };
}
