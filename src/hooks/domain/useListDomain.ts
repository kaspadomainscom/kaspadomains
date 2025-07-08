'use client';

import { useState } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { parseEther, createWalletClient, custom } from 'viem';
import { kasplexTestnet } from '@/lib/viemChains';
import { useMetamaskWallet } from '@/hooks/wallet/internal/useMetamaskWallet';

type EthereumProviderWithMetaMask = typeof window.ethereum & {
  providers?: (typeof window.ethereum)[];
  isMetaMask?: boolean;
};

/**
 * Robust MetaMask provider detection:
 * - Handle multiple providers (MetaMask + Kasware etc.)
 * - Return explicit MetaMask provider or null if not found
 */
function getMetaMaskProvider(): EthereumProviderWithMetaMask | null {
  if (typeof window === 'undefined') return null;

  const eth = window.ethereum as EthereumProviderWithMetaMask | undefined;
  if (!eth) return null;

  // Multiple injected providers
  if (Array.isArray(eth.providers)) {
    const metamaskProvider = eth.providers.find((p) => p.isMetaMask);
    if (metamaskProvider) return metamaskProvider;
  }

  // Single provider fallback
  if (eth.isMetaMask) return eth;

  return null;
}

/**
 * Create viem WalletClient from MetaMask provider and account
 */
function createMetaMaskClient(account: `0x${string}`) {
  if (typeof window === 'undefined') {
    throw new Error('Window is not defined.');
  }

  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error('MetaMask provider not found. Please install MetaMask and refresh the page.');
  }

  return createWalletClient({
    account,
    chain: kasplexTestnet,
    transport: custom(provider),
  });
}

export function useListDomain() {
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { account, connect } = useMetamaskWallet();

  const listDomain = async (domain: string) => {
    setError(null);
    setTxHash(null);
    setIsLoading(true);

    try {
      if (!account || !account.startsWith('0x') || account.length !== 42) {
        console.warn('MetaMask not connected or invalid account, attempting to connect...');
        await connect();
        throw new Error('Please connect your MetaMask wallet to continue.');
      }

      // Create WalletClient with the detected MetaMask provider explicitly
      const walletClient = createMetaMaskClient(account as `0x${string}`);

      const hash = await walletClient.writeContract({
        address: contracts.KaspaDomainsRegistry.address,
        abi: contracts.KaspaDomainsRegistry.abi,
        functionName: 'listDomain',
        args: [domain],
        account: account as `0x${string}`,
        value: parseEther('420'), // 420 KAS
      });

      setTxHash(hash);
      console.log('Transaction hash:', hash);

      await kasplexClient.waitForTransactionReceipt({ hash });
      console.log('Transaction confirmed:', hash);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred.';
      console.error('List domain failed:', message);
      setError(message);
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
