// src/hooks/kns/useDomainSearch.ts
import { useQuery } from '@tanstack/react-query';

export function useDomainSearch(query: string | null) {
  return useQuery({
    queryKey: ['kns', 'search', query],
    queryFn: async () => {
      if (!query?.endsWith('.kas')) throw new Error("Invalid domain");

      const url = new URL('https://api.knsdomains.org/mainnet/api/v1/assets');
      url.searchParams.set('asset', query);

      const res = await fetch(url.toString());
      const data = await res.json();

      return data.assets || [];
    },
    enabled: !!query,
    staleTime: 1000 * 30,
  });
}
