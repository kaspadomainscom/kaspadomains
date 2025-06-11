// src/hooks/kns/useCheckDomainAvailability.ts
import { useMutation } from '@tanstack/react-query';

type DomainCheckRequest = {
  domainNames: string[];
  address: string;
};

type DomainCheckResult = {
  domain: string;
  available: boolean;
  isReservedDomain: boolean;
};

type ApiResponse = {
  success: boolean;
  data: {
    domains: DomainCheckResult[];
  };
};

export const useCheckDomainAvailability = () => {
  return useMutation<DomainCheckResult[], Error, DomainCheckRequest>({
    mutationFn: async ({ domainNames, address }) => {
      const res = await fetch('https://api.knsdomains.org/mainnet/api/v1/domains/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domainNames, address }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.message || 'Failed to check domain availability');
      }

      const json: ApiResponse = await res.json();
      return json.data.domains;
    },
  });
};
