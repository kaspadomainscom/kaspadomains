"use client";

import { Domain } from "@/data/types";
import Link from "next/link";
import { JsonLd } from "./JsonLd"; // your existing reusable component

export function DomainCard({ domain }: { domain: Domain }) {
  const telegramUsername = domain.sellerTelegram?.replace("@", "") || null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: domain.name,
    description:
      "Premium KNS domain pointing to a Kaspa wallet. Perfect for identity, payments, or branding.",
    sku: `KNS-${domain.name}`,
    productID: domain.name,
    url: `https://kaspadomains.com/domain/${domain.name}`,
    category: "KNS Domain",
    offers: {
      "@type": "Offer",
      price: domain.price,
      priceCurrency: "KAS",
      availability: domain.listed
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Person",
        name: telegramUsername || "Unknown",
      },
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "KNS Type",
        value: "Kaspa Domain Name",
      },
    ],
  };

  return (
    <>
      <Link
        href={`/domain/${domain.name}`}
        className="block bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-purple-400 transition-all duration-200"
      >
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-2xl font-bold text-gray-900">{domain.name}</h2>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              domain.listed
                ? "bg-green-100 text-green-700"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {domain.listed ? "Listed" : "Unlisted"}
          </span>
        </div>

        <div className="text-gray-800 mb-2">
          <strong className="font-medium">Price:</strong> {domain.price} KAS
        </div>

        {telegramUsername && (
          <div className="mb-2">
            <strong className="font-medium">Seller Telegram:</strong>{" "}
            <span className="text-blue-600">@{telegramUsername}</span>
          </div>
        )}

        <div className="mt-2">
          <span
            onClick={(e) => {
              e.stopPropagation();
              window.open(domain.kaspaLink, "_blank", "noopener,noreferrer");
            }}
            className="text-purple-600 text-sm underline hover:text-purple-800 cursor-pointer"
          >
            View on Kaspa.com →
          </span>
        </div>
      </Link>

      <JsonLd data={jsonLd} />
    </>
  );
}
