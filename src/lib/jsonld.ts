// src/lib/jsonld.ts
import { normalizeDomainName } from "@/lib/domainName";
import { domainProfileUrl } from "./domainName";

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
  // Normalised, not concatenated. Callers pass the stored name, which already
  // ends in `.kas`, so appending produced "foo.kas.kas" in structured data
  // published to every search engine.
  const canonical = normalizeDomainName(name);

  // `url` is omitted rather than defaulted when it cannot be built. Structured
  // data is a claim made to search engines: a ProfilePage whose url is the site
  // root says this profile *is* the homepage. Saying nothing is the honest
  // shape of "we do not have one".
  const url = domainProfileUrl(canonical);

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: canonical,
    description: `${canonical} — a premium KNS domain on Kaspa, showcased on KaspaDomains. Owned and controlled by its holder.`,
    ...(url ? { url } : {}),
    mainEntity: {
      "@type": "Thing",
      name: canonical,
      identifier: `KNS-${canonical}`,
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

import { loadCategoriesManifestOnce } from "@/data/categoriesManifest.server"; // import the async loader

/**
 * Structured data for the recent-domains list, or `null` if we could not read
 * the list at all.
 *
 * `null` rather than an empty `ItemList`, and the difference matters more here
 * than on screen. Markup is a **claim made to search engines**: publishing
 * `itemListElement: []` during a database outage asserts that the directory has
 * no domains, and that assertion can be crawled and cached. Emitting nothing
 * says nothing, which is the truth when the read failed.
 *
 * An empty list is still emitted when the read *succeeds* and there genuinely
 * are no active domains -- that claim is true.
 */
export async function getItemListJsonLd(limit = 6): Promise<ItemListJsonLd | null> {
  const listShell: Omit<ItemListJsonLd, "itemListElement"> = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": "https://kaspadomains.com/#recent-domains",
    name: "Recent Premium Kaspa Domains",
  };

  let categoriesData;
  try {
    categoriesData = await loadCategoriesManifestOnce();
  } catch (error) {
    console.error("Failed to load categories for ItemList JSON-LD:", error);
    return null;
  }

  const recentDomains = Object.values(categoriesData)
    .flatMap((cat) => cat.domains)
    .filter((d) => d.isActive)
    .slice(0, limit);

  // Dropped before numbering, not after: `position` must be a gapless sequence,
  // and an item pointing at the site root would tell a crawler that every
  // unresolvable domain is the homepage.
  const entries = recentDomains
    .map((domain) => ({ name: normalizeDomainName(domain.name), url: domainProfileUrl(domain.name) }))
    .filter((entry): entry is { name: string; url: string } => entry.url !== null);

  return {
    ...listShell,
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: entry.url,
      name: entry.name,
    })),
  };
}

