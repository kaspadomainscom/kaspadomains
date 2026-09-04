'use client';

import { useState, useRef } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { createWalletClient, custom } from 'viem';
import { kasplexTestnet } from '@/lib/viemChains';
import { stringToBytes32 } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

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

export function useSetDomainCategories() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);

  const { addToast } = useToast();

  const setCategories = async (
    domain: string,
    account: `0x${string}`,
    categories: string[]
  ) => {
    if (isSubmitting.current) return;
    if (categories.length === 0) {
      addToast('Select at least one category before listing.', 'error');
      return;
    }

    setError(null);
    isSubmitting.current = true;
    setIsLoading(true);

    try {
      const domainHash = (await kasplexClient.readContract({
        address: contracts.KaspaDomainsRegistry.address,
        abi: contracts.KaspaDomainsRegistry.abi,
        functionName: 'domainHashPublic',
        args: [domain],
      })) as bigint;

      const walletClient = createMetaMaskClient(account);
      const categoryBytes32 = categories.map(stringToBytes32);

      addToast(`Assigning categories to "${domain}"...`);

      const hash = await walletClient.writeContract({
        address: contracts.DomainCategoriesStorage.address,
        abi: contracts.DomainCategoriesStorage.abi,
        functionName: 'updateCategories',
        args: [domainHash, categoryBytes32],
        account,
      });

      await kasplexClient.waitForTransactionReceipt({ hash });
      addToast(`Categories assigned to "${domain}".`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to assign categories.';
      addToast(
        `"${domain}" was listed, but assigning categories failed: ${msg}`,
        'error'
      );
      setError(msg);
    } finally {
      isSubmitting.current = false;
      setIsLoading(false);
    }
  };

  return {
    setCategories,
    isLoading,
    error,
  };
}
