'use client';

import React from 'react';
import PickDomainModal from '@/components/PickDomainModal';
import { useWallet } from '@/hooks/wallet/useWallet';
import { useOwnedDomains } from '@/hooks/kns/api/useOwnedDomains';

export default function ListDomainPage() {
  // 1️⃣ Get the connected wallet (Kasware only)
  const {
    account,
    connect,
    status: walletStatus,
    error: walletError,
    walletType,
  } = useWallet();

  // 2️⃣ Fetch domains for that Kasware address
  const {
    data: domainData,
    isLoading: domainsLoading,
    error: domainsError,
  } = useOwnedDomains(account);

  const ownedDomains = domainData?.domains;

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
            Listing your domain costs a one-time fee of{' '}
            <span className="font-semibold text-yellow-400">287 KAS</span>. Once listed, it remains
            permanently accessible—no renewals required.
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
            *You must own the domain on the <strong>KNS</strong> contract and be connected with Kasware (Kaspa wallet) on
            the Kasplex Testnet.
          </p>

          {/* 🔗 Kasware-only connect/loading/error/domains */}
          {!account || walletType !== 'kasware' ? (
            <button
              onClick={() => connect('kasware')}
              disabled={walletStatus === 'connecting'}
              className="bg-[#5183f5] hover:bg-[#4169c9] text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {walletStatus === 'connecting' ? 'Connecting…' : 'Connect Kasware'}
            </button>
          ) : domainsLoading ? (
            <p>Loading your domains…</p>
          ) : domainsError ? (
            <p className="text-red-400">Error loading domains: {domainsError.message}</p>
          ) : !ownedDomains || ownedDomains.length === 0 ? (
            <p>You don’t own any .kas domains.</p>
          ) : (
            <PickDomainModal domains={ownedDomains} />
          )}

          {walletError && <p className="text-red-400 text-sm mt-2">{walletError}</p>}
        </div>
      </section>
    </main>
  );
}
