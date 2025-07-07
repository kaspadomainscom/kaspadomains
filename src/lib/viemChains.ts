// src/lib/viemChains.ts
import { defineChain } from 'viem';

export const kasplexTestnet = defineChain({
  id: 167012, // 0x28d84
  name: 'Kasplex Testnet',
  nativeCurrency: {
    name: 'Kaspa',
    symbol: 'KAS',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.kasplextest.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Kasplex Explorer',
      url: 'https://frontend.kasplextest.xyz',
    },
  },
});


