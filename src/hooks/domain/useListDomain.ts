'use client';

import { useState } from 'react';
import { contracts } from '@/lib/contracts';
import { getWalletClient } from '@/lib/walletClient';
import { kasplexClient } from '@/lib/viemClient'; // ✅ public client
import { parseEther } from 'viem';
import { useWallet } from '@/hooks/wallet/useWallet';

export function useListDomain() {
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { account, connect } = useWallet();

  async function listDomain(domain: string) {
    setError(null);
    setIsLoading(true);

    try {
      if (!account) {
        await connect('kasware');
        throw new Error('Wallet not connected');
      }

      const walletClient = getWalletClient(account as `0x${string}`);
      const value = parseEther('999');

      const txHash = await walletClient.writeContract({
        address: contracts.KaspaDomainsRegistry.address,
        abi: contracts.KaspaDomainsRegistry.abi,
        functionName: 'listDomain',
        args: [domain],
        account: account as `0x${string}`,
        value,
      });

      setTxHash(txHash);

      // ✅ use public client to wait for confirmation
      await kasplexClient.waitForTransactionReceipt({ hash: txHash });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('List domain failed:', message);
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
