import { useQuery } from '@tanstack/react-query';
import { loadContentLibrary } from '../lib/contentSource.ts';
import type { ContentLibrary } from '../types/content.ts';

const REST_BASE = import.meta.env.VITE_CONTENT_URL as string | undefined;

const EMPTY: ContentLibrary = { templates: [], clipart: [] };

export function useContentLibrary(): { library: ContentLibrary; isLoading: boolean } {
  const query = useQuery({
    queryKey: ['content-library', REST_BASE ?? 'bundled'],
    queryFn: () => loadContentLibrary(REST_BASE),
    staleTime: 5 * 60 * 1000,
  });
  return { library: query.data ?? EMPTY, isLoading: query.isLoading };
}
