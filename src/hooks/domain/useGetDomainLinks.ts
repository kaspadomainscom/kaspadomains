import { fetchDomainLinks } from "@/data/supabaseSource";
import { useCallback, useEffect, useState } from "react";

export type DomainLink = {
  name: string;
  url: string;
};

/**
 * A domain's resource links.
 *
 * `links` is `null` for "not known" -- still loading, or the read failed. It is
 * **not** `[]`, and the difference is load-bearing rather than cosmetic: the
 * editor at /domain/update/[name] does a **bulk replace**, so a failed read that
 * looked like "this domain has no links" let the editor unlock with an empty
 * list, and the owner's next save deleted every link they had. Callers must gate
 * on `null`, not just on `loading`.
 */
export function useGetDomainLinks(domain: string) {
  const [links, setLinks] = useState<DomainLink[] | null>(null);
  // Coupled to `links`: this is the revision the editor actually rendered, not
  // a current value fetched just before saving.
  const [profileRevision, setProfileRevision] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLinks() {
      // No domain to look up is a definite answer -- there are no links --
      // rather than a failure, so [] is correct here.
      if (!domain) {
        if (!cancelled) {
          setLinks([]);
          setProfileRevision(null);
          setLoading(false);
        }
        return;
      }

      // Re-enter the loading state on every domain change, otherwise a
      // previous domain's completed fetch leaves `loading` false while the new
      // one is still in flight.
      if (!cancelled) setLoading(true);

      try {
        const snapshot = await fetchDomainLinks(domain);
        if (!cancelled) {
          setLinks(snapshot.links);
          setProfileRevision(snapshot.profileRevision);
        }
      } catch (err) {
        console.error("Failed to fetch domain links:", err);
        // null, not []. See the note on this hook: [] here is a data-loss bug.
        if (!cancelled) {
          setLinks(null);
          setProfileRevision(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchLinks();

    return () => {
      cancelled = true;
    };
  }, [domain]);

  const replaceSnapshot = useCallback((nextLinks: DomainLink[], nextProfileRevision: number) => {
    setLinks(nextLinks);
    setProfileRevision(nextProfileRevision);
  }, []);

  return { links, profileRevision, loading, replaceSnapshot };
}
