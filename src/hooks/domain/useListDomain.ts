'use client';

import { useState } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { parseEther, createWalletClient, custom } from 'viem';
import { kasplexTestnet } from '@/lib/viemChains';
import { useWallet } from '@/hooks/wallet/useWallet';

/**
 * Safely gets the MetaMask provider even if multiple wallets are injected (e.g., KasWare).
 */
function getMetaMaskWalletClient(account: `0x${string}`) {
  if (typeof window === 'undefined') return null;

  // Multi-provider case (e.g., MetaMask + KasWare)
  if (Array.isArray(window.ethereum?.providers)) {
    const metaMaskProvider = window.ethereum.providers.find((p) => p.isMetaMask);
    if (!metaMaskProvider) {
      throw new Error('MetaMask provider not found. Please install MetaMask.');
    }
    return createWalletClient({
      account,
      chain: kasplexTestnet,
      transport: custom(metaMaskProvider),
    });
  }

  // Single provider fallback (ensure it's MetaMask)
  if (window.ethereum?.isMetaMask) {
    return createWalletClient({
      account,
      chain: kasplexTestnet,
      transport: custom(window.ethereum),
    });
  }

  throw new Error('MetaMask provider not found. Please install MetaMask.');
}

export function useListDomain() {
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { account, connect } = useWallet(); // Should be MetaMask only

  async function listDomain(domain: string) {
    setError(null);
    setTxHash(null);
    setIsLoading(true);

    try {
      // Check MetaMask account validity
      if (!account || !account.startsWith('0x') || account.length !== 42) {
        console.warn('MetaMask not connected. Attempting to connect...');
        await connect('metamask'); // connect() connects MetaMask only in your updated useWallet
        throw new Error('Please connect your MetaMask wallet.');
      }

      const evmAccount = account as `0x${string}`;
      const walletClient = getMetaMaskWalletClient(evmAccount);

      if (!walletClient) {
        throw new Error('MetaMask wallet client could not be created.');
      }

      const tx = await walletClient.writeContract({
        address: contracts.KaspaDomainsRegistry.address,
        abi: contracts.KaspaDomainsRegistry.abi,
        functionName: 'listDomain',
        args: [domain],
        account: evmAccount,
        value: parseEther('420'), // 420 KAS
      });

      setTxHash(tx);
      console.log('Transaction sent:', tx);

      await kasplexClient.waitForTransactionReceipt({ hash: tx });
      console.log('Transaction confirmed:', tx);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('List domain error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    listDomain,
    txHash,
    isLoading,
    error,
  };
}
