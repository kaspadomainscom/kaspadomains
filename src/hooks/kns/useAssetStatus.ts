// src/hooks/kns/useAssetStatus.ts
import { useQuery } from '@tanstack/react-query';

export function useAssetStatus(domain: string | null) {
  return useQuery({
    queryKey: ['kns', 'assetStatus', domain],
    queryFn: async () => {
      if (!domain) throw new Error("Domain is required");
      const url = new URL('https://api.knsdomains.org/mainnet/api/v1/assets');
      url.searchParams.set('asset', domain);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!data.assets?.length) throw new Error("No asset found");
      return data.assets[0].status;
    },
    enabled: !!domain,
    staleTime: 1000 * 60, // 1 minute
  });
}
