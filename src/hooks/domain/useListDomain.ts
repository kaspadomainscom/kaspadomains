'use client';

import { useState } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { parseEther, createWalletClient, custom } from 'viem';
import { kasplexTestnet } from '@/lib/viemChains'; // ✅ your chain config
import { useWallet } from '@/hooks/wallet/useWallet';

function getMetaMaskWalletClient(account: `0x${string}`) {
  const provider = typeof window !== 'undefined' && window?.ethereum?.providers
    ? window.ethereum.providers.find((p) => p.isMetaMask)
    : window?.ethereum;

  if (!provider || !provider.isMetaMask) {
    throw new Error('MetaMask provider not found.');
  }

  return createWalletClient({
    account,
    chain: kasplexTestnet, // use your testnet or mainnet config
    transport: custom(provider),
  });
}

export function useListDomain() {
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { account, connect } = useWallet(); // MetaMask (EVM wallet)

  async function listDomain(domain: string) {
    setError(null);
    setTxHash(null);
    setIsLoading(true);

    try {
      // Ensure MetaMask wallet is connected
      if (!account || !account.startsWith('0x') || account.length !== 42) {
        console.warn('MetaMask not connected. Attempting to connect...');
        await connect('metamask');
        throw new Error('Please connect your MetaMask wallet.');
      }

      const evmAccount = account as `0x${string}`;
      const walletClient = getMetaMaskWalletClient(evmAccount); // ✅ use MetaMask only

      const tx = await walletClient.writeContract({
        address: contracts.KaspaDomainsRegistry.address,
        abi: contracts.KaspaDomainsRegistry.abi,
        functionName: 'listDomain',
        args: [domain],
        account: evmAccount,
        value: parseEther('420'), // 420 KAS wrapped in EVM
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
