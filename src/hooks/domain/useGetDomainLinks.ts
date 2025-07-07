import { contracts } from "@/lib/contracts";
import { kasplexClient } from "@/lib/viemClient";
import { useEffect, useState } from "react";

// src/hooks/domains/useGetDomainLinks.ts
export function useGetDomainLinks(domain: string) {
  const [links, setLinks] = useState<string[]>([]);
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
        setLinks(result as string[]);
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
