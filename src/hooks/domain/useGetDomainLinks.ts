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
    let cancelled = false;

    async function fetchLinks() {
      // No domain to look up: report "done, nothing found" rather than
      // staying in a loading state forever. Callers gate their editors on
      // this flag, so a stuck `true` would lock the UI permanently.
      if (!domain) {
        if (!cancelled) {
          setLinks([]);
          setLoading(false);
        }
        return;
      }

      // Re-enter the loading state on every domain change, otherwise a
      // previous domain's completed fetch leaves `loading` false while the
      // new one is still in flight.
      if (!cancelled) setLoading(true);

      try {
        const result = await kasplexClient.readContract({
          address: contracts.DomainLinksStorage.address,
          abi: contracts.DomainLinksStorage.abi,
          functionName: 'getLinks',
          args: [domain],
        });
        if (!cancelled) setLinks(result as DomainLink[]);
      } catch (err) {
        console.error('Failed to fetch domain links:', err);
        if (!cancelled) setLinks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchLinks();

    return () => {
      cancelled = true;
    };
  }, [domain]);

  return { links, loading };
}
