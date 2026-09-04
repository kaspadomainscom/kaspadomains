// src/lib/kaswareEvm.ts
//
// Kasware's EVM/Kasplex provider lives at its own namespace (window.kasware.ethereum),
// so unlike MetaMask it doesn't need array-scanning/flag-checking to disambiguate from
// other injected wallets sharing window.ethereum. See:
// https://docs.kasware.xyz/wallet/developer-documentation/evm.md
import { createWalletClient, custom, type EIP1193Provider } from 'viem';
import { kasplexTestnet } from './viemChains';

export function getKaswareEvmProvider(): EIP1193Provider | null {
  if (typeof window === 'undefined') return null;
  return window.kasware?.ethereum ?? null;
}

export function createKaswareEvmClient(account: `0x${string}`) {
  const provider = getKaswareEvmProvider();
  if (!provider) {
    throw new Error('Kasware EVM provider not found. Please install or unlock Kasware.');
  }

  return createWalletClient({
    account,
    chain: kasplexTestnet,
    transport: custom(provider),
  });
}
