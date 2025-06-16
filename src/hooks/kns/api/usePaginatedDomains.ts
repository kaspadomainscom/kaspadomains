import { useQuery } from '@tanstack/react-query';

export interface DomainAsset {
  name: string;
  type: 'domain' | 'text';
  // add other relevant fields as needed
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

export function usePaginatedDomains(params: {
  page?: number;
  pageSize?: number;
  owner?: string;
  asset?: string;
  status?: 'default' | 'listed';
  type?: 'domain' | 'text';
  collection?: string;
}) {
  return useQuery({
    queryKey: ['kns', 'paginated', params],
    queryFn: async () => {
      const url = new URL('https://api.knsdomains.org/mainnet/api/v1/assets');

      const finalParams = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 12,
        ...params,
      };

      Object.entries(finalParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });

      const res = await fetch(url.toString());

      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }

      const data = await res.json();

      return {
        domains: data.assets as DomainAsset[],
        pagination: data.pagination as Pagination,
      };
    },
    staleTime: 60_000, // 1 minute
  });
}
