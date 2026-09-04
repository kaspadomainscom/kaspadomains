'use client';

import { useState, useRef } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { parseEther } from 'viem';
import { useKaswareEvmWallet } from '@/hooks/wallet/internal/useKaswareEvmWallet';
import { createKaswareEvmClient } from '@/lib/kaswareEvm';
import { useToast } from '@/components/ToastProvider';

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

  const { account, connect } = useKaswareEvmWallet();
  const { addToast } = useToast();

  const listDomain = async (domain: string): Promise<`0x${string}` | null> => {
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
      if (!account || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
        await connect();
        throw new Error('Kasware (Kasplex) is not connected.');
      }

      const walletClient = createKaswareEvmClient(account as `0x${string}`);

      addToast(`Preparing to list "${domain}"...`);

      let lastError: unknown = null;
      let confirmedHash: `0x${string}` | null = null;

      for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
        try {
          addToast(`Listing "${domain}"... (Attempt ${attempt})`);

          // NOTE: KaspaDomainsRegistry.DOMAIN_FEE is a contract constant with no
          // setter (verified against the ABI) -- it currently equals 420 KAS on the
          // deployed testnet contract. Site copy was changed to display "210 KAS"
          // for marketing/SEO, but this value MUST stay in sync with the real
          // on-chain DOMAIN_FEE or every listing transaction will revert. See
          // docs/TODO.md for the tracked mismatch this creates.
          const hash = await walletClient.writeContract({
            address: contracts.KaspaDomainsRegistry.address,
            abi: contracts.KaspaDomainsRegistry.abi,
            functionName: 'listDomain',
            args: [domain, account],
            account: account as `0x${string}`,
            value: parseEther('420'),
          });

          setTxHash(hash);
          console.log(`[Kasplex] Transaction hash (attempt ${attempt}):`, hash);

          addToast(`Waiting for confirmation...`);
          await kasplexClient.waitForTransactionReceipt({ hash });

          addToast(`"${domain}" listed successfully!`, 'success');
          lastError = null;
          confirmedHash = hash;
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

      if (lastError) {
        throw lastError;
      }

      return confirmedHash;

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
