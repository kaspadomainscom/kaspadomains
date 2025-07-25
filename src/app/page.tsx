// src/app/page.tsx
import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";

const previewDomains = [
  { name: "wallet.kas", likes: 234, price: 420 },
  { name: "defi.kas", likes: 187, price: 420 },
  { name: "dex.kas", likes: 150, price: 420 },
];

export const metadata = {
  title: "KaspaDomains — Vote, Earn & Showcase Premium .kas Domains",
  description:
    "List your premium .kas domain for 420 KAS. Earn KAS and KDC from on-chain likes (5 KAS each). Limited to 10,000 entries. Powered by Kaspa.",
  openGraph: {
    title: "KaspaDomains — Premium KNS Domain Voting Index",
    description:
      "A decentralized system for showcasing and voting on top .kas domains. List your domain, earn KDC and KAS from paid votes, and build your Kaspa-native identity.",
    url: "https://kaspadomains.com",
    siteName: "KaspaDomains",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: ".kas domain showcase",
      },
    ],
    type: "website",
  },
};

export default function Home() {
  return (
    <main className="space-y-28 bg-[#0E1E25] text-gray-100 min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#00AEEF] to-[#0E1E25] py-28 text-center px-6 md:px-8">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-snug mb-4">
          Showcase Your <span className="text-yellow-400">.kas</span> Domain on-chain
        </h1>
        <p className="text-lg md:text-xl max-w-3xl mx-auto mb-6 text-white/90">
          List your KNS domain for 420 KAS. Receive paid votes (5 KAS each), earn KDC rewards, and get discovered by the Kaspa community.
        </p>
        <Link
          href="/list-domain"
          className="inline-block bg-yellow-400 text-[#0E1E25] px-8 py-3 rounded-full font-semibold shadow-lg hover:bg-yellow-300 transition"
        >
          List Your Domain
        </Link>
      </section>

      {/* Preview Domains */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-10 text-center text-white">Preview Listed Domains</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {previewDomains.map((domain) => (
            <article key={domain.name} className="bg-[#121E28] p-6 rounded-2xl shadow hover:shadow-lg transition">
              <h3 className="text-xl font-semibold text-white mb-2">{domain.name}</h3>
              <p className="text-sm text-gray-400 mb-1">{domain.likes} Likes</p>
              <p className="text-sm text-gray-500">{domain.price} KAS Listing Fee</p>
              <Link href={`/domain/${domain.name}`} className="text-yellow-400 underline text-sm mt-2 inline-block">
                View Domain
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-12 text-center text-white">Browse by Category</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(categoriesData).map(([key, { title, domains }]) => (
            <Link
              key={key}
              href={`/domains/categories/category/${key}`}
              className="block bg-[#121E28] p-6 rounded-2xl shadow hover:shadow-lg hover:bg-[#1C2B37] transition"
            >
              <h3 className="text-xl font-semibold mb-1 text-white">{title}</h3>
              <p className="text-sm text-gray-400">{domains.length} domains</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Explainer */}
      <section className="max-w-4xl mx-auto text-center px-6 md:px-8 pb-28">
        <h2 className="text-3xl font-bold mb-6 text-white">How It Works</h2>
        <div className="text-lg text-gray-300 leading-relaxed space-y-6 mb-10">
          <p>
            <strong>List your domain:</strong> A one-time 420 KAS fee adds your domain permanently to the KaspaDomains index. Only 10,000 domains will ever be listed.
          </p>
          <p>
            <strong>Receive votes:</strong> Anyone can like your domain for 5 KAS. Each wallet can vote on up to 1000 domains.
          </p>
          <p>
            <strong>Earn KDC rewards:</strong> Every like gives <strong>1 KDC to the voter</strong> and <strong>1 KDC to the domain owner</strong>.
          </p>
          <p>
            <strong>Total Supply:</strong> KDC has a hard cap of <strong>2.1 million tokens</strong>. Once distributed, no more will ever be minted.
          </p>
          <p>
            <strong>Monetize attention:</strong> Domain owners earn KAS and KDC, building both revenue and social proof on-chain.
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
