'use client';

import { useState } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { parseEther, createWalletClient, custom } from 'viem';
import { kasplexTestnet } from '@/lib/viemChains';
import { useMetamaskWallet } from '@/hooks/wallet/internal/useMetamaskWallet';
import toast from 'react-hot-toast';

type EthereumProvider = typeof window.ethereum;
type EthereumProviderWithMetaMask = EthereumProvider & {
  providers?: EthereumProvider[];
  isMetaMask?: boolean;
  isKasware?: boolean;
  isPhantom?: boolean;
};

/**
 * Detect the "real" MetaMask provider explicitly, avoiding other injected wallets like Kasware or Phantom.
 */
function getMetaMaskProvider(): EthereumProviderWithMetaMask | null {
  if (typeof window === 'undefined') return null;

  const eth = window.ethereum as EthereumProviderWithMetaMask;
  if (!eth) return null;

  if (Array.isArray(eth.providers)) {
    const metamask = eth.providers.find(
      (p) => p.isMetaMask && !p.isKasware && !p.isPhantom
    );
    return metamask ?? null;
  }

  return eth.isMetaMask && !eth.isKasware && !eth.isPhantom ? eth : null;
}

/**
 * Create a WalletClient instance from the detected MetaMask provider.
 */
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

/**
 * Hook to handle listing a domain on-chain via the KaspaDomainsRegistry contract.
 */
export function useListDomain() {
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { account, connect } = useMetamaskWallet();

  const listDomain = async (domain: string) => {
    setError(null);
    setTxHash(null);

    // Validate domain input
    if (!domain || !domain.endsWith('.kas')) {
      toast.error('Invalid domain name. Must end with .kas');
      return;
    }

    try {
      setIsLoading(true);

      if (!account || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
        await connect();
        throw new Error('Please connect MetaMask to list the domain.');
      }

      const walletClient = createMetaMaskClient(account as `0x${string}`);

      toast.loading('Listing domain...', { id: 'list-domain' });

      const hash = await walletClient.writeContract({
        address: contracts.KaspaDomainsRegistry.address,
        abi: contracts.KaspaDomainsRegistry.abi,
        functionName: 'listDomain',
        args: [domain, account],
        account: account as `0x${string}`,
        value: parseEther('420'),
      });

      setTxHash(hash);
      console.log('[MetaMask] Transaction hash:', hash);

      await kasplexClient.waitForTransactionReceipt({ hash });

      toast.success(`Domain listed successfully!`, { id: 'list-domain' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[MetaMask] List domain failed:', msg);
      toast.error(msg, { id: 'list-domain' });
      setError(msg);
    } finally {
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
