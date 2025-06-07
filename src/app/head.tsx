// src/app/head.tsx
import { getWebsiteJsonLd, getItemListJsonLd } from '@/lib/jsonld';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic'; // Required for access to request headers

export default async function Head() {

  const nonce = (await headers()).get('x-csp-nonce');

  const websiteJsonLd = getWebsiteJsonLd();
  const itemListJsonLd = getItemListJsonLd();

  const combinedJsonLd = [websiteJsonLd, itemListJsonLd];

  return (
    <>
      <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      <script
        type="application/ld+json"
        nonce={nonce || undefined}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(combinedJsonLd) }}
      />
    </>
  );
}
