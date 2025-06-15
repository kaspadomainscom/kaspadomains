import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";

export const metadata = {
  title: "KaspaDomains — Premium .kas Domains for the Kaspa Ecosystem",
  description:
    "Claim your identity on Kaspa. Register your .kas name for a one-time fee of 287 KAS and get permanent visibility across the ecosystem. Discover and list premium KNS domains now.",
  openGraph: {
    title: "KaspaDomains — Premium .kas Domains for the Kaspa Ecosystem",
    description:
      "Explore and register premium .kas domains. KaspaDomains gives you a lifetime identity in the Kaspa network for only 287 KAS.",
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

export default async function Home() {
  const recentDomains = Object.values(categoriesData)
    .flatMap((cat) => cat.domains)
    .filter((d) => d.listed)
    .slice(0, 6);

  return (
    <main className="space-y-28 bg-[#0E1E25] text-gray-100 min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#00AEEF] to-[#0E1E25] py-28 text-center px-6 md:px-8">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-snug mb-4">
          Own Your Digital Identity with <span className="text-yellow-400">.kas</span>
        </h1>
        <p className="text-lg md:text-xl max-w-3xl mx-auto mb-6 text-white/90">
          KaspaDomains is the gateway to trusted <strong>.kas</strong> identities.
          Get discovered by builders, creators, and Kaspa-native apps.
        </p>
        <p className="text-md md:text-lg max-w-2xl mx-auto mb-10 text-white/60">
          Register your verified domain for just <strong>287 KAS</strong> — permanent visibility, lifetime presence.
        </p>
        <Link
          href="/list-domain"
          className="inline-block bg-yellow-400 text-[#0E1E25] px-8 py-3 rounded-full font-semibold shadow-lg hover:bg-yellow-300 transition"
        >
          List Your Domain
        </Link>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-12 text-center text-white">
          Browse by Category
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(categoriesData).map(([key, { title, domains }]) => (
            <Link
              key={key}
              href={`/domains/categories/category/${key}`}
              className="block bg-[#121E28] p-6 rounded-2xl shadow-sm hover:shadow-lg hover:bg-[#1C2B37] transition"
              aria-label={`View category ${title}`}
            >
              <h3 className="text-xl font-semibold mb-1 text-white">{title}</h3>
              <p className="text-sm text-gray-400">{domains.length} domains listed</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recently Indexed */}
      {recentDomains.length > 0 && (
        <section className="bg-[#101C26] py-24 text-center px-6 md:px-8">
          <h2 className="text-3xl font-bold mb-10 text-white">
            Recently Indexed Domains
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
            {recentDomains.map((domain, i) => (
              <article
                key={`${domain.name}-${i}`}
                className="bg-[#121E28] p-5 rounded-2xl shadow-sm hover:shadow-md transition text-left"
              >
                <h3 className="text-lg font-semibold text-white mb-1">
                  {domain.name}
                </h3>
                <p className="text-sm text-gray-400 mb-2">
                  Price: {domain.price ?? "N/A"} KAS
                </p>
                {domain.kaspaLink && (
                  <a
                    href={domain.kaspaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 underline text-sm"
                  >
                    View on Kaspa Explorer
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Why List Section */}
      <section className="max-w-4xl mx-auto text-center px-6 md:px-8 pb-28">
        <h2 className="text-3xl font-bold mb-6 text-white">
          Why Use KaspaDomains?
        </h2>
        <div className="text-lg text-gray-300 leading-relaxed space-y-6 mb-10">
          <p>
            KaspaDomains is a curated index for the best <strong>.kas</strong> domains — hand-selected for brandability, trust, and long-term value.
          </p>
          <p>
            Every listing gets a personalized page with your social links, Kaspa address, and bio. It’s more than a domain — it’s your proof-of-presence in the Kaspa ecosystem.
          </p>
          <p>
            Pay once (287 KAS) and join the fastest-growing digital identity layer on Kaspa.
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
