// src/components/JsonLd.tsx
import React from "react";

export function JsonLd({ json, nonce }: { json: object; nonce?: string }) {
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
