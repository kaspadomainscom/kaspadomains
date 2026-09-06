// src/app/domains/layout.tsx
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getItemListJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Browse Premium .kas Domains | KaspaDomains",
  description:
    "Browse premium .kas domains by category. Every domain is registered on Kaspa L1 through KNS and owned directly by its holder — KaspaDomains is a registry and discovery layer, not a marketplace.",
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
