// src/app/page.tsx
import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";
import { getMostLikedPosts, getMostLikedDomain, getActivityFeed } from "@/lib/data"; // assume these fetch from API or DB

export const metadata = {
  title: "KaspaDomains — Your .kas Digital Identity on Kaspa",
  description:
    "List and showcase your .kas domain on KaspaDomains for a one-time fee of 287 KAS. Get your own page, post on-chain content, and earn KAS through likes and comments.",
  openGraph: {
    title: "KaspaDomains — Premium .kas Domains for the Kaspa Ecosystem",
    description:
      "Showcase your .kas domain. Earn KAS through posts, likes, and comments. Join the Kaspa digital identity layer.",
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
  const mostLikedPosts = await getMostLikedPosts(7); // last 7 days
  const mostLikedDomain = await getMostLikedDomain();
  const activityFeed = await getActivityFeed(1); // last 24 hours

  return (
    <main className="space-y-28 bg-[#0E1E25] text-gray-100 min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#00AEEF] to-[#0E1E25] py-28 text-center px-6 md:px-8">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-snug mb-4">
          Your <span className="text-yellow-400">.kas</span> Identity on Kaspa
        </h1>
        <p className="text-lg md:text-xl max-w-3xl mx-auto mb-6 text-white/90">
          Pay once (287 KAS) — get a domain page, on-chain posts, and earn KAS from likes and comments.
        </p>
        <Link
          href="/list-domain"
          className="inline-block bg-yellow-400 text-[#0E1E25] px-8 py-3 rounded-full font-semibold shadow-lg hover:bg-yellow-300 transition"
        >
          List Your Domain
        </Link>
      </section>

      {/* Featured Posts */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-10 text-center text-white">
          Most Liked Posts (Last 7 Days)
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mostLikedPosts.map((post) => (
            <article key={post.id} className="bg-[#121E28] p-5 rounded-2xl shadow-sm hover:shadow-md transition">
              <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
              <p className="text-sm text-gray-400 mb-1">
                {post.likes} likes · {post.comments} comments
              </p>
              <Link href={`/domain/${post.domainName}`} className="text-yellow-400 underline text-sm">
                View Domain
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Most Liked Domain Ever */}
      {mostLikedDomain && (
        <section className="bg-[#101C26] py-24 text-center px-6 md:px-8">
          <h2 className="text-3xl font-bold mb-6 text-white">Most Liked Domain Ever</h2>
          <div className="bg-[#121E28] p-8 rounded-2xl shadow-lg max-w-xl mx-auto">
            <h3 className="text-2xl font-bold mb-2">{mostLikedDomain.name}</h3>
            <p className="text-gray-400 mb-4">{mostLikedDomain.likes} total likes</p>
            <Link href={`/domain/${mostLikedDomain.name}`} className="text-yellow-400 underline">
              Visit Domain Page
            </Link>
          </div>
        </section>
      )}

      {/* Activity Feed */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-10 text-center text-white">
          Most Liked Posts (Last 24 Hours)
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activityFeed.map((post) => (
            <article key={post.id} className="bg-[#121E28] p-5 rounded-2xl shadow-sm hover:shadow-md transition">
              <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
              <p className="text-sm text-gray-400 mb-1">
                {post.likes} likes · {post.comments} comments
              </p>
              <Link href={`/domain/${post.domainName}`} className="text-yellow-400 underline text-sm">
                View Domain
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl font-bold mb-12 text-center text-white">Browse Categories</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(categoriesData).map(([key, { title, domains }]) => (
            <Link
              key={key}
              href={`/domains/categories/category/${key}`}
              className="block bg-[#121E28] p-6 rounded-2xl shadow-sm hover:shadow-lg hover:bg-[#1C2B37] transition"
            >
              <h3 className="text-xl font-semibold mb-1 text-white">{title}</h3>
              <p className="text-sm text-gray-400">{domains.length} domains listed</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Why KaspaDomains */}
      <section className="max-w-4xl mx-auto text-center px-6 md:px-8 pb-28">
        <h2 className="text-3xl font-bold mb-6 text-white">Why List Your .kas?</h2>
        <div className="text-lg text-gray-300 leading-relaxed space-y-6 mb-10">
          <p>
            Each domain gets its own page for posts, likes, and comments. Build your Kaspa presence.
          </p>
          <p>
            Earn KAS when users like or comment on your domain or posts: 1 KAS to you, 1 KAS to KaspaDomains, 0.5 KAS to a 7-year domain vault.
          </p>
          <p>
            Be part of a trusted, growing network of Kaspa-native identities.
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
