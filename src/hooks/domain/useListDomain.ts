'use client';

import { useState, useRef } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { createKaswareEvmClient, getKaswareEvmProvider } from '@/lib/kaswareEvm';
import { useToast } from '@/components/ToastProvider';
import { useWalletContext } from '@/context/WalletContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { signedFetch, readError, payFee, preflight } from '@/lib/signedFetch';
import { formatKas } from '@/lib/fees';

const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 3000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useListDomain() {
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);

  const { kasplex } = useWalletContext();
  const { addToast } = useToast();

  const listDomain = async (
    domain: string,
    categories: string[] = []
  ): Promise<string | null> => {
    if (isSubmitting.current) {
      addToast('Transaction already in progress. Please wait.');
      return null;
    }

    setError(null);
    setTxHash(null);

    if (!domain || !domain.endsWith('.kas') || domain.length < 5) {
      addToast('Invalid domain. Must end with ".kas" and be at least 5 characters.', 'error');
      return null;
    }

    isSubmitting.current = true;
    setIsLoading(true);

    try {
      // Database path first: it signs with the Kaspa L1 key (the one that owns
      // the domain on KNS), so it must not require a Kasplex EVM connection.
      // Demanding one here would lock out an owner who has only L1 connected.
      if (isSupabaseConfigured) {
        // Ask the server first. This is free, and it is what stops a user
        // paying 200 KAS into a request that was always going to be refused --
        // for a domain they don't own, one that's already listed, a category
        // that doesn't exist, or a deployment whose server key is missing.
        //
        // It costs one extra wallet signature prompt before the payment prompt.
        // That is a fair trade against losing the fee.
        addToast('Checking that this listing can go through...');
        const { intent, amountSompi } = await preflight({
          action: 'list-domain',
          domain,
          categories,
        });

        // Pay the amount the *server* just quoted, not our own constant. If the
        // two ever disagree, the server's number is the one its verification
        // will use.
        addToast(`Confirm the ${formatKas(amountSompi)} listing fee in Kasware...`);
        const paymentTxId = await payFee(amountSompi);

        addToast(`Payment sent. Listing "${domain}"...`);

        const response = await signedFetch({
          action: 'list-domain',
          domain,
          path: '/api/domains',
          body: { categories, paymentTxId, intent },
        });

        if (!response.ok) {
          throw new Error(await readError(response, 'Could not create the listing.'));
        }

        addToast(`"${domain}" listed successfully!`, 'success');
        return domain;
      }

      let listingAccount = kasplex.account;

      if (!listingAccount || !/^0x[a-fA-F0-9]{40}$/.test(listingAccount)) {
        await kasplex.connect();

        // React state updates from connect are visible on the next render, but
        // this invocation still needs the newly authorized account in order to
        // submit the user's first listing attempt.
        const provider = getKaswareEvmProvider();
        const accounts = provider
          ? await provider.request({ method: 'eth_accounts' })
          : [];
        const connectedAccount = Array.isArray(accounts) ? accounts[0] : null;

        if (typeof connectedAccount === 'string') listingAccount = connectedAccount;
      }

      if (!listingAccount || !/^0x[a-fA-F0-9]{40}$/.test(listingAccount)) {
        throw new Error('Kasware (Kasplex) is not connected.');
      }

      const walletClient = createKaswareEvmClient(listingAccount as `0x${string}`);

      addToast(`Preparing to list "${domain}"...`);

      // Read the real fee from the contract at submit time rather than hardcoding
      // it -- DOMAIN_FEE is currently a constant with no setter (verified against
      // the ABI), but reading it live means this code keeps working unmodified if
      // a future contract version makes it admin-adjustable. Site copy displays
      // "210 KAS" for marketing/SEO while this reads whatever the real deployed
      // contract actually charges (currently 420 KAS) -- see docs/TODO.md for the
      // tracked mismatch and what a real fix requires (a new contract deployment).
      let domainFee: bigint;
      try {
        domainFee = (await kasplexClient.readContract({
          address: contracts.KaspaDomainsRegistry.address,
          abi: contracts.KaspaDomainsRegistry.abi,
          functionName: 'DOMAIN_FEE',
        })) as bigint;
      } catch {
        // The registry contract is unreachable at its configured address (see
        // docs/BUGS.md) -- surface this as a clear, honest state rather than
        // the raw "returned no data" decode error, and stop before ever
        // constructing a value-carrying transaction.
        throw new Error('Listing is temporarily unavailable. Please try again later.');
      }

      let lastError: unknown = null;
      let broadcastHash: `0x${string}` | null = null;

      for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
        try {
          addToast(`Listing "${domain}"... (Attempt ${attempt})`);

          const hash = await walletClient.writeContract({
            address: contracts.KaspaDomainsRegistry.address,
            abi: contracts.KaspaDomainsRegistry.abi,
            functionName: 'listDomain',
            args: [domain, listingAccount as `0x${string}`],
            account: listingAccount as `0x${string}`,
            value: domainFee,
          });

          // Only retry errors that occur before the wallet returns a hash. Once
          // a hash exists, the transaction may already be pending on-chain and
          // submitting it again could charge the listing fee twice.
          broadcastHash = hash;
          setTxHash(hash);
          console.log(`[Kasplex] Transaction hash (attempt ${attempt}):`, hash);
          break;

        } catch (err) {
          lastError = err;
          console.error(`[Kasplex] Attempt ${attempt} failed:`, err);

          if (attempt < RETRY_LIMIT) {
            addToast(`Attempt ${attempt} failed. Retrying...`, 'info');
            await delay(RETRY_DELAY_MS);
          } else {
            throw err;
          }
        }
      }

      if (!broadcastHash) {
        throw lastError ?? new Error('Failed to submit the listing transaction.');
      }

      addToast('Waiting for confirmation...');
      const receipt = await kasplexClient.waitForTransactionReceipt({ hash: broadcastHash });

      if (receipt.status !== 'success') {
        throw new Error(`Listing "${domain}" was reverted on-chain.`);
      }

      addToast(`"${domain}" listed successfully!`, 'success');
      return broadcastHash;

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      addToast(msg, 'error');
      setError(msg);
      return null;
    } finally {
      isSubmitting.current = false;
      setIsLoading(false);
    }
  };

  return {
    listDomain,
    txHash,
    isLoading,
    error,
  };
}
