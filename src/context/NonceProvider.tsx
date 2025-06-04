// src/context/NonceProvider.tsx
// 'use client';

// import { ReactNode } from 'react';
// import { NonceContext } from './NonceContext'; // ✅ named import and correct path

// export function NonceProvider({
//   children,
//   value,
// }: {
//   children: ReactNode;
//   value: string;
// }) {
//   return <NonceContext.Provider value={value}>{children}</NonceContext.Provider>;
// }



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
