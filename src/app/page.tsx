// src/app/page.tsx
import Link from "next/link";
import { loadCategoriesManifest, type CategoryManifest } from "@/data/categoriesManifest";

const previewDomains = [
  { name: "wallet.kas", likes: 234, price: 420 },
  { name: "defi.kas", likes: 187, price: 420 },
  { name: "dex.kas", likes: 150, price: 420 },
];

export const metadata = {
  title: "KaspaDomains — Premium .kas Domains • Earn, Vote & Showcase",
  description:
    "List your .kas domain for 420 KAS. Get discovered, earn KDC rewards, and build your Kaspa-native identity. Only 10,000 listings. Join the on-chain domain revolution.",
  openGraph: {
    title: "KaspaDomains — Premium .kas Domains • Earn, Vote & Showcase",
    description:
      "Showcase your .kas domain on-chain. Limited to 10,000 listings. Earn KDC from votes, grow your visibility, and monetize attention in the Kaspa ecosystem.",
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
  twitter: {
    card: "summary_large_image",
    site: "@KaspaDomains",
    title: "KaspaDomains — Premium .kas Domains • Earn, Vote & Showcase",
    description:
      "List your .kas domain, earn KDC rewards, and get discovered by the Kaspa community. Limited to 10,000 listings.",
    image: "/og-image.png",
  },
};

export default async function Home() {
  // Load categories manifest asynchronously
  let categoriesData: CategoryManifest = {};
  try {
    categoriesData = await loadCategoriesManifest();
  } catch (e) {
    console.error("Failed to load categories manifest", e);
    // fallback to empty object so UI still renders
  }

  return (
    <main className="space-y-28 bg-[#0E1E25] text-gray-100 min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#00AEEF] to-[#0E1E25] py-28 text-center px-6 md:px-8">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-snug mb-6">
          Own the Future of <span className="text-yellow-400">.kas</span> Domains
        </h1>
        <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8 text-white/90">
          Secure your premium .kas domain for just 420 KAS. Earn KDC rewards, 
          attract votes from the Kaspa community, and showcase your on-chain identity. 
          Limited to only <strong>10,000 domains</strong> forever.
        </p>
        <Link
          href="/list-domain"
          className="inline-block bg-yellow-400 text-[#0E1E25] px-10 py-4 rounded-full font-semibold text-lg shadow-lg hover:bg-yellow-300 transition"
        >
          🚀 List Your Domain Today
        </Link>
      </section>

      {/* Preview Domains */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-10 text-center text-white">
          Trending .kas Domains
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {previewDomains.map((domain) => (
            <article
              key={domain.name}
              className="bg-[#121E28] p-6 rounded-2xl shadow-md hover:shadow-xl transition transform hover:-translate-y-1"
            >
              <h3 className="text-xl font-semibold text-white mb-2">{domain.name}</h3>
              <p className="text-sm text-gray-400 mb-1">🔥 {domain.likes} votes</p>
              <p className="text-sm text-gray-500">{domain.price} KAS listing fee</p>
              <Link
                href={`/domain/${domain.name}`}
                className="text-yellow-400 underline text-sm mt-3 inline-block hover:text-yellow-300"
              >
                View Domain →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-12 text-center text-white">
          Explore by Category
        </h2>
        {Object.keys(categoriesData).length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(categoriesData).map(([key, { title, domains }]) => (
              <Link
                key={key}
                href={`/domains/categories/category/${key}`}
                className="block bg-[#121E28] p-6 rounded-2xl shadow-md hover:shadow-xl hover:bg-[#1C2B37] transition transform hover:-translate-y-1"
              >
                <h3 className="text-xl font-semibold mb-1 text-white">{title}</h3>
                <p className="text-sm text-gray-400">{domains.length} domains</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400">Categories are loading...</p>
        )}
      </section>

      {/* Explainer */}
      <section className="max-w-4xl mx-auto text-center px-6 md:px-8 pb-28">
        <h2 className="text-3xl font-bold mb-6 text-white">How It Works</h2>
        <div className="text-lg text-gray-300 leading-relaxed space-y-6 mb-12">
          <p>
            <strong>1. List your domain:</strong> Pay a one-time <strong>420 KAS</strong> to lock your domain into the KaspaDomains index. 
            With a cap of just 10,000 listings, every spot is scarce and valuable.
          </p>
          <p>
            <strong>2. Get voted on:</strong> The community can like your domain for <strong>5 KAS</strong> per vote. 
            Each wallet can support up to 1,000 domains — fueling competition for visibility.
          </p>
          <p>
            <strong>3. Earn rewards:</strong> Every vote mints <strong>KDC for the voter</strong> and <strong>KDC for the domain owner</strong>, 
            aligning incentives across the ecosystem.
          </p>
          <p>
            <strong>4. Scarce tokenomics:</strong> KDC has a hard cap of <strong>2.1 million tokens</strong>. Once distributed, 
            no new tokens will ever be minted.
          </p>
          <p>
            <strong>5. Monetize attention:</strong> Domain owners earn <strong>KDC</strong>, 
            transforming votes into measurable on-chain value and reputation.
          </p>
        </div>
        <Link
          href="/list-domain"
          className="inline-block bg-yellow-400 text-[#0E1E25] px-10 py-4 rounded-full font-semibold text-lg shadow-lg hover:bg-yellow-300 transition"
        >
          💎 Submit Your Domain
        </Link>
      </section>
    </main>
  );
}
