import { useQuery } from '@tanstack/react-query';

export interface DomainAsset {
  name: string;
  type: 'domain' | 'text';
  image?: string;
  description?: string;
  website?: string;
  twitter?: string;
  bio?: string;
  [extraProps: string]: unknown;
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
  success: boolean;
  data: {
    assets: DomainAsset[];
    pagination: Pagination;
  };
}

interface UsePaginatedDomainsResult {
  domains: DomainAsset[];
  pagination: Pagination;
}

const fetchPaginatedDomains = async (
  params: UsePaginatedDomainsParams
): Promise<UsePaginatedDomainsResult> => {
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

  console.debug('[usePaginatedDomains] Fetching with URL:', url.toString());

  const res = await fetch(url.toString());

  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    let errorDetails: string | Record<string, unknown> = await res.text();

    if (contentType?.includes('application/json')) {
      try {
        errorDetails = await res.json();
      } catch {
        // JSON parse failed
      }
    }

    console.error(`HTTP ${res.status} error:`, errorDetails);
    throw new Error(
      `API request failed with status ${res.status}:\n${
        typeof errorDetails === 'string'
          ? errorDetails
          : JSON.stringify(errorDetails, null, 2)
      }`
    );
  }

  const json: ApiResponse = await res.json();
  console.debug('[usePaginatedDomains] Response JSON:', json);

  if (!json.success || !Array.isArray(json.data.assets)) {
    console.error('Invalid API response structure:', json);
    throw new Error(
      `Invalid API response: expected "data.assets" array.\nResponse:\n${JSON.stringify(
        json,
        null,
        2
      )}`
    );
  }

  return {
    domains: json.data.assets,
    pagination: json.data.pagination,
  };
};

export function usePaginatedDomains(params: UsePaginatedDomainsParams) {
  return useQuery<UsePaginatedDomainsResult, Error>({
    queryKey: ['kns', 'paginated', params],
    queryFn: () => fetchPaginatedDomains(params),
    staleTime: 60_000,
    enabled: !!params.owner,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
