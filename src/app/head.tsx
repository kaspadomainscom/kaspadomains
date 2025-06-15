// src/app/head.tsx

import { getWebsiteJsonLd, getItemListJsonLd } from '@/lib/jsonld'
import { headers } from 'next/headers'
import { metadata as pageMeta } from './page'

export const dynamic = 'force-dynamic' // required for request‑time headers like nonce

export default async function Head() {
  const headersList = await headers()
  const nonce = headersList.get('x-csp-nonce') || ''

  // Your structured data
  const websiteJsonLd = getWebsiteJsonLd()
  const itemListJsonLd = getItemListJsonLd()
  const combinedJsonLd = [websiteJsonLd, itemListJsonLd].filter(Boolean)

  return (
    <>
      {/* Primary meta tags */}
      <title>{pageMeta.title}</title>
      <meta name="description" content={pageMeta.description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageMeta.title} />
      <meta property="og:description" content={pageMeta.description} />
      <meta property="og:url" content="https://kaspadomains.com" />
      <meta property="og:site_name" content="KaspaDomains" />
      <meta property="og:image" content="https://kaspadomains.com/og-image.png" />
      <meta property="og:image:alt" content="KaspaDomains — .kas domains" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageMeta.title} />
      <meta name="twitter:description" content={pageMeta.description} />
      <meta name="twitter:image" content="https://kaspadomains.com/og-image.png" />
      <meta name="twitter:site" content="@KaspaDomains" />

      {/* Combined structured data (JSON‑LD for SEO) */}
      <script
        type="application/ld+json"
        nonce={nonce || undefined}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(combinedJsonLd),
        }}
      />
    </>
  )
}
