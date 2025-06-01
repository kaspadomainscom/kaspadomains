// src/context/NonceProvider.tsx
import { ReactNode } from 'react';
import { NonceContext } from './NonceContext';

export function NonceProvider({ children, value }: { children: ReactNode; value: string }) {
  return <NonceContext.Provider value={value}>{children}</NonceContext.Provider>;
}
