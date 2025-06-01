// src/components/JsonLd.tsx
'use client';

type JsonLdData = Record<string, unknown>;

interface JsonLdProps {
  data: JsonLdData;
  nonce: string;
}

export function JsonLd({ data, nonce }: JsonLdProps) {
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
