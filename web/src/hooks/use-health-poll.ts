import { useQuery } from '@tanstack/react-query';
import { getHealth } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';

/**
 * Poll /health selama belum "ready" — drive ColdStartBanner di seluruh rute.
 *
 * `refetchIntervalInBackground: true` disengaja: default QueryClient global
 * mematikan refetch-on-focus (lihat main.tsx) supaya query lain tidak
 * berisik saat tab di-background lalu difokuskan lagi. Tapi TanStack Query
 * tetap menjadwalkan timer refetchInterval setiap saat, hanya SKIP
 * pemanggilan aktualnya ketika `!focusManager.isFocused()` — tanpa override
 * ini, kalau user meng-minimize tab persis saat cold-start, banner akan
 * macet permanen menampilkan status lama walau tab difokuskan lagi (karena
 * refetchOnWindowFocus juga mati). Health-check ini murah dan singkat,
 * jadi pengecualian dari default global tersebut aman diambil.
 */
export function useHealthPoll() {
  const query = useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
    refetchInterval: (q) => (q.state.data?.status === 'ready' ? false : 2000),
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  return {
    ...query,
    isReady: query.data?.status === 'ready',
    isWarming: query.data?.status === 'warming' || query.data?.status === 'cold',
  };
}
