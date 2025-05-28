import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";

export const metadata = {
  title: "RedNose Domains — Premium Kaspa KNS Marketplace",
  description:
    "Discover premium KNS domains listed on the RedNose marketplace. One-time 100 KAS listing fee for unique and valuable domains only.",
};

export default function Home() {
  return (
    <main className="space-y-24">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#70C7BA] to-[#54B2A1] py-24 text-white text-center px-6">
        <h1 className="text-5xl font-bold mb-4">RedNose KNS Domain Marketplace</h1>
        <p className="text-xl mb-6">
          List or discover valuable Kaspa domains. Only premium domains accepted with a 100 KAS one-time listing fee.
        </p>
        <Link
          href="/list-domain"
          className="bg-white text-[#54B2A1] px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition"
        >
          List Your Domain
        </Link>
      </section>

      {/* Categories Overview */}
      <section className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold mb-12 text-center">Explore Categories</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(categoriesData).map(([key, value]) => (
            <Link
              href={`/domains/categories/${key}`}
              key={key}
              className="block p-6 bg-white shadow-md rounded-xl hover:shadow-lg transition"
            >
              <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
              <p className="text-sm text-gray-600">
                {value.domains.length} premium domains listed
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Premium Domains */}
      <section className="bg-[#F7FDFC] py-20 text-center px-6">
        <h2 className="text-3xl font-bold mb-8">Recent Premium Domains</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {Object.values(categoriesData)
            .flatMap(cat => cat.domains)
            .filter(d => d.listed)
            .slice(0, 6)
            .map((domain, i) => (
              <article
                key={i}
                className="bg-white p-4 rounded-xl shadow hover:shadow-md transition text-left"
              >
                <h3 className="text-lg font-semibold">{domain.name}</h3>
                <p className="text-sm text-gray-700">Price: {domain.price} KAS</p>
                <a
                  href={domain.kaspaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 underline text-sm"
                >
                  View on Kaspa
                </a>
              </article>
            ))}
        </div>
      </section>

      {/* Marketplace Description */}
      <section className="max-w-4xl mx-auto text-center px-6 pb-24">
        <h2 className="text-3xl font-bold mb-6">Why RedNose?</h2>
        <p className="text-lg text-gray-700">
        This marketplace curates only premium KNS domains—names with real value, brand potential,
        or cultural relevance. With a one-time listing fee of 100 KAS, only special domains make
        it in. Categories like characters, tech, finance, and gaming help buyers quickly find
        what they&rsquo;re looking for.
        </p>
      </section>
    </main>
  );
}
