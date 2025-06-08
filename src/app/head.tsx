// src/app/head.tsx

import { getWebsiteJsonLd, getItemListJsonLd } from '@/lib/jsonld';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic'; // Required for request-time headers like nonce

export default async function Head() {
  const headersList = await headers();
  const nonce = headersList.get('x-csp-nonce') || "";

  const websiteJsonLd = getWebsiteJsonLd();
  const itemListJsonLd = getItemListJsonLd();

  const combinedJsonLd = [websiteJsonLd, itemListJsonLd].filter(Boolean); // Filter null/undefined

  // if (process.env.NODE_ENV !== 'production') {
  //   if (!nonce) {
  //     console.warn("⚠️ [head.tsx] CSP nonce missing — expected 'x-csp-nonce' header.");
  //   } else {
  //     console.log("✅ [head.tsx] CSP nonce present:", nonce);
  //   }
  // }

  return (
    <>
      {/* Basic favicon */}
      <link rel="icon" href="/favicon.ico" type="image/x-icon" />

      {/* Combined structured data (JSON-LD for SEO) */}
      <script
        type="application/ld+json"
        nonce={nonce || undefined}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(combinedJsonLd),
        }}
      />
    </>
  );
}
