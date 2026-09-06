// src/lib/kasplex.ts
import { LEGACY_KASPLEX_TESTNET } from './kaspaDomainRuntime';

export const KASPLEX_TESTNET = {
  chainId: LEGACY_KASPLEX_TESTNET.chainHexId,
  chainName: LEGACY_KASPLEX_TESTNET.chainName,
  rpcUrls: [LEGACY_KASPLEX_TESTNET.rpcUrl],
  nativeCurrency: LEGACY_KASPLEX_TESTNET.nativeCurrency,
  blockExplorerUrls: [LEGACY_KASPLEX_TESTNET.explorerUrl],
};
