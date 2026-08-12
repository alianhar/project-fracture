import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { postCompare } from '@/lib/api/endpoints';
import type { CompareModelResult } from '@/lib/api/types';

export function useCompareFlow() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [results, setResults] = useState<CompareModelResult[] | null>(null);

  const mutation = useMutation({ mutationFn: postCompare });

  const runCompare = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setResults(null);
      try {
        const res = await mutation.mutateAsync(file);
        setResults(res.results);
      } catch (err) {
        console.error('[Compare] gagal membandingkan model:', err);
        setResults(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const reset = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setResults(null);
  }, [imageUrl]);

  return {
    imageUrl,
    results,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    runCompare,
    reset,
  };
}
