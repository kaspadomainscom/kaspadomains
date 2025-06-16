import { useQuery } from '@tanstack/react-query';

export interface DomainAsset {
  name: string;
  type: 'domain' | 'text';
  image?: string;
  description?: string;
  website?: string;
  twitter?: string;
  bio?: string;
  [extraProps: string]: unknown; // use `unknown` instead of `any` for future-proofing
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

interface UsePaginatedDomainsParams {
  page?: number;
  pageSize?: number;
  owner?: string;
  asset?: string;
  status?: 'default' | 'listed';
  type?: 'domain' | 'text';
  collection?: string;
}

interface ApiResponse {
  assets: DomainAsset[];
  pagination: Pagination;
}

export function usePaginatedDomains(params: UsePaginatedDomainsParams) {
  return useQuery<{
    domains: DomainAsset[];
    pagination: Pagination;
  }, Error>({
    queryKey: ['kns', 'paginated', params],
    queryFn: async () => {
      const url = new URL('https://api.knsdomains.org/mainnet/api/v1/assets');

      const queryParams: Record<string, string> = {
        page: String(params.page ?? 1),
        pageSize: String(params.pageSize ?? 12),
      };

      if (params.owner) queryParams.owner = params.owner;
      if (params.asset) queryParams.asset = params.asset;
      if (params.status) queryParams.status = params.status;
      if (params.type) queryParams.type = params.type;
      if (params.collection) queryParams.collection = params.collection;

      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      const res = await fetch(url.toString());

      if (!res.ok) {
        throw new Error(`KNS API error: ${res.status} ${res.statusText}`);
      }

      const data: ApiResponse = await res.json();

      return {
        domains: data.assets,
        pagination: data.pagination,
      };
    },
    staleTime: 60_000,
    enabled: !!params.owner,
  });
}
