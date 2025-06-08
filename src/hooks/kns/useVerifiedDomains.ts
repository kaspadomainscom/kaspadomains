import { useQuery } from '@tanstack/react-query';

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
    queryKey: ['kns', 'verifiedDomains', address],
    queryFn: async () => {
      if (!address) throw new Error("Address is required");

      const url = new URL('https://api.knsdomains.org/mainnet/api/v1/assets');
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
