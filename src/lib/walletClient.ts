
// src/lib/walletClient.ts
import { createWalletClient, custom } from 'viem';
import { kasplexTestnet } from './viemChains';
import type { Address } from 'viem';

export function getWalletClient(account?: Address) {
  if (!window.ethereum) {
    throw new Error('No Ethereum provider found');
  }

  return createWalletClient({
    account,
    chain: kasplexTestnet,
    transport: custom(window.ethereum),
  });
}
