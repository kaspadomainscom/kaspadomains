// src/types/global.d.ts
import type { MetaMaskInpageProvider } from '@metamask/providers';

declare global {
  interface Window {
    /** EIP-1193 style provider (MetaMask, Kasware, etc.) */
    ethereum?: MetaMaskInpageProvider & {
      isMetaMask?: boolean;
      isKasware?: boolean;
      /** if multiple wallets are injected, they'll live here */
      providers?: (MetaMaskInpageProvider & {
        isMetaMask?: boolean;
        isKasware?: boolean;
      })[];
    };
    /** Kasware sometimes injects its own global object */
    kasware?: MetaMaskInpageProvider & {
      isKasware?: boolean;
    };
  }
}

export {};
