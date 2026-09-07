// src/app/page.tsx
import Link from "next/link";
import { domainProfilePath } from "@/lib/domainName";
import { headers } from "next/headers";
import { loadCategoriesManifestOnce } from "@/data/categoriesManifest.server";
import { type CategoryManifest } from "@/data/categoriesManifest";
import { loadTopVotedDomains, type DomainWithVotes } from "@/lib/topVotedDomains";
import { getWebsiteJsonLd, getItemListJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";
import { formatCount } from "@/lib/format";
import { LISTING_FEE_LABEL, VOTE_FEE_LABEL } from "@/lib/fees";

const TRENDING_COUNT = 3;

export const metadata = {
  alternates: { canonical: "https://kaspadomains.com" },
  title: "KaspaDomains — Premium .kas Domains, Organized by Category",
  description:
    `List your .kas domain for ${LISTING_FEE_LABEL}. Get placed in a category, add your X account and links, and build your Kaspa-native identity.`,
  openGraph: {
    title: "KaspaDomains — Premium .kas Domains, Organized by Category",
    description:
      "Showcase the .kas domain you already own, organized by category, with your own X account and links attached.",
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
    title: "KaspaDomains — Premium .kas Domains, Organized by Category",
    description:
      "List your .kas domain, get placed in a category, and get discovered by the Kaspa community.",
    image: "/og-image.png",
  },
};

export default async function Home() {
  // Both of these are loaded as "the answer, or the fact that there isn't one".
  //
  // They used to fall back to an empty value on failure, and because this is the
  // homepage, that made an outage look like an empty directory: an unreachable
  // database rendered "No domains listed yet -- be the first" to every visitor,
  // and a failed manifest rendered "Categories are loading..." forever, on a
  // server-rendered page where nothing was ever going to load. See MIND.md #2
  // and #3.
  let categoriesData: CategoryManifest | null = null;
  try {
    categoriesData = await loadCategoriesManifestOnce();
  } catch (e) {
    console.error("Failed to load categories manifest", e);
  }

  let trendingDomains: DomainWithVotes[] | null = null;
  try {
    trendingDomains = await loadTopVotedDomains(TRENDING_COUNT);
  } catch (e) {
    console.error("Failed to load trending domains", e);
  }

  const nonce = (await headers()).get("x-csp-nonce") || undefined;
  const itemListJsonLd = await getItemListJsonLd();
  // Dropped entirely when the list could not be read -- an empty ItemList is a
  // claim that the directory is empty, and this is markup search engines cache.
  const jsonLd = [getWebsiteJsonLd(), ...(itemListJsonLd ? [itemListJsonLd] : [])];

  return (
    <main className="space-y-28 bg-[#0E1E25] text-gray-100 min-h-screen">
      <JsonLd json={jsonLd} nonce={nonce} />
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#00AEEF] to-[#0E1E25] py-28 text-center px-6 md:px-8">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-snug mb-6">
          Own the Future of <span className="text-yellow-400">.kas</span> Domains
        </h1>
        <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8 text-white/90">
          Secure your premium .kas domain for a one-time {LISTING_FEE_LABEL} fee. Get placed in a category,
          attach your X account and links, and showcase your Kaspa identity.
        </p>
        <Link
          href="/list-domain"
          className="inline-block bg-yellow-400 text-[#0E1E25] px-10 py-4 rounded-full font-semibold text-lg shadow-lg hover:bg-yellow-300 transition"
        >
          🚀 List Your Domain Today
        </Link>
      </section>

      {/* Trending Domains */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-10 text-center text-white">
          Trending .kas Domains
        </h2>
        {trendingDomains === null ? (
          <p className="text-center text-amber-200">
            We couldn&apos;t load trending domains just now &mdash; this is a problem on our
            side, not an empty directory. Please try again shortly.
          </p>
        ) : trendingDomains.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trendingDomains.map((domain) => (
              <article
                key={domain.name}
                className="bg-[#121E28] p-6 rounded-2xl shadow-md hover:shadow-xl transition transform hover:-translate-y-1"
              >
                <h3 className="text-xl font-semibold text-white mb-2">{domain.name}</h3>
                <p className="text-sm text-gray-400 mb-1">
                  🔥 {formatCount(domain.votes)} vote{domain.votes === 1 ? "" : "s"}
                </p>
                <p className="text-sm text-gray-500">{LISTING_FEE_LABEL} to list</p>
                <Link
                  href={domainProfilePath(domain.name) ?? "/domains"}
                  className="text-yellow-400 underline text-sm mt-3 inline-block hover:text-yellow-300"
                >
                  View Domain →
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400">
            No domains listed yet —{" "}
            <Link href="/list-domain" className="text-yellow-400 underline hover:text-yellow-300">
              be the first
            </Link>
            .
          </p>
        )}
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-12 text-center text-white">
          Explore by Category
        </h2>
        {categoriesData === null ? (
          <p className="text-center text-amber-200">
            We couldn&apos;t load the categories just now. Please try again shortly.
          </p>
        ) : Object.keys(categoriesData).length > 0 ? (
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
          <p className="text-center text-gray-400">No categories yet.</p>
        )}
      </section>

      {/* Explainer */}
      <section className="max-w-4xl mx-auto text-center px-6 md:px-8 pb-28">
        <h2 className="text-3xl font-bold mb-6 text-white">How It Works</h2>
        <div className="text-lg text-gray-300 leading-relaxed space-y-6 mb-12">
          <p>
            <strong>1. List your domain:</strong> Connect Kasware, prove you hold the name on
            KNS, and add it to the KaspaDomains index. Listing costs a one-time <strong>{LISTING_FEE_LABEL}</strong>, paid from your
            Kasware wallet.
          </p>
          <p>
            <strong>2. Pick a category:</strong> Every listing must belong to at least one category —
            DeFi, gaming, brandable, and more — so the community can actually find it.
          </p>
          <p>
            <strong>3. Add your resources:</strong> Attach your X (Twitter) account and links to your
            domain&apos;s profile so visitors can find you everywhere.
          </p>
          <p>
            <strong>4. Get voted on:</strong> The community can support your domain to boost its
            visibility and ranking. Each vote costs <strong>{VOTE_FEE_LABEL}</strong>, one per wallet.
          </p>
          <p>
            <strong>5. You keep the name either way:</strong> your <span className="whitespace-nowrap">.kas</span> domain
            lives on KNS and stays yours — KaspaDomains only makes it findable. Listings are
            currently held in our own index rather than on-chain, so treat a listing as a
            profile we maintain, not an immutable record.
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
