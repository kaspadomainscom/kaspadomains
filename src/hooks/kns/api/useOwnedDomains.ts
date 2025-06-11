// src/hooks/kns/useOwnedDomains.ts
import { useQuery } from '@tanstack/react-query';

import { DomainAsset } from '../types';

const fetchOwnedDomains = async (address: string): Promise<DomainAsset[]> => {
  const url = new URL('https://api.knsdomains.org/mainnet/api/v1/assets');
  url.searchParams.set('owner', address);
  url.searchParams.set('type', 'domain');
  url.searchParams.set('pageSize', '100');

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`HTTP error: ${res.status}`);
  }

  const data = await res.json();

  if (!Array.isArray(data.assets)) {
    throw new Error(data + " " + data.assets);
  }

  return data.assets || [];
};

export function useOwnedDomains(address: string | null) {
  return useQuery<DomainAsset[], Error>({
    queryKey: ['ownedDomains', address],
    queryFn: () => {
      if (!address) throw new Error('No address provided');
      return fetchOwnedDomains(address);
    },
    enabled: !!address, // Skip if address is null
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
