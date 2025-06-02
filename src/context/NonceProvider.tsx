// src/context/NonceProvider.tsx
'use client';

import { ReactNode } from 'react';
import { NonceContext } from './NonceContext'; // ✅ named import and correct path

export function NonceProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: string;
}) {
  return <NonceContext.Provider value={value}>{children}</NonceContext.Provider>;
}
