// src/components/JsonLd.tsx
'use client';

import { useCspNonce } from '@/context/useCspNonce';

type JsonLdData = Record<string, unknown>;

interface JsonLdProps {
  data: JsonLdData;
}

export function JsonLd({ data }: JsonLdProps) {
  const nonce = useCspNonce();

  return (
    <script
      nonce={nonce}
      key="structured-data"
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
