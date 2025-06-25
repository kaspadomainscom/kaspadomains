// src/app/page.tsx
import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";

const previewDomains = [
  { name: "wallet.kas", likes: 234, price: 420 },
  { name: "defi.kas", likes: 187, price: 420 },
  { name: "dex.kas", likes: 150, price: 420 },
];

export const metadata = {
  title: "KaspaDomains — Vote & Showcase Premium .kas Domains",
  description:
    "List your premium .kas domain for 420 KAS. Get on-chain visibility, receive paid votes (5 KAS each), and secure your spot in the 10K premium index.",
  openGraph: {
    title: "KaspaDomains — Premium KNS Domain Voting Index",
    description:
      "A decentralized system for showcasing and voting on top .kas domains. List your domain, get voted with KAS, and build your Kaspa-native identity.",
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
          List your KNS domain for 420 KAS. Get voted by others using 5 KAS likes. Only 10,000 premium domains can be listed.
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {previewDomains.map((domain) => (
            <article key={domain.name} className="bg-[#121E28] p-6 rounded-2xl shadow hover:shadow-lg transition">
              <h3 className="text-xl font-semibold text-white mb-2">{domain.name}</h3>
              <p className="text-sm text-gray-400 mb-1">{domain.likes} Likes</p>
              <p className="text-sm text-gray-500">420 KAS Listing Fee</p>
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
            <strong>List your domain:</strong> A one-time 420 KAS fee adds your domain to the index.
          </p>
          <p>
            <strong>Get votes:</strong> Users can vote for your domain for 5 KAS per like. Each user can like up to 1000 domains.
          </p>
          <p>
            <strong>Revenue:</strong> More likes = more KAS. Your domain earns on-chain revenue.
          </p>
          <p>
            <strong>Limited Supply:</strong> Only 10,000 domains will ever be listed. Early spots are more valuable.
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
