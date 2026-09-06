// src/hooks/kns/useAssetStatus.ts
import { useQuery } from '@tanstack/react-query';
import { KNS_NETWORK, knsApiUrl } from '@/lib/kaspaDomainRuntime';

export function useAssetStatus(domain: string | null) {
  return useQuery({
    queryKey: ['kns', KNS_NETWORK, 'assetStatus', domain],
    queryFn: async () => {
      if (!domain) throw new Error("Domain is required");
      const url = knsApiUrl('assets');
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
