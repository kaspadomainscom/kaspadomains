// src/app/learn/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Learn | KaspaDomains",
  description:
    "How KaspaDomains works: list your .kas domain, place it in a category, add your resources, and get discovered.",
};

export default function Learn() {
  return (
    <div className="min-h-screen bg-[#0b1e1d] text-gray-100 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-12">

        <h1 className="text-4xl font-extrabold text-white text-center">
          Learn How KaspaDomains Works
        </h1>

        {/* Intro */}
        <section className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]">
          <h2 className="text-4xl font-bold text-white mb-4">What is KaspaDomains?</h2>
          <p className="text-gray-300 leading-relaxed">
            <span className="text-white font-semibold">KaspaDomains.com</span> is a registry
            and showcase for KNS <code className="text-kaspaMint">.kas</code> domains. Any
            KNS domain holder can list their name, place it in a category, and attach
            resources like an X account and links — so the domain is actually discoverable
            and reachable, not just held.
          </p>
        </section>

        {/* How it works */}
        <section className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]">
          <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Connect your Kasware wallet — it proves KNS ownership and signs the Kasplex transaction</li>
            <li>Pick a verified <code className="text-kaspaMint">.kas</code> domain you own</li>
            <li>Choose at least one category so your domain can be found</li>
            <li>Pay a one-time <span className="text-kaspaMint font-semibold">200 KAS</span> listing fee — no renewals, ever</li>
            <li>Add your X account and other links to your domain&apos;s profile</li>
          </ul>
        </section>

        {/* Categories */}
        <section className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]">
          <h2 className="text-4xl font-bold text-white mb-4">Categories</h2>
          <p className="text-gray-300 leading-relaxed">
            Every listed domain belongs to at least one category — DeFi, gaming, brandable,
            business, and more. Categories are how the community browses and discovers
            domains, so picking the right one for your domain matters. Browse the current
            list on the{" "}
            <Link href="/domains/categories" className="text-kaspaMint hover:underline">
              categories page
            </Link>
            .
          </p>
        </section>

        {/* Domain resources */}
        <section className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]">
          <h2 className="text-4xl font-bold text-white mb-4">Domain Resources</h2>
          <p className="text-gray-300 leading-relaxed">
            Once listed, attach resources to your domain&apos;s profile — your X (Twitter)
            account and any links you want visitors to see. This is what turns a listing
            into an actual point of contact for your Kaspa-native identity.
          </p>
        </section>

        {/* Voting */}
        <section className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]">
          <h2 className="text-4xl font-bold text-white mb-4">Community Voting</h2>
          <p className="text-gray-300 leading-relaxed">
            Anyone can support a listed domain for <span className="text-kaspaMint font-semibold">1 KAS</span> per vote,
            one vote per wallet. Votes raise a domain&apos;s ranking and visibility across the site,
            surfacing the domains the community values most — see who&apos;s currently
            leading on{" "}
            <Link href="/domains/top-voted" className="text-kaspaMint hover:underline">
              top voted domains
            </Link>
            .
          </p>
        </section>

        {/* CTA */}
        <section className="text-center py-6">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to list your domain?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/list-domain"
              className="inline-block bg-kaspaMint text-[#0F2F2E] px-8 py-3 rounded-full font-semibold shadow-lg hover:bg-[#3DFDAD]/90 transition"
            >
              List Your Domain
            </Link>
            <Link
              href="/domains"
              className="inline-block bg-[#1d3b39] text-gray-200 px-8 py-3 rounded-full font-semibold hover:bg-[#26504c] transition"
            >
              Browse Domains
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            More detail on ownership rules and listing requirements is in the{" "}
            <Link href="/docs" className="text-kaspaMint hover:underline">
              docs
            </Link>
            .
          </p>
        </section>

      </div>
    </div>
  );
}
