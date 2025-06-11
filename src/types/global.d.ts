// src/types/global.d.ts
import type { MetaMaskInpageProvider } from '@metamask/providers';

// Add ethereum to window type for MetaMask compatibility
declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider & {
      isKasware?: boolean;
      isMetaMask?: boolean;
    };
  }
}
