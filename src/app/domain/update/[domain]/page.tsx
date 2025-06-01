// src/app/domain/update/[domain]/page.tsx
import { categoriesData } from "@/data/categoriesManifest";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const allDomains = Object.values(categoriesData)
    .flatMap((category) => category.domains)
    .map((domain) => ({ domain: domain.name }));

  return allDomains;
}

export default function UpdateDomainPage({ params }: { params: { domain: string } }) {
  const allDomains = Object.values(categoriesData).flatMap((cat) => cat.domains);
  const domainData = allDomains.find((d) => d.name === params.domain);

  if (!domainData) return notFound();

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-4xl font-bold text-gray-900">
        Update Domain: <span className="text-[#70C7BA]">{domainData.name}</span>
      </h1>

      <div className="space-y-4">
        <p><strong>Listed:</strong> {domainData.listed ? "Yes" : "No"}</p>
        <p><strong>Price:</strong> {domainData.price.toLocaleString()} KAS</p>
        <p>
          <strong>Kaspa Link:</strong>{" "}
          <a
            href={domainData.kaspaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            View on Marketplace
          </a>
        </p>
        {domainData.sellerTelegram && (
          <p><strong>Seller Telegram:</strong> @{domainData.sellerTelegram}</p>
        )}
      </div>

      <div className="mt-8 p-6 bg-gray-100 rounded-lg shadow">
        <p className="text-gray-700">
          You can add a form here to update domain details like price, listing status, or seller contact.
        </p>
      </div>
    </main>
  );
}
