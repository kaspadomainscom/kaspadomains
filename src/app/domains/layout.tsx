// src/app/domains/layout.tsx
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getItemListJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Premium Kaspa Domains Marketplace | KaspaDomains",
  description:
    "Discover and purchase premium .kas domains categorized by niche. Each listing is curated for uniqueness and value within the Kaspa ecosystem.",
  alternates: {
    canonical: "https://kaspadomains.com/domains",
  },
};

export default async function DomainsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-csp-nonce") || undefined;
  const jsonLd = await getItemListJsonLd();

  return (
    <>
      <JsonLd json={jsonLd} nonce={nonce} />
      {children}
    </>
  );
}
