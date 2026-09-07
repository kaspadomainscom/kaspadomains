// src/app/domains/layout.tsx
import { headers } from "next/headers";
import { getItemListJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";

// Deliberately no metadata export.
//
// This layout wraps /domains, /domains/categories, /domains/my-domains,
// /domains/my-votes and /domains/top-voted. Everything it declared was inherited
// by all of them, so three pages served the title "Browse Premium .kas Domains"
// and, worse, `canonical: https://kaspadomains.com/domains` -- telling search
// engines they were duplicates of the browse page and should be dropped in its
// favour. The two that are client components cannot export metadata at all, so
// they had no way to override it.
//
// The browse page's own metadata now lives on the page itself.

export default async function DomainsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-csp-nonce") || undefined;
  const jsonLd = await getItemListJsonLd();

  return (
    <>
      {/* Nothing at all when the list could not be read: an empty ItemList
          would tell crawlers the directory is empty. */}
      {jsonLd && <JsonLd json={jsonLd} nonce={nonce} />}
      {children}
    </>
  );
}
