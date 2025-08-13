// src/app/domain/[name]/page.tsx
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Domain } from "@/data/types";

import { loadCategoriesManifest } from "@/data/categoriesManifest";

import { DomainBreadcrumb } from "@/components/pages/domain/DomainBreadcrumb";
import { DomainTitleSection } from "@/components/pages/domain/DomainTitleSection";
import { DomainInfoPanel } from "@/components/pages/domain/DomainInfoPanel";
import { VotingSection } from "@/components/pages/domain/VotingSection";
import { JSX } from "react";

type StaticParam = { name: string };

function ensureKasSuffix(name: string): string {
  const base = name.trim().toLowerCase();
  return base.endsWith(".kas") ? base : `${base}.kas`;
}

function normalizeDomainName(name: string): string {
  return name.trim().toLowerCase().replace(/\.kas$/, "");
}

function findCategoryTitleByDomainName(
  domainName: string,
  manifest: Record<string, { title: string; domains: Domain[] }>
): string | undefined {
  const normalized = normalizeDomainName(domainName);
  return Object.values(manifest).find((category) =>
    category.domains.some((d) => normalizeDomainName(d.name) === normalized)
  )?.title;
}

function findDomainByName(
  name: string,
  manifest: Record<string, { title: string; domains: Domain[] }>
): Domain | undefined {
  const normalized = normalizeDomainName(name);
  for (const category of Object.values(manifest)) {
    const domain = category.domains.find(
      (d) => normalizeDomainName(d.name) === normalized
    );
    if (domain) return domain;
  }
  return undefined;
}

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
    // Return empty to avoid build failure if contract call fails
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const name = resolvedParams.name;
  const canonical = ensureKasSuffix(name);

  try {
    const manifest = await loadCategoriesManifest();
    const domain = findDomainByName(canonical, manifest);
    if (!domain) notFound();

    const category = findCategoryTitleByDomainName(domain.name, manifest) ?? "Unknown";

    const description = `Buy ${domain.name}, a premium KNS domain listed in the ${category} category.`;

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
  } catch {
    // Fallback metadata if contract fails
    return {
      title: "Kaspa Domains - Contract Unavailable",
      description:
        "Unable to load domain data due to contract unavailability. Please try again later.",
    };
  }
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function DomainPage({ params }: PageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  const rawName = resolvedParams.name;

  if (!rawName) return notFound();

  const canonical = ensureKasSuffix(rawName);

  if (rawName !== canonical) {
    redirect(`/domain/${canonical}`);
    return <></>; // never rendered
  }

  let manifest;
  try {
    manifest = await loadCategoriesManifest();
  } catch {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Contract Unavailable</h1>
        <p>
          Sorry, we are unable to load domain data right now because the smart contract is not
          responding or not deployed. Please try again later.
        </p>
      </main>
    );
  }

  const domain = findDomainByName(canonical, manifest);
  if (!domain) return notFound();

  const category = findCategoryTitleByDomainName(domain.name, manifest) ?? "Unknown";

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <DomainBreadcrumb domainName={domain.name} />
      <DomainTitleSection domainName={domain.name} category={category} />
      <DomainInfoPanel domain={domain} category={category} />
      <VotingSection domainName={domain.name} />
    </main>
  );
}
