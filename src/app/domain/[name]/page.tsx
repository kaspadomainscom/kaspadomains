// src/app/domain/[domain]/page.tsx
import { notFound } from "next/navigation";
import { categoriesData } from "@/data/categoriesManifest";
import { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import Link from "next/link";

export interface Domain {
  name: string;
  listed: boolean;
  price: number;
  sellerTelegram?: string;
  kaspaLink: string;
}

function findDomainByName(name: string): { domain: Domain; categoryTitle: string } | null {
  for (const category of Object.values(categoriesData)) {
    const domain = category.domains.find((d) => d.name === name);
    if (domain) return { domain, categoryTitle: category.title };
  }
  return null;
}

type StaticParam = { name: string };

export function generateStaticParams(): StaticParam[] {
  return Object.values(categoriesData)
    .flatMap((c) => c.domains)
    .map((domain) => ({ name: domain.name }));
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const found = findDomainByName(name);
  if (!found) return {};

  const { domain, categoryTitle } = found;

  return {
    title: `${domain.name} — Premium ${categoryTitle} Domain | kaspadomains.com`,
    description: `Buy ${domain.name}, a premium KNS domain listed in the ${categoryTitle} category.`,
    openGraph: {
      title: domain.name,
      description: `Premium KNS domain in ${categoryTitle}`,
      url: `https://kaspadomains.com/domain/${domain.name}`,
      images: [
        {
          url: "https://kaspadomains.com/og-image.png",
          width: 1200,
          height: 630,
          alt: domain.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: domain.name,
      description: `Premium KNS domain in ${categoryTitle}`,
    },
  };
}

export default async function DomainPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const found = findDomainByName(name);
  if (!found) return notFound();

  const { domain, categoryTitle } = found;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-4">{domain.name}</h1>
      <p className="text-gray-700 mb-2">Category: {categoryTitle}</p>
      <p className="text-gray-700 mb-2">
        Status:{" "}
        <span className={domain.listed ? "text-green-600" : "text-gray-500"}>
          {domain.listed ? "Listed" : "Unlisted"}
        </span>
      </p>
      <p className="text-lg font-semibold mb-2">Price: {domain.price} KAS</p>

      {domain.sellerTelegram && (
        <p className="mb-2">
          <span className="font-medium">Seller Telegram:</span>{" "}
          <Link
            href={`https://t.me/${domain.sellerTelegram}`}
            target="_blank"
            className="text-blue-600 underline"
          >
            @{domain.sellerTelegram}
          </Link>
        </p>
      )}

      <p className="mb-4">
        <Link
          href={domain.kaspaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 underline"
        >
          View on Kaspa.com
        </Link>
      </p>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: domain.name,
          description: `Premium KNS domain in ${categoryTitle}`,
          category: categoryTitle,
          offers: {
            "@type": "Offer",
            priceCurrency: "KAS",
            price: domain.price,
            availability: domain.listed
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url: `https://kaspadomains.com/domains/${domain.name}`,
          },
          ...(domain.sellerTelegram && {
            seller: {
              "@type": "Person",
              name: domain.sellerTelegram,
            },
          }),
        }}
      />
    </main>
  );
}
