import { useQuery } from '@tanstack/react-query';
import { DomainAsset, Pagination } from '../types';

interface KNSApiResponseData {
  assets: DomainAssetRaw[];
  pagination?: Pagination;
}

interface KNSApiResponse {
  success: boolean;
  data: KNSApiResponseData;
}

interface DomainAssetRaw {
  id: string;
  assetId: string;
  mimeType?: string;
  asset: string;
  owner: string;
  creationBlockTime: string;
  isDomain: boolean;
  isVerifiedDomain: boolean;
  status?: string;
  transactionId?: string;
}

interface UseOwnedDomainsResult {
  domains: DomainAsset[];
  pagination?: Pagination;
}

const fetchOwnedDomains = async (address: string): Promise<UseOwnedDomainsResult> => {
  const url = new URL('https://api.knsdomains.org/mainnet/api/v1/assets');
  url.searchParams.set('owner', address);
  url.searchParams.set('type', 'domain');
  url.searchParams.set('pageSize', '100');

  const res = await fetch(url.toString());

  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    let errorDetails: string | Record<string, unknown> = await res.text();

    if (contentType?.includes('application/json')) {
      try {
        errorDetails = await res.json();
      } catch {
        // fallback to original text if JSON parsing fails
      }
    }

    console.error(`HTTP ${res.status} error:`, errorDetails);

    throw new Error(
      `API request failed with status ${res.status}:\n` +
        (typeof errorDetails === 'string'
          ? errorDetails
          : JSON.stringify(errorDetails, null, 2))
    );
  }

  const json: KNSApiResponse = await res.json();

  if (!json.success) {
    throw new Error(`API responded with success=false: ${JSON.stringify(json)}`);
  }

  const data = json.data;

  if (!data || !Array.isArray(data.assets)) {
    console.error('Invalid API response structure:', json);
    throw new Error(
      `Invalid API response: expected "data.assets" array.\nResponse:\n${JSON.stringify(
        json,
        null,
        2
      )}`
    );
  }

  // Map the raw assets to DomainAsset type (adjust to your DomainAsset interface)
  const domains: DomainAsset[] = data.assets.map((asset) => ({
    assetId: asset.assetId,
    mimeType: asset.mimeType ?? '',
    asset: asset.asset,
    creationBlockTime: asset.creationBlockTime,
    owner: asset.owner,
    isDomain: asset.isDomain,
    isVerifiedDomain: asset.isVerifiedDomain,
    status: asset.status ?? 'default',
    // Optionally add id and transactionId if your DomainAsset supports them
    // id: asset.id,
    // transactionId: asset.transactionId,
  }));

  return {
    domains,
    pagination: data.pagination,
  };
};

export function useOwnedDomains(address: string | null) {
  return useQuery<UseOwnedDomainsResult, Error>({
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
