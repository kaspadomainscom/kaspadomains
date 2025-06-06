// src/app/page.tsx
import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";

export const metadata = {
  title: "Kaspa Domains — Premium KNS Domains Index & Listing",
  description:
    "KaspaDomains is the premier index for premium .kas domains. List your unique KNS domain for a one-time 287 KAS fee and gain visibility among Kaspa enthusiasts and projects worldwide.",
};

export default async function Home() {
  const recentDomains = Object.values(categoriesData)
    .flatMap((cat) => cat.domains)
    .filter((d) => d.listed)
    .slice(0, 6);

  return (
    <main className="space-y-28 bg-[#0E1E25] text-gray-100">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#00AEEF] to-[#0E1E25] py-28 text-center px-6 md:px-8">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-snug mb-5">
          KaspaDomains: Premium KNS Domains Index & Listing
        </h1>
        <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8 text-white/90">
          KaspaDomains is the authoritative index for premium <strong>.kas</strong> domains — showcasing verified crypto projects, personal brands, and community names.
          <br />
          <strong>List your unique KNS domain today with a one-time 287 KAS fee</strong> to reach an engaged audience of Kaspa enthusiasts, traders, and projects worldwide.
        </p>
        <Link
          href="/list-domain"
          className="inline-block bg-[#FFD700] text-[#0E1E25] px-8 py-3 rounded-full font-semibold shadow hover:bg-yellow-400 transition"
        >
          List Your Domain Now
        </Link>
      </section>

      {/* Categories Overview */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-12 text-center text-white">
          Explore .kas Domains by Category
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(categoriesData).map(([key, value]) => (
            <Link
              href={`/domains/categories/category/${key}`}
              key={key}
              className="block bg-[#121E28] p-6 rounded-2xl shadow hover:shadow-lg transition"
            >
              <h3 className="text-xl font-semibold mb-1 text-white">{value.title}</h3>
              <p className="text-sm text-gray-400">{value.domains.length} premium domains indexed</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Premium Domains */}
      <section className="bg-[#101C26] py-24 text-center px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-10 text-white">
          Recently Indexed Premium .kas Domains
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {recentDomains.map((domain, i) => (
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
                View on Kaspa Explorer
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* Why List Section */}
      <section className="max-w-4xl mx-auto text-center px-6 md:px-8 pb-28">
        <h2 className="text-3xl font-bold mb-6 text-white">Why List Your Domain on KaspaDomains?</h2>
        <p className="text-lg text-gray-300 leading-relaxed mb-6">
          Listing your premium <strong>.kas</strong> domain on KaspaDomains ensures maximum visibility within the growing Kaspa ecosystem. Our curated index features verified domains connected to crypto projects, personal brands, and vibrant communities.
        </p>
        <p className="text-lg text-gray-300 leading-relaxed mb-6">
          Each listing is enriched with metadata such as official websites, Twitter/X profiles, and Telegram contacts, building trust and authority for your domain.
        </p>
        <p className="text-lg text-gray-300 leading-relaxed mb-6">
          For a <strong>one-time 287 KAS listing fee</strong>, your domain gains permanent exposure to active buyers, collaborators, and Kaspa enthusiasts worldwide.
        </p>
        <Link
          href="/list-domain"
          className="inline-block bg-[#FFD700] text-[#0E1E25] px-8 py-3 rounded-full font-semibold shadow hover:bg-yellow-400 transition"
        >
          List Your Domain Today
        </Link>
      </section>
    </main>
  );
}
