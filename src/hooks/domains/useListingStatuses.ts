// src/hooks/domains/useListingStatuses.ts
"use client";

import { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchListingStatuses } from '@/data/supabaseSource';
import type { Domain } from '@/data/types';

export type ListingStatus = { domain: Domain; votes: number };

type Result = {
  /** Which request produced this, so a stale answer is never shown as fresh. */
  key: string;
  statuses: Map<string, ListingStatus> | null;
  error: string | null;
};

/**
 * For a set of domain names the wallet owns on KNS, which are listed *here*.
 *
 * Two different questions get confused constantly in this app, so to be
 * explicit: KNS says what a wallet **owns**, and KNS's own `listed` field means
 * "for sale on the KNS marketplace". Neither answers "is this on KaspaDomains",
 * which is what this hook is for. Reading the KNS field and labelling it Listed
 * is what made "My Domains" claim domains were listed here when they weren't.
 *
 * `statuses === null` means "not known" -- unconfigured, still loading, or
 * failed. Callers must render that as unknown rather than as "not listed", or a
 * database outage silently invites the owner to pay to list something twice.
 *
 * Loading and staleness are **derived** from whether the stored result matches
 * the current request key, rather than tracked in their own state. Setting
 * state synchronously in the effect body to reset them is what the
 * `set-state-in-effect` rule is warning about, and the derivation is also more
 * correct: a result for the previous key can never briefly show as current.
 */
export function useListingStatuses(names: string[]) {
  const key = useMemo(
    () =>
      Array.from(new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean)))
        .sort()
        .join(','),
    [names]
  );

  const enabled = isSupabaseConfigured && key.length > 0;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    fetchListingStatuses(key.split(','))
      .then((statuses) => {
        if (!cancelled) setResult({ key, statuses, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ key, statuses: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, key]);

  const fresh = result && result.key === key ? result : null;

  return {
    statuses: fresh?.statuses ?? null,
    isLoading: enabled && !fresh,
    error: fresh?.error ?? null,
    supported: isSupabaseConfigured,
  };
}
