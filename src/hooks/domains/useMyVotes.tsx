"use client";

import { useCallback, useEffect, useState } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchVotedDomains } from '@/data/supabaseSource';
import type { Domain } from '@/data/types';
import { Address } from 'viem';

/**
 * The domains the connected wallet has voted for.
 *
 * Returns whole `Domain` records now, not bare hashes. The old shape forced the
 * page to fan out one `useDomainByHash` call per vote, and each of those hit a
 * contract that currently has no deployed code -- so every row silently
 * rendered nothing and the page looked empty rather than broken.
 *
 * ## Which address
 *
 * Votes are recorded against the **Kaspa L1 address** (`kasware.account`),
 * because that is the key the vote route verifies and stores. The contract path
 * keys by the **Kasplex EVM address** (`kasplex.account`). Those are different
 * addresses belonging to the same person, so each source must be queried with
 * its own -- querying Supabase with the EVM address returns an empty list and
 * looks like "you haven't voted for anything".
 *
 * Loading and error state are derived from whether the stored result belongs to
 * the current request, not tracked separately: that keeps every state
 * transition out of the effect body, and makes it impossible to show one
 * wallet's votes while another is connecting.
 */
export type MyVotesResult = {
  /** null means "not known" -- no wallet, still loading, or the load failed. */
  data: Domain[] | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  /** Which store answered, so the page can name the right wallet to connect. */
  source: 'supabase' | 'chain';
  refetch: () => void;
};

type Result = { token: string; data: Domain[] | null; error: Error | null };

export function useMyVotes(): MyVotesResult {
  const { kasware, kasplex } = useWalletContext();
  const source: 'supabase' | 'chain' = isSupabaseConfigured ? 'supabase' : 'chain';
  const account = source === 'supabase' ? kasware.account : kasplex.account;

  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const refetch = useCallback(() => setReloadCount((n) => n + 1), []);

  // Identifies one specific request. A change to any part of it makes whatever
  // is stored stale, which is what drives `isLoading` below.
  const token = `${source}:${account ?? ''}:${reloadCount}`;

  useEffect(() => {
    // No wallet is not an error and not a result -- it is "we can't know".
    // Reporting it as an empty list would tell a user with votes they have none.
    if (!account) return;

    let cancelled = false;

    async function load(voter: string): Promise<Domain[]> {
      if (source === 'supabase') {
        return fetchVotedDomains(voter);
      }

      const hashes = (await kasplexClient.readContract({
        address: contracts.DomainVotesManager.address,
        abi: contracts.DomainVotesManager.abi,
        functionName: 'getVotedDomainIds',
        args: [voter as Address],
      })) as readonly bigint[];

      // The chain path can only produce hashes. An empty `name` is the signal
      // to the page that this row still needs resolving.
      return hashes.map((domainHash) => ({
        id: 0,
        domainHash,
        name: '',
        owner: '',
        createdAt: 0,
        isActive: true,
        feePaid: '0',
      }));
    }

    load(account)
      .then((domains) => {
        if (!cancelled) setResult({ token, data: domains, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ token, data: null, error: err });
      });

    return () => {
      cancelled = true;
    };
  }, [account, source, token]);

  const fresh = result && result.token === token ? result : null;

  return {
    data: fresh?.data ?? null,
    isLoading: Boolean(account) && !fresh,
    isError: Boolean(fresh?.error),
    error: fresh?.error ?? null,
    source,
    refetch,
  };
}
