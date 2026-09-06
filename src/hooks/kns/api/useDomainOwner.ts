// src/hooks/kns/useDomainOwner.ts
import { useQuery } from '@tanstack/react-query';
import { KNS_NETWORK, knsApiUrl } from '@/lib/kaspaDomainRuntime';

interface OwnerResponse {
  success: boolean;
  data: {
    id: string;
    asset: string;
    owner: string;
  } | null;
  message?: string;
}

export function useDomainOwner(domain: string | null) {
  return useQuery<string, Error>({
    queryKey: ['kns', KNS_NETWORK, 'domainOwner', domain],
    queryFn: async () => {
      if (!domain) throw new Error('Domain is required');
      if (!domain.toLowerCase().endsWith('.kas')) throw new Error('Invalid domain format');

      const response = await fetch(knsApiUrl(`${encodeURIComponent(domain.toLowerCase())}/owner`));
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const data: OwnerResponse = await response.json();

      if (!data.success || !data.data?.owner) {
        throw new Error(data.message || 'Owner not found');
      }

      return data.data.owner;
    },
    enabled: !!domain,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1, // Retry once on failure
  });
}
