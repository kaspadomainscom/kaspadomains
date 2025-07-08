'use client';

import { useState } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { parseEther, createWalletClient, custom } from 'viem';
import { kasplexTestnet } from '@/lib/viemChains';
import { useMetamaskWallet } from '@/hooks/wallet/internal/useMetamaskWallet';

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
    console.log('[MetaMask] Multiple providers detected:', eth.providers);

    // Prefer provider that is MetaMask and NOT Kasware or Phantom
    const metamask = eth.providers.find(
      (p) => p.isMetaMask && !p.isKasware && !p.isPhantom
    );

    if (metamask) {
      console.log('[MetaMask] MetaMask provider found:', metamask);
      return metamask;
    }

    console.warn('[MetaMask] No valid MetaMask provider found in providers array.');
  } else if (eth.isMetaMask && !eth.isKasware && !eth.isPhantom) {
    console.log('[MetaMask] Single MetaMask provider detected');
    return eth;
  }

  console.warn('[MetaMask] No MetaMask provider found.');
  return null;
}

/**
 * Create a WalletClient instance from the detected MetaMask provider.
 * Throws an error if MetaMask is not found.
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
    setIsLoading(true);

    try {
      if (!account || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
        console.warn('[MetaMask] Wallet not connected, attempting to connect...');
        await connect();
        throw new Error('Please connect MetaMask to list the domain.');
      }

      console.log('[MetaMask] Creating wallet client...');
      const walletClient = createMetaMaskClient(account as `0x${string}`);

      console.log('[MetaMask] Sending transaction to list domain:', domain);
      const hash = await walletClient.writeContract({
        address: contracts.KaspaDomainsRegistry.address,
        abi: contracts.KaspaDomainsRegistry.abi,
        functionName: 'listDomain',
        args: [domain],
        account: account as `0x${string}`,
        value: parseEther('420'), // 420 KAS
      });

      setTxHash(hash);
      console.log('[MetaMask] Transaction hash:', hash);

      await kasplexClient.waitForTransactionReceipt({ hash });
      console.log('[MetaMask] Transaction confirmed:', hash);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[MetaMask] List domain failed:', msg);
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
