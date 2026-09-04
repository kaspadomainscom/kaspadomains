// src/types/global.d.ts

export {};

declare global {
  interface Window {
    ethereum?: import('viem').EIP1193Provider & {
      isKasware?: boolean;
      providers?: import('viem').EIP1193Provider[];
    };
    kasware?: KaswareProvider;
  }
}

interface KaswareProvider {
  isKasware?: boolean;
  getAccounts(): Promise<string[]>;
  requestAccounts(): Promise<string[]>;
  disconnect(origin: string): Promise<void>;
  on(event: 'accountsChanged' | 'chainChanged', handler: (payload: unknown) => void): void;
  removeListener(event: 'accountsChanged' | 'chainChanged', handler: (payload: unknown) => void): void;
  // Kasplex (Kaspa's EVM L2) signer, EIP-1193 compliant.
  // https://docs.kasware.xyz/wallet/developer-documentation/evm.md
  ethereum?: import('viem').EIP1193Provider & { isKasWare?: boolean };
}
