// src/types/global.d.ts

export {};

declare global {
  interface Window {
    ethereum?: MetaMaskWithMultiProvider;
    kasware?: KaswareProvider;
  }
}

type MetaMaskProvider = import('@metamask/providers').MetaMaskInpageProvider;

interface MetaMaskWithMultiProvider extends MetaMaskProvider {
  isMetaMask?: boolean;
  isKasware?: boolean;
  isPhantom?: boolean;
  isCoinbaseWallet?: boolean;

  // If multiple providers injected
  providers?: (MetaMaskProvider & {
    isMetaMask?: boolean;
    isKasware?: boolean;
    isPhantom?: boolean;
    isCoinbaseWallet?: boolean;
  })[];
}

interface KaswareProvider {
  isKasware?: boolean;
  getAccounts(): Promise<string[]>;
  requestAccounts(): Promise<string[]>;
  disconnect(origin: string): Promise<void>;
  on(event: 'accountsChanged' | 'chainChanged', handler: (payload: unknown) => void): void;
  removeListener(event: 'accountsChanged' | 'chainChanged', handler: (payload: unknown) => void): void;
}
