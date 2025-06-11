// src/app/page.tsx
import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";

export const metadata = {
  title: "KaspaDomains — Premium .kas Domain Index for the Kaspa Ecosystem",
  description:
    "KaspaDomains is the leading index for premium .kas domains. List your verified KNS name with a one-time 287 KAS fee and get discovered by builders, collectors, and Kaspa projects worldwide.",
};

export default async function Home() {
  const recentDomains = Object.values(categoriesData)
    .flatMap((cat) => cat.domains)
    .filter((d) => d.listed)
    .slice(0, 6);

  return (
    <main className="space-y-28 bg-[#0E1E25] text-gray-100 min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#00AEEF] to-[#0E1E25] py-28 text-center px-6 md:px-8">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-snug mb-5">
          Discover Premium <span className="text-yellow-400">.kas</span> Domains
        </h1>
        <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8 text-white/90">
          Explore the most exclusive <strong>.kas</strong> domains in the Kaspa Name System.
          Each listing is hand-selected for brandability, trust, and long-term value.
          <br />
          <strong>Index your premium name for just 287 KAS</strong> — one time, lifetime visibility.
        </p>
        <Link
          href="/list-domain"
          className="inline-block bg-yellow-400 text-[#0E1E25] px-8 py-3 rounded-full font-semibold shadow-lg hover:bg-yellow-300 transition"
        >
          List Your Domain
        </Link>
      </section>

      {/* Category Overview */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-12 text-center text-white">
          Browse by Category
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {Object.entries(categoriesData).map(([key, value]) => (
            <Link
              href={`/domains/categories/category/${key}`}
              key={key}
              className="block bg-[#121E28] p-6 rounded-2xl shadow hover:shadow-lg hover:bg-[#1C2B37] transition"
            >
              <h3 className="text-xl font-semibold mb-1 text-white">{value.title}</h3>
              <p className="text-sm text-gray-400">{value.domains.length} domains listed</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recently Indexed */}
      <section className="bg-[#101C26] py-24 text-center px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-10 text-white">Recently Indexed</h2>
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 max-w-7xl mx-auto">
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
                className="text-yellow-400 underline text-sm"
              >
                View on Kaspa Explorer
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* Why List Section */}
      <section className="max-w-4xl mx-auto text-center px-6 md:px-8 pb-28">
        <h2 className="text-3xl font-bold mb-6 text-white">Why List on KaspaDomains?</h2>
        <div className="text-lg text-gray-300 leading-relaxed space-y-6 mb-10">
          <p>
            KaspaDomains isn&apos;t a marketplace &mdash; it&apos;s a curated discovery layer for the best <strong>.kas</strong> domains.
            We filter out low-quality names so your identity stands out.
          </p>
          <p>
            Every indexed domain gets a dedicated page — complete with your social links, website, and an optional bio.
            Show the Kaspa ecosystem you&apos;re real.
          </p>
          <p>
            For a <strong>one-time fee of 287 KAS</strong>, your domain is featured permanently and becomes part of Kaspa&apos;s trusted digital identity layer.
          </p>
        </div>
        <Link
          href="/list-domain"
          className="inline-block bg-yellow-400 text-[#0E1E25] px-8 py-3 rounded-full font-semibold shadow-lg hover:bg-yellow-300 transition"
        >
          Submit Your Domain
        </Link>
      </section>
    </main>
  );
}
