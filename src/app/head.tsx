// src/app/head.tsx
import { getWebsiteJsonLd, getItemListJsonLd } from '@/lib/jsonld';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic'; // Required for access to request headers

export default async function Head() {


  const headersList = await headers();

  const nonce = headersList.get('x-csp-nonce') || "";

  const websiteJsonLd = getWebsiteJsonLd();
  const itemListJsonLd = getItemListJsonLd();

  if (process.env.NODE_ENV !== "production" && !nonce) {
    console.warn("⚠️ app/head.tsx | Missing CSP nonce in x-csp-nonce headers. Check middleware or navigation method.");
  } else {
    console.log("✅ app/head.tsx |CSP nonce in headers:", nonce);
  }

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
