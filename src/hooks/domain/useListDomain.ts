'use client';

import { useState } from 'react';
import { contracts } from '@/lib/contracts';
import { getWalletClient } from '@/lib/walletClient';
import { kasplexClient } from '@/lib/viemClient';
import { parseEther } from 'viem';
import { useWallet } from '@/hooks/wallet/useWallet';

export function useListDomain() {
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { account, connect } = useWallet(); // EVM wallet (MetaMask)

  async function listDomain(domain: string) {
    setError(null);
    setTxHash(null);
    setIsLoading(true);

    try {
      // Ensure connected to EVM wallet
      if (!account || !account.startsWith('0x') || account.length !== 42) {
        console.warn('EVM wallet not connected. Attempting to connect...');
        await connect('metamask');
        throw new Error('Please connect your MetaMask wallet.');
      }

      const evmAccount = account as `0x${string}`;
      const walletClient = getWalletClient(evmAccount);

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
