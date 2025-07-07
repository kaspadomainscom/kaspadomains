'use client';

import { useState } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { parseEther, createWalletClient, custom } from 'viem';
import { kasplexTestnet } from '@/lib/viemChains';
import { useMetamaskWallet } from '@/hooks/wallet/internal/useMetamaskWallet';

/**
 * Returns a viem WalletClient using MetaMask.
 * Throws if MetaMask is not installed or available.
 */
function createMetaMaskClient(account: `0x${string}`) {
  if (typeof window === 'undefined') {
    throw new Error('Window is not defined.');
  }

  const provider = (() => {
    if (Array.isArray(window.ethereum?.providers)) {
      return window.ethereum.providers.find((p) => p.isMetaMask);
    }
    return window.ethereum?.isMetaMask ? window.ethereum : null;
  })();

  if (!provider) {
    throw new Error('MetaMask not found. Please install MetaMask and refresh the page.');
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

  const { account, connect } = useMetamaskWallet(); // MetaMask only

  async function listDomain(domain: string) {
    setError(null);
    setTxHash(null);
    setIsLoading(true);

    try {
      if (!account || !account.startsWith('0x') || account.length !== 42) {
        console.warn('MetaMask not connected. Attempting to connect...');
        await connect();
        throw new Error('Please connect your MetaMask wallet to continue.');
      }

      const evmAccount = account as `0x${string}`;
      const walletClient = createMetaMaskClient(evmAccount);

      const txHash = await walletClient.writeContract({
        address: contracts.KaspaDomainsRegistry.address,
        abi: contracts.KaspaDomainsRegistry.abi,
        functionName: 'listDomain',
        args: [domain],
        account: evmAccount,
        value: parseEther('420'), // 420 KAS
      });

      setTxHash(txHash);
      console.log('Transaction sent:', txHash);

      await kasplexClient.waitForTransactionReceipt({ hash: txHash });
      console.log('Transaction confirmed:', txHash);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred.';
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
