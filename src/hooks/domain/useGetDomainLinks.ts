import { contracts } from "@/lib/contracts";
import { kasplexClient } from "@/lib/viemClient";
import { useEffect, useState } from "react";

export type DomainLink = {
  name: string;
  url: string;
};

// src/hooks/domain/useGetDomainLinks.ts
export function useGetDomainLinks(domain: string) {
  const [links, setLinks] = useState<DomainLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;

    async function fetch() {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.DomainLinksStorage.address,
          abi: contracts.DomainLinksStorage.abi,
          functionName: 'getLinks',
          args: [domain],
        });
        setLinks(result as DomainLink[]);
      } catch (err) {
        console.error('Failed to fetch domain links:', err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [domain]);

  return { links, loading };
}
