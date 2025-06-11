// src/app/list-domain/page.tsx
import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";

export default function ListDomainPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-10">
      <h1 className="text-4xl font-bold mb-4">All Domains</h1>

      {/* Intro about listing and pricing */}
      <section className="bg-[#121E28] p-6 rounded-lg shadow text-gray-200">
        <h2 className="text-2xl font-semibold mb-3 text-white">Listing Your .kas Domain</h2>
        <p className="mb-4 leading-relaxed">
          Listing your .kas domain on KaspaDomains is a one-time investment of <strong>287 KAS</strong>. 
          Once listed, your domain gains permanent visibility across the Kaspa ecosystem, making it easier 
          for builders, collectors, and projects to discover and trust your digital identity.
        </p>
        <p className="mb-4 leading-relaxed">
          <strong>Features of a Listed Domain:</strong>
          <ul className="list-disc list-inside ml-5 mt-2 space-y-1 text-gray-300">
            <li>Dedicated domain page with your social links, website, and optional bio</li>
            <li>Verified status to show authenticity</li>
            <li>Inclusion in premium searches and category listings</li>
            <li>Lifetime indexing with no renewal fees</li>
          </ul>
        </p>
        <p className="mb-4 leading-relaxed">
          To list a new domain, start by creating it below. Only verified KNS owners can list domains, so make sure you own the name on the Kaspa Name Service.
        </p>
        <Link
          href="/domain/new"
          className="inline-block mt-2 bg-yellow-400 text-[#0E1E25] px-6 py-3 rounded-full font-semibold shadow hover:bg-yellow-300 transition"
        >
          Create a New Domain
        </Link>
      </section>

      {/* Domains by Category */}
      {Object.values(categoriesData).map((category) => (
        <section key={category.title} className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{category.title}</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-100">
            {category.domains.map((domain) => (
              <li key={domain.name}>
                <Link
                  href={`/domain/${domain.name}`}
                  className="text-yellow-400 underline hover:text-yellow-300"
                >
                  {domain.name}
                </Link>{" "}
                — {domain.listed ? (
                  <span className="text-green-400 font-semibold">Listed</span>
                ) : (
                  <span className="text-gray-500">Unlisted</span>
                )}{" "}
                — Price: {domain.price} KAS
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
