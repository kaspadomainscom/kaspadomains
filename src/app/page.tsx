// src/app/page.tsx
import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";

export const metadata = {
  title: "Kaspa Domains — Premium Kaspa KNS Marketplace",
  description:
    "Discover premium KNS domains listed on the kaspadomains marketplace. One-time 287 KAS listing fee for unique and valuable domains only.",
};

export default function Home() {
  return (
    <main className="space-y-28 bg-[#0E1E25] text-gray-100">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#00AEEF] to-[#0E1E25] py-28 text-center px-6 md:px-8">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-snug mb-5">
          kaspadomains KNS Domain Marketplace
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-white/90">
          List or discover valuable Kaspa domains. Only premium domains accepted with a 287 KAS one-time listing fee.
        </p>
        <Link
          href="/list-domain"
          className="inline-block bg-[#FFD700] text-[#0E1E25] px-8 py-3 rounded-full font-semibold shadow hover:bg-yellow-400 transition"
        >
          List Your Domain
        </Link>
      </section>

      {/* Categories Overview */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-12 text-center text-white">
          Explore Categories
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(categoriesData).map(([key, value]) => (
            <Link
              href={`/domains/categories/category/${key}`}
              key={key}
              className="block bg-[#121E28] p-6 rounded-2xl shadow hover:shadow-lg transition"
            >
              <h3 className="text-xl font-semibold mb-1 text-white">
                {value.title}
              </h3>
              <p className="text-sm text-gray-400">
                {value.domains.length} premium domains listed
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Premium Domains */}
      <section className="bg-[#101C26] py-24 text-center px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-10 text-white">
          Recent Premium Domains
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {Object.values(categoriesData)
            .flatMap(cat => cat.domains)
            .filter(d => d.listed)
            .slice(0, 6)
            .map((domain, i) => (
              <article
                key={i}
                className="bg-[#121E28] p-5 rounded-2xl shadow hover:shadow-md transition text-left"
              >
                <h3 className="text-lg font-semibold text-white">{domain.name}</h3>
                <p className="text-sm text-gray-400 mb-2">Price: {domain.price} KAS</p>
                <a
                  href={domain.kaspaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FFD700] underline text-sm"
                >
                  View on Kaspa
                </a>
              </article>
            ))}
        </div>
      </section>

      {/* Marketplace Description */}
      <section className="max-w-4xl mx-auto text-center px-6 md:px-8 pb-28">
        <h2 className="text-3xl font-bold mb-6 text-white">
          Why Kaspadomains.com?
        </h2>
        <p className="text-lg text-gray-300 leading-relaxed">
          This marketplace curates only premium KNS domains — names with real value, brand potential,
          or cultural relevance. With a one-time listing fee of 287 KAS, only special domains make
          it in. Categories like characters, tech, finance, and gaming help buyers quickly find
          what they’re looking for.
        </p>
      </section>
    </main>
  );
}
