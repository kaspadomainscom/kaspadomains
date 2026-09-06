"use client";

import { useCallback, useEffect, useState } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { fetchVotedDomains } from '@/data/supabaseSource';
import type { Domain } from '@/data/types';

/**
 * The domains the connected wallet has voted for.
 *
 * Keyed by the **Kaspa L1 address**, because that is what the vote route
 * records. The contract path this used to fall back to keyed votes by the
 * Kasplex EVM address -- a different address belonging to the same person --
 * so it returned an empty list and looked like "you haven't voted for
 * anything". It was removed on 2026-09-06 along with the rest of the EVM path.
 *
 * Loading and error state are derived from whether the stored result belongs to
 * the current request, which keeps every state transition out of the effect
 * body and makes it impossible to show one wallet's votes while another is
 * connecting.
 */
export type MyVotesResult = {
  /** null means "not known" -- no wallet, still loading, or the load failed. */
  data: Domain[] | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

type Result = { token: string; data: Domain[] | null; error: Error | null };

export function useMyVotes(): MyVotesResult {
  const { kasware } = useWalletContext();
  const account = kasware.account;

  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const refetch = useCallback(() => setReloadCount((n) => n + 1), []);

  // Identifies one specific request. A change to any part of it makes whatever
  // is stored stale, which is what drives `isLoading` below.
  const token = `${account ?? ''}:${reloadCount}`;

  useEffect(() => {
    // No wallet is not an error and not a result -- it is "we can't know".
    // Reporting it as an empty list would tell a user with votes they have none.
    if (!account) return;

    let cancelled = false;

    fetchVotedDomains(account)
      .then((domains) => {
        if (!cancelled) setResult({ token, data: domains, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ token, data: null, error: err });
      });

    return () => {
      cancelled = true;
    };
  }, [account, token]);

  const fresh = result && result.token === token ? result : null;

  return {
    data: fresh?.data ?? null,
    isLoading: Boolean(account) && !fresh,
    isError: Boolean(fresh?.error),
    error: fresh?.error ?? null,
    refetch,
  };
}
