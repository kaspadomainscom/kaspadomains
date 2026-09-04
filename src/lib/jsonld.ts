// src/lib/jsonld.ts

export type DomainJsonLdInput = {
  name: string;
  owner: string;
  category?: string;
};

type ListItem = {
  "@type": "ListItem";
  position: number;
  url: string;
  name: string;
};

type ItemListJsonLd = {
  "@context": string;
  "@type": "ItemList";
  "@id": string;
  name: string;
  itemListElement: ListItem[];
};

export function getWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kaspa Domains",
    url: "https://kaspadomains.com",
    description:
      "Discover premium KNS domains for Kaspa wallets — a registry and discovery layer, not a marketplace. Perfect for identity, payments, or branding.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://kaspadomains.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };
}

export function getDomainJsonLd({ name, owner, category }: DomainJsonLdInput) {
  // ProfilePage, not Product/Offer: KaspaDomains is a registry and discovery layer,
  // not a marketplace -- this domain isn't for sale here, so it shouldn't carry
  // commerce-shaped structured data (price/availability/seller) that implies it is.
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${name}.kas`,
    description: `${name}.kas — a premium KNS domain on Kaspa, showcased on KaspaDomains. Owned and controlled by its holder.`,
    url: `https://kaspadomains.com/domain/${name}`,
    mainEntity: {
      "@type": "Thing",
      name: `${name}.kas`,
      identifier: `KNS-${name}`,
      additionalProperty: [
        { "@type": "PropertyValue", name: "KNS Type", value: "Kaspa Domain Name" },
        { "@type": "PropertyValue", name: "Owner", value: owner },
        ...(category
          ? [{ "@type": "PropertyValue" as const, name: "Category", value: category }]
          : []),
      ],
    },
  };
}

import { loadCategoriesManifest } from "@/data/categoriesManifest"; // import the async loader

export async function getItemListJsonLd(limit = 6): Promise<ItemListJsonLd> {
  const categoriesData = await loadCategoriesManifest();

  const recentDomains = Object.values(categoriesData)
    .flatMap((cat) => cat.domains)
    .filter((d) => d.isActive)
    .slice(0, limit);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": "https://kaspadomains.com/#recent-domains",
    name: "Recent Premium Kaspa Domains",
    itemListElement: recentDomains.map((domain, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://kaspadomains.com/domain/${domain.name}`,
      name: `${domain.name}.kas`,
    })),
  };
}

