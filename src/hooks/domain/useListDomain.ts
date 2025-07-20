'use client';

import { useState, useRef } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { parseEther, createWalletClient, custom } from 'viem';
import { kasplexTestnet } from '@/lib/viemChains';
import { useMetamaskWallet } from '@/hooks/wallet/internal/useMetamaskWallet';
import { toast } from 'react-hot-toast';

type EthereumProvider = typeof window.ethereum;
type EthereumProviderWithMetaMask = EthereumProvider & {
  providers?: EthereumProvider[];
  isMetaMask?: boolean;
  isKasware?: boolean;
  isPhantom?: boolean;
};

function getMetaMaskProvider(): EthereumProviderWithMetaMask | null {
  if (typeof window === 'undefined') return null;

  const eth = window.ethereum as EthereumProviderWithMetaMask;
  if (!eth) return null;

  if (Array.isArray(eth.providers)) {
    return eth.providers.find(
      (p) => p.isMetaMask && !p.isKasware && !p.isPhantom
    ) ?? null;
  }

  return eth.isMetaMask && !eth.isKasware && !eth.isPhantom ? eth : null;
}

function createMetaMaskClient(account: `0x${string}`) {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error('MetaMask provider not found. Please install or enable MetaMask.');
  }

  return createWalletClient({
    account,
    chain: kasplexTestnet,
    transport: custom(provider),
  });
}

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

  const { account, connect } = useMetamaskWallet();

  const listDomain = async (domain: string) => {
    if (isSubmitting.current) {
      toast('Transaction already in progress, please wait.', { icon: '⏳' });
      return;
    }

    setError(null);
    setTxHash(null);

    if (!domain || !domain.endsWith('.kas') || domain.length < 5) {
      toast.error('Invalid domain. Must end with ".kas" and be at least 5 characters.');
      return;
    }

    isSubmitting.current = true;
    setIsLoading(true);

    try {
      if (!account || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
        await connect();
        throw new Error('MetaMask is not connected.');
      }

      const walletClient = createMetaMaskClient(account as `0x${string}`);

      toast.loading(`Preparing to list "${domain}"...`, { id: 'listDomain' });

      let lastError: unknown = null;

      for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
        try {
          toast.loading(`Listing "${domain}"... (attempt ${attempt})`, { id: 'listDomain' });

          const hash = await walletClient.writeContract({
            address: contracts.KaspaDomainsRegistry.address,
            abi: contracts.KaspaDomainsRegistry.abi,
            functionName: 'listDomain',
            args: [domain, account],
            account: account as `0x${string}`,
            value: parseEther('420'),
          });

          setTxHash(hash);
          console.log(`[MetaMask] Transaction hash (attempt ${attempt}):`, hash);

          toast.loading(`Waiting for confirmation...`, { id: 'listDomain' });
          await kasplexClient.waitForTransactionReceipt({ hash });

          toast.success(`"${domain}" listed successfully!`, { id: 'listDomain' });
          lastError = null;
          break;

        } catch (err) {
          lastError = err;
          console.error(`[MetaMask] Attempt ${attempt} failed:`, err);

          if (attempt < RETRY_LIMIT) {
            // toast(`⚠️ Attempt ${attempt} failed, retrying...`, { id: 'listDomain' });
            toast(`Attempt ${attempt} failed, retrying...`, {
              icon: '⚠️',
              id: 'listDomain',
            });
            await delay(RETRY_DELAY_MS);
          } else {
            throw err;
          }
        }
      }

      if (lastError) {
        throw lastError;
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      toast.error(msg, { id: 'listDomain' });
      setError(msg);
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
