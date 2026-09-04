'use client';

import { useState, useRef } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { createWalletClient, custom } from 'viem';
import { kasplexTestnet } from '@/lib/viemChains';
import { useToast } from '@/components/ToastProvider';
import type { DomainLink } from './useGetDomainLinks';

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

export function useUpdateDomainLinks() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);

  const { addToast } = useToast();

  const updateLinks = async (
    domain: string,
    account: `0x${string}`,
    links: DomainLink[]
  ): Promise<boolean> => {
    if (isSubmitting.current) return false;

    const cleanLinks = links
      .map((l) => ({ name: l.name.trim(), url: l.url.trim() }))
      .filter((l) => l.name && l.url);

    setError(null);
    isSubmitting.current = true;
    setIsLoading(true);

    try {
      const walletClient = createMetaMaskClient(account);

      addToast(`Saving resources for "${domain}"...`);

      const hash = await walletClient.writeContract({
        address: contracts.DomainLinksStorage.address,
        abi: contracts.DomainLinksStorage.abi,
        functionName: 'updateLinks',
        args: [domain, cleanLinks],
        account,
      });

      addToast('Waiting for confirmation...');
      await kasplexClient.waitForTransactionReceipt({ hash });

      addToast(`Resources saved for "${domain}".`, 'success');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save resources.';
      addToast(msg, 'error');
      setError(msg);
      return false;
    } finally {
      isSubmitting.current = false;
      setIsLoading(false);
    }
  };

  return {
    updateLinks,
    isLoading,
    error,
  };
}
