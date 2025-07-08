// src/types/global.d.ts

export {};

declare global {
  interface Window {
    ethereum?: import('@metamask/providers').MetaMaskInpageProvider & {
      isMetaMask?: boolean;
      isKasware?: boolean;
      providers?: (import('@metamask/providers').MetaMaskInpageProvider & {
        isMetaMask?: boolean;
        isKasware?: boolean;
      })[];
    };

    kasware?: {
      getAccounts(): Promise<string[]>;
      requestAccounts(): Promise<string[]>;
      disconnect(origin: string): Promise<void>;
      on(event: 'accountsChanged' | 'chainChanged', handler: (payload: unknown) => void): void;
      removeListener(event: 'accountsChanged' | 'chainChanged', handler: (payload: unknown) => void): void;
      isKasware?: boolean;
    };
  }
}
