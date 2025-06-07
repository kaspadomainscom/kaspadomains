// src/app/domain/[name]/page.tsx

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { findDomainByName, getAllDomains } from "@/data/domainLookup";
import { categoriesData } from "@/data/categoriesManifest";
import type { Domain } from "@/data/types";

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

  const description = `Buy ${domain.name}, a premium KNS domain listed in the ${category} category.` +
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
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex gap-2 flex-wrap" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/domains" className="hover:underline">Domains</Link>
        <span>/</span>
        <span className="text-gray-700">{domain.name}</span>
      </nav>

      {/* Title Section */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{domain.name}</h1>
        <p className="text-base md:text-lg text-gray-600">
          Premium KNS domain in <span className="font-medium">{category}</span>
        </p>
      </header>

      {/* Info Panel */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 text-gray-800">
        <Detail label="Category" value={category} />
        <Detail
          label="Status"
          value={domain.listed ? "Listed" : "Unlisted"}
          valueClass={domain.listed ? "text-green-600" : "text-gray-500"}
        />
        <Detail
          label="Price"
          value={`${domain.price?.toLocaleString() ?? "0"} KAS`}
          valueClass="text-green-700 font-semibold"
        />

        {domain.sellerTelegram && (
          <Detail
            label="Seller Telegram"
            value={
              <Link
                href={`https://t.me/${domain.sellerTelegram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                @{domain.sellerTelegram.replace(/^@/, "")}
              </Link>
            }
          />
        )}

        {domain.sellerTwitter && (
          <Detail
            label="Seller Twitter"
            value={
              <Link
                href={`https://x.com/${domain.sellerTwitter.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                @{domain.sellerTwitter.replace(/^@/, "")}
              </Link>
            }
          />
        )}

        {domain.linkedWebsite && (
          <Detail
            label="Website"
            value={
              <Link
                href={domain.linkedWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {domain.linkedWebsite.replace(/^https?:\/\//, "")}
              </Link>
            }
          />
        )}

        {domain.kaspaLink && (
          <div className="pt-1">
            <Link
              href={domain.kaspaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-purple-600 hover:underline font-medium"
              aria-label={`View ${domain.name} on Kaspa.com`}
            >
              View on Kaspa.com
            </Link>
          </div>
        )}
      </section>

      {/* Owner Bio */}
      {domain.ownerBio && (
        <section className="mt-10 bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">About the Owner</h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{domain.ownerBio}</p>
        </section>
      )}
    </main>
  );
}

/** Reusable Detail Row */
function Detail({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex gap-2 text-sm md:text-base">
      <span className="font-medium text-gray-700 min-w-[120px]">{label}:</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
