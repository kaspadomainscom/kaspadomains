// src/app/head.tsx

import { getWebsiteJsonLd } from '@/lib/jsonld';
import { headers } from 'next/headers';


export default async function Head() {
  const headersList = await headers();
  const nonce = headersList.get('x-csp-nonce');

  const jsonLd = getWebsiteJsonLd();

  return (
    <>
      <link rel="icon" href="/favicon.ico" />
      {/* Optional fallbacks */}
      <link rel="icon" href="/favicon.ico" type="image/x-icon" />

      <script
        type="application/ld+json"
        nonce={nonce || undefined}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}

