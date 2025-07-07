// src/lib/viemClient.ts
import { createPublicClient, http } from 'viem';
import { kasplexTestnet } from './viemChains';

export const kasplexClient = createPublicClient({
  chain: kasplexTestnet,
  transport: http(),
});
