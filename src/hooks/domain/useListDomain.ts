'use client';

import { useState } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { parseEther, createWalletClient, custom } from 'viem';
import { kasplexTestnet } from '@/lib/viemChains';
import { useMetamaskWallet } from '@/hooks/wallet/internal/useMetamaskWallet';

/**
 * Create a MetaMask-specific WalletClient
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

  const { account, connect } = useMetamaskWallet();

  const listDomain = async (domain: string) => {
    setError(null);
    setTxHash(null);
    setIsLoading(true);

    try {
      const evmAccount = account;

      // If not connected or invalid address, attempt to connect
      if (!evmAccount || !evmAccount.startsWith('0x') || evmAccount.length !== 42) {
        console.warn('MetaMask not connected. Attempting connection...');
        await connect();
        throw new Error('Please connect your MetaMask wallet to continue.');
      }

      const walletClient = createMetaMaskClient(evmAccount as `0x${string}`);

      const hash = await walletClient.writeContract({
        address: contracts.KaspaDomainsRegistry.address,
        abi: contracts.KaspaDomainsRegistry.abi,
        functionName: 'listDomain',
        args: [domain],
        account: evmAccount as `0x${string}`,
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
