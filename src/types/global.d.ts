// src/types/global.d.ts

export {};

declare global {
  interface Window {
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
}
