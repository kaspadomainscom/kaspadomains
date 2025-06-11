// src/app/list-domain/page.tsx
'use client';

import PickDomainModal from '@/components/PickDomainModal';

export default function ListDomainPage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
      {/* Page Header */}
      <header className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold text-white">Discover .kas Domains</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Explore domains listed by the Kaspa community. Find identities, ideas, and initiatives built on the KNS infrastructure.
        </p>
      </header>

      {/* Listing CTA Section */}
      <section className="relative rounded-3xl border border-[#1e2d38] bg-gradient-to-br from-[#121E28] to-[#0E1E25] p-8 md:p-10 shadow-xl text-gray-200">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">List Your .kas Domain</h2>
          <p className="text-gray-300 leading-relaxed">
            Listing your domain costs a one-time fee of <span className="font-semibold text-yellow-400">287 KAS</span>. 
            Once listed, it remains permanently accessible in our directory, search, and community spotlight—no renewals required.
          </p>

          <div className="bg-[#101A23] p-5 rounded-xl border border-[#1f2c38]">
            <h3 className="text-white font-medium mb-3">Included with your listing:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Dedicated domain profile with social links and bio</li>
              <li>Verified KNS ownership and authenticity badge</li>
              <li>Featured in search, categories, and curated drops</li>
              <li>One-time fee, lifetime listing</li>
            </ul>
          </div>

          <p className="text-sm text-gray-400">
            *You must own the domain on the <strong>KNS</strong> contract and be connected to Kasplex Testnet to create a listing.
          </p>

          {/* Replace direct link with PickDomainModal */}
          <PickDomainModal />
        </div>
      </section>
    </main>
  );
}
