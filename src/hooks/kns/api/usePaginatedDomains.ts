// src/hooks/kns/usePaginatedDomains.ts
import { useQuery } from '@tanstack/react-query';

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

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });

      const res = await fetch(url.toString());
      const data = await res.json();

      return {
        domains: data.assets || [],
        pagination: data.pagination,
      };
    },
    staleTime: 1000 * 60,
  });
}
