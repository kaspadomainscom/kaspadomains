// src/app/head.tsx
import { getWebsiteJsonLd, getItemListJsonLd } from '@/lib/jsonld';
import { headers } from 'next/headers';

export default async function Head() {
  const headersList = await headers();
  const nonce = headersList.get('x-csp-nonce');

  const websiteJsonLd = getWebsiteJsonLd();
  const itemListJsonLd = getItemListJsonLd();

  // Combine both into one JSON-LD array
  const combinedJsonLd = [websiteJsonLd, itemListJsonLd];

  return (
    <>
      <link rel="icon" href="/favicon.ico" />
      {/* Optional fallbacks */}
      <link rel="icon" href="/favicon.ico" type="image/x-icon" />

      <script
        type="application/ld+json"
        nonce={nonce || undefined}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(combinedJsonLd) }}
      />
    </>
  );
}
