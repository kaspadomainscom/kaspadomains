// src/lib/jsonld.ts

export type DomainJsonLdInput = {
  name: string;
  price: string | number;
  listed: boolean;
  seller?: string;
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
      "Discover and purchase premium KNS domains for Kaspa wallets. Perfect for identity, payments, or branding.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://kaspadomains.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };
}

export function getDomainJsonLd({
  name,
  price,
  listed,
  seller,
}: DomainJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${name}.kas`,
    description:
      "Premium KNS domain pointing to a Kaspa wallet. Perfect for identity, payments, or branding.",
    sku: `KNS-${name}`,
    productID: name,
    url: `https://kaspadomains.com/domain/${name}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://kaspadomains.com/domain/${name}`,
    },
    category: "KNS Domain",
    brand: {
      "@type": "Brand",
      name: "Kaspa Domains",
      url: "https://kaspadomains.com",
    },
    offers: {
      "@type": "Offer",
      price: typeof price === "string" ? parseFloat(price) || 0 : price,
      priceCurrency: "KAS",
      availability: listed
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      ...(seller
        ? {
            seller: {
              "@type": "Person",
              name: seller,
            },
          }
        : {}),
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "KNS Type",
        value: "Kaspa Domain Name",
      },
    ],
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

