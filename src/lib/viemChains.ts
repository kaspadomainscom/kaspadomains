// src/lib/viemChains.ts
import { defineChain } from 'viem';
import { LEGACY_KASPLEX_TESTNET } from './kaspaDomainRuntime';

export const kasplexTestnet = defineChain({
  id: LEGACY_KASPLEX_TESTNET.chainId,
  name: LEGACY_KASPLEX_TESTNET.chainName,
  nativeCurrency: LEGACY_KASPLEX_TESTNET.nativeCurrency,
  rpcUrls: {
    default: {
      http: [LEGACY_KASPLEX_TESTNET.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'Kasplex Explorer',
      url: LEGACY_KASPLEX_TESTNET.explorerUrl,
    },
  },
});


