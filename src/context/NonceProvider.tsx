// src/context/NonceProvider.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';

export const NonceContext = createContext<string | undefined>(undefined);

export function NonceProvider({ nonce, children }: { nonce: string; children: ReactNode }) {
  return <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>;
}

export function useCspNonce(): string {
  const nonce = useContext(NonceContext);
  if (!nonce) {
    throw new Error('useCspNonce must be used within <NonceProvider>');
  }
  return nonce;
}
