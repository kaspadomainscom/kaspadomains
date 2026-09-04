// src/app/learn/page.tsx

export const metadata = {
  title: "Learn | KaspaDomains",
  description:
    "How KaspaDomains works: list your .kas domain, place it in a category, add your resources, and get discovered.",
};

export default function Learn() {
  return (
    <div className="min-h-screen bg-[#0b1e1d] text-gray-100 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-12">

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
            <li>Connect your Kasware wallet (proves KNS ownership) and MetaMask (for the Kasplex transaction)</li>
            <li>Pick a verified <code className="text-kaspaMint">.kas</code> domain you own</li>
            <li>Choose at least one category so your domain can be found</li>
            <li>Pay a one-time <span className="text-kaspaMint font-semibold">420 KAS</span> listing fee — no renewals, ever</li>
            <li>Add your X account and other links to your domain&apos;s profile</li>
          </ul>
        </section>

        {/* Categories */}
        <section className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]">
          <h2 className="text-4xl font-bold text-white mb-4">Categories</h2>
          <p className="text-gray-300 leading-relaxed">
            Every listed domain belongs to at least one category — DeFi, gaming, brandable,
            business, and more. Categories are how the community browses and discovers
            domains, so picking the right one for your domain matters.
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
            Anyone can support a listed domain for <span className="text-kaspaMint font-semibold">6 KAS</span> per
            vote. Votes raise a domain&apos;s ranking and visibility across the site,
            surfacing the domains the community values most.
          </p>
        </section>

      </div>
    </div>
  );
}
