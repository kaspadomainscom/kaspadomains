import { useQuery } from '@tanstack/react-query';
import { KNS_NETWORK, knsApiUrl } from '@/lib/kaspaDomainRuntime';

interface VerifiedDomain {
  assetId: string;
  mimeType: string;
  asset: string;
  creationBlockTime: string;
  owner: string;
  isDomain: boolean;
  isVerifiedDomain: boolean;
  status: string;
}

interface AssetsResponse {
  assets: VerifiedDomain[];
}

export function useVerifiedDomains(address: string | null) {
  return useQuery<VerifiedDomain[], Error>({
    queryKey: ['kns', KNS_NETWORK, 'verifiedDomains', address],
    queryFn: async () => {
      if (!address) throw new Error("Address is required");

      const url = knsApiUrl('assets');
      url.searchParams.set('owner', address);
      url.searchParams.set('type', 'domain');
      url.searchParams.set('pageSize', '100');

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Failed to fetch domains: ${res.statusText}`);
      }

      const data: AssetsResponse = await res.json();

      return (data.assets || []).filter((d) => d.isVerifiedDomain);
    },
    enabled: !!address,
    staleTime: 1000 * 60,
  });
}
