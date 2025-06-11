import { useQuery } from '@tanstack/react-query';
import { DomainAsset, Pagination } from '../types';

// Match KNS API's actual response
interface KNSApiResponse {
  assets: DomainAsset[];
  pagination: Pagination;
}

const fetchOwnedDomains = async (address: string): Promise<DomainAsset[]> => {
  const url = new URL('https://api.knsdomains.org/mainnet/api/v1/assets');
  url.searchParams.set('owner', address);
  url.searchParams.set('type', 'domain');
  url.searchParams.set('pageSize', '100'); // max allowed

  const res = await fetch(url.toString());

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`HTTP error ${res.status}:`, errorText);
    throw new Error(`HTTP error: ${res.status}`);
  }

  const data: KNSApiResponse = await res.json();

  // Validate structure
  if (!Array.isArray(data.assets)) {
    console.error('Invalid API response structure:', data);
    throw new Error('Invalid API response: expected "assets" array');
  }

  return data.assets.map((asset) => ({
    assetId: asset.assetId,
    mimeType: asset.mimeType ?? '',
    asset: asset.asset,
    creationBlockTime: asset.creationBlockTime,
    owner: asset.owner,
    isDomain: asset.isDomain,
    isVerifiedDomain: asset.isVerifiedDomain,
    status: asset.status ?? 'default',
  }));
};

export function useOwnedDomains(address: string | null) {
  return useQuery<DomainAsset[], Error>({
    queryKey: ['ownedDomains', address],
    queryFn: () => {
      if (!address) throw new Error('No address provided');
      return fetchOwnedDomains(address);
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
