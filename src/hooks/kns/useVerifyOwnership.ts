import { useQuery } from '@tanstack/react-query';

interface VerifiedDomain {
  assetId: string;
  mimeType: string;
  asset: string;
  creationBlockTime: string; // ISO date string
  owner: string;
  isDomain: boolean;
  isVerifiedDomain: boolean;
  status: string;
}

interface Pagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface AssetsResponse {
  assets: VerifiedDomain[];
  pagination: Pagination;
  error?: string; // For error responses
}

interface UseVerifiedDomainsOptions {
  owner: string | null;
  page?: number;
  pageSize?: number;
}

export function useVerifiedDomains({ owner, page = 1, pageSize = 20 }: UseVerifiedDomainsOptions) {
  return useQuery<AssetsResponse, Error>({
    queryKey: ['kns', 'verifiedDomains', owner, page, pageSize],
    queryFn: async () => {
      if (!owner) throw new Error('Owner is required');

      const url = new URL('https://api.knsdomains.org/mainnet/api/v1/assets');
      url.searchParams.set('owner', owner);
      url.searchParams.set('type', 'domain');
      url.searchParams.set('page', page.toString());
      url.searchParams.set('pageSize', pageSize.toString());

      const res = await fetch(url.toString());

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error || 'Failed to fetch assets';
        throw new Error(errorMsg);
      }

      const data: AssetsResponse = await res.json();

      if (!data.assets) throw new Error(data.error || 'No assets found');

      // Filter to only verified domains
      data.assets = data.assets.filter((asset) => asset.isVerifiedDomain);

      return data;
    },
    enabled: !!owner,
    staleTime: 5 * 60 * 1000,
  });
}
