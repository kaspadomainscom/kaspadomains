import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { findDomainByName, getAllDomains } from "@/data/domainLookup";
import { categoriesData } from "@/data/categoriesManifest";
import type { Domain } from "@/data/types";

import { DomainBreadcrumb } from "@/components/pages/domain/DomainBreadcrumb";
import { DomainTitleSection } from "@/components/pages/domain/DomainTitleSection";
import { DomainInfoPanel } from "@/components/pages/domain/DomainInfoPanel";
import { DomainOwnerBio } from "@/components/pages/domain/DomainOwnerBio";
import { VotingSection } from "@/components/pages/domain/VotingSection";

type StaticParam = { name: string };

function ensureKasSuffix(name: string): string {
  const base = name.trim().toLowerCase();
  return base.endsWith(".kas") ? base : `${base}.kas`;
}

function normalizeDomainName(name: string): string {
  return name.trim().toLowerCase().replace(/\.kas$/, "");
}

function findCategoryTitleByDomainName(domainName: string): string | undefined {
  const normalized = normalizeDomainName(domainName);
  return Object.values(categoriesData).find((category) =>
    category.domains.some((d) => normalizeDomainName(d.name) === normalized)
  )?.title;
}

export function generateStaticParams(): StaticParam[] {
  return getAllDomains().map((domain: Domain) => ({
    name: ensureKasSuffix(domain.name),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const canonical = ensureKasSuffix(name);
  const domain = findDomainByName(canonical);
  if (!domain) notFound();

  const category = findCategoryTitleByDomainName(domain.name) ?? "Unknown";

  const description =
    `Buy ${domain.name}, a premium KNS domain listed in the ${category} category.` +
    (domain.ownerBio ? ` ${domain.ownerBio.slice(0, 160)}` : "");

  return {
    title: `${domain.name} — Premium ${category} Domain | kaspadomains.com`,
    description,
    openGraph: {
      title: domain.name,
      description: `Premium KNS domain in ${category}`,
      url: `https://kaspadomains.com/domain/${domain.name}`,
      images: [
        {
          url: "https://kaspadomains.com/og-image.png",
          width: 1200,
          height: 630,
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

export default async function DomainPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  if (!rawName) return notFound();

  const canonical = ensureKasSuffix(rawName);
  if (rawName !== canonical) redirect(`/domain/${canonical}`);

  const domain = findDomainByName(canonical);
  if (!domain) return notFound();

  const category = findCategoryTitleByDomainName(domain.name) ?? "Unknown";

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <DomainBreadcrumb domainName={domain.name} />
      <DomainTitleSection domainName={domain.name} category={category} />
      <DomainInfoPanel domain={domain} category={category} />
      {domain.ownerBio && <DomainOwnerBio bio={domain.ownerBio} />}

      {/* VotingSection is a client component */}
      <VotingSection domainName={domain.name} />
    </main>
  );
}
