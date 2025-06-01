// src/components/NonceWrapper.tsx
'use client';

import { NonceProvider } from '@/context/NonceProvider';

export function NonceWrapper({
  nonce,
  children,
}: {
  nonce: string;
  children: React.ReactNode;
}) {
  return <NonceProvider value={nonce}>{children}</NonceProvider>;
}
