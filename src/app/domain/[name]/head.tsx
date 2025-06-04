import { headers } from "next/headers";
import { getDomainJsonLd } from "@/lib/jsonld";
import { findDomainByName } from "@/data/domainLookup";

export default async function Head({ params }: { params: { name: string } }) {
  const headersList = await headers();
  const nonce = headersList.get("x-csp-nonce");

  const domain = findDomainByName(params.name);

  if (!domain) return null;

  const jsonLd = getDomainJsonLd({
    name: domain.name,
    price: domain.price,
    listed: domain.listed,
    seller: domain.sellerTelegram?.replace("@", "") || "Unknown",
  });

  return (
    <script
      type="application/ld+json"
      nonce={nonce || undefined}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
