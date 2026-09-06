// src/app/domain/[name]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";

import { loadCategoriesManifest } from "@/data/categoriesManifest";
import { lookupDomain, findDomainCategoryTitle } from "@/data/domainLookup";
import { normalizeDomainName } from "@/lib/domainName";
import { getDomainJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";

import { DomainBreadcrumb } from "@/components/pages/domain/DomainBreadcrumb";
import { DomainTitleSection } from "@/components/pages/domain/DomainTitleSection";
import { DomainInfoPanel } from "@/components/pages/domain/DomainInfoPanel";
import { VotingSection } from "@/components/pages/domain/VotingSection";
import { JSX } from "react";

type StaticParam = { name: string };

// One owner for this format: src/lib/domainName.ts. This page had its own copy,
// as did the update page, a category page, the lookup layer and the server
// verifier -- five implementations of two lines, and a sixth site in jsonld.ts
// that skipped the guard and published "foo.kas.kas" to search engines.
const ensureKasSuffix = normalizeDomainName;

/**
 * Whether a domain has a profile page is decided by whether it is **listed** --
 * an indexed lookup in `domains` -- and nothing else.
 *
 * It used to be decided by scanning the category manifest, which is a different
 * question with a nastier answer. The manifest drops categories where
 * `is_allowed = false`, and any membership pointing at one, so withdrawing a
 * category silently deleted the profile page of every domain listed only under
 * it. Those are paid, active listings whose owners did nothing wrong; a
 * moderation decision about a category should never 404 a domain.
 *
 * The category is now looked up separately and is only a label. "Uncategorized"
 * is a fine thing to render; "this domain does not exist" is not.
 */

export async function generateStaticParams(): Promise<StaticParam[]> {
  try {
    const manifest = await loadCategoriesManifest();
    if (!manifest) return [];

    const allDomains = Object.values(manifest).flatMap((cat) => cat.domains);

    const validDomains = allDomains.filter(
      (domain) => domain.name && domain.name.trim().length > 0
    );

    return validDomains.map((domain) => ({
      name: ensureKasSuffix(domain.name),
    }));
  } catch {
    // Pre-rendering fewer pages is fine -- anything missed is still rendered on
    // demand. Failing the build over it is not.
    return [];
  }
}

/**
 * Shown when the data store cannot be reached at all.
 *
 * Deliberately blames nothing in particular. The old copy said "the smart
 * contract is not responding or not deployed" -- but listings have lived in
 * Postgres since 2026-09-05, so it told users the opposite of what was
 * happening and pointed anyone debugging it at a component that isn't even in
 * the request path.
 */
const UNAVAILABLE_METADATA: Metadata = {
  title: "Domain temporarily unavailable | KaspaDomains",
  description:
    "We could not load this domain right now. Please try again in a few moments.",
  robots: { index: false, follow: true },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const canonical = ensureKasSuffix(resolvedParams.name);

  const result = await lookupDomain(canonical);

  // A domain that genuinely isn't listed gets noindex too, but the page body is
  // what actually returns the 404 -- metadata only decides what crawlers are
  // told. Both non-found cases want the same answer here: don't index this.
  if (result.status !== "found") return UNAVAILABLE_METADATA;

  const domain = result.domain;
  const category = (await findDomainCategoryTitle(domain.name)) ?? "Uncategorized";
  const description = `${domain.name}, a premium KNS domain listed in the ${category} category on KaspaDomains.`;

  return {
    title: `${domain.name} — Premium ${category} Domain | kaspadomains.com`,
    description,
    alternates: {
      canonical: `https://kaspadomains.com/domain/${domain.name}`,
    },
    openGraph: {
      title: domain.name,
      description: `Premium KNS domain in ${category}`,
      url: `https://kaspadomains.com/domain/${domain.name}`,
      images: [
        {
          url: "https://kaspadomains.com/og-image.png",
          width: 1024,
          height: 1024,
          alt: `${domain.name} Premium KNS Domain`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: domain.name,
      description: `Premium KNS domain in ${category}`,
    },
  };
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function DomainPage({ params }: PageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  const rawName = resolvedParams.name;

  if (!rawName) return notFound();

  const canonical = ensureKasSuffix(rawName);

  // redirect() throws, so nothing after it runs.
  if (rawName !== canonical) redirect(`/domain/${canonical}`);

  const result = await lookupDomain(canonical);

  // "We couldn't check" is not "it doesn't exist". A 404 is a permanent answer
  // -- it tells search engines to drop the page and tells the owner their paid
  // listing is gone -- so it is only ever returned when the store actually said
  // the domain isn't listed. An outage gets a temporary, honest error instead.
  if (result.status === "unavailable") {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 text-center text-gray-100">
        <h1 className="text-2xl font-bold mb-4">Temporarily unavailable</h1>
        <p className="text-gray-300">
          We couldn&apos;t load this domain right now. This is a problem on our side, not
          with the domain — please try again in a few moments.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          <Link href="/status" className="text-teal-300 hover:text-teal-200">
            Check current status
          </Link>
        </p>
      </main>
    );
  }

  if (result.status === "not-listed") return notFound();

  const domain = result.domain;

  // A missing category is not a missing domain. Failing to load one leaves the
  // page intact with an honest label rather than taking the whole profile down.
  const category = (await findDomainCategoryTitle(domain.name)) ?? "Uncategorized";

  const nonce = (await headers()).get("x-csp-nonce") || undefined;
  const jsonLd = getDomainJsonLd({
    name: domain.name,
    owner: domain.owner,
    category,
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd json={jsonLd} nonce={nonce} />
      <DomainBreadcrumb domainName={domain.name} />
      <DomainTitleSection domainName={domain.name} category={category} />
      <DomainInfoPanel domain={domain} category={category} />
      <VotingSection domainName={domain.name} />
    </main>
  );
}
