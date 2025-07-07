// src/app/list-domain/page.tsx
'use client';

import React from 'react';
import PickDomainModal from '@/components/PickDomainModal';
import { useWallet } from '@/hooks/wallet/useWallet';
import { useOwnedDomains } from '@/hooks/kns/api/useOwnedDomains';

export default function ListDomainPage() {
  // 🔐 Wallet state
  const {
    account,
    connect,
    status: walletStatus,
    error: walletError,
    walletType,
  } = useWallet();

  // 🧠 Fetch domains owned by this address
  const {
    data: domainData,
    isLoading: domainsLoading,
    error: domainsError,
  } = useOwnedDomains(account);

  const ownedDomains = domainData?.domains;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
      {/* Header */}
      <header className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold text-white">List Your .kas Domain</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Showcase your Kaspa identity. Verified domains gain exposure in search, curated drops, and profile pages.
        </p>
      </header>

      {/* Listing Details */}
      <section className="relative rounded-3xl border border-[#1e2d38] bg-gradient-to-br from-[#121E28] to-[#0E1E25] p-8 md:p-10 shadow-xl text-gray-200">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Listing Benefits</h2>
          <p className="text-gray-300 leading-relaxed">
            Listing your domain costs a one-time fee of{' '}
            <span className="font-semibold text-yellow-400">420 KAS</span>. No renewals. No subscriptions. Your domain is permanently listed and promoted on the network.
          </p>

          <div className="bg-[#101A23] p-5 rounded-xl border border-[#1f2c38]">
            <h3 className="text-white font-medium mb-3">Includes:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Verified ownership & authenticity badge</li>
              <li>Dedicated profile with bio, links, image, and categories</li>
              <li>Featured in categories, search, and premium drops</li>
              <li>One-time payment for lifetime exposure</li>
            </ul>
          </div>

          <p className="text-sm text-gray-400">
            * You must own the domain on the <strong>KNS</strong> contract and be connected with <strong>Kasware</strong> (Kaspa wallet) on Kasplex Testnet.
          </p>

          {/* Wallet Connect Logic */}
          {!account || walletType !== 'kasware' ? (
            <button
              onClick={() => connect('kasware')}
              disabled={walletStatus === 'connecting'}
              className="bg-[#5183f5] hover:bg-[#4169c9] text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {walletStatus === 'connecting' ? 'Connecting…' : 'Connect Kasware'}
            </button>
          ) : domainsLoading ? (
            <p className="text-white">Loading your domains…</p>
          ) : domainsError ? (
            <p className="text-red-400">Error loading domains: {domainsError.message}</p>
          ) : !ownedDomains || ownedDomains.length === 0 ? (
            <p className="text-white">You don’t own any .kas domains.</p>
          ) : (
            <PickDomainModal domains={ownedDomains} />
          )}

          {/* Error Message */}
          {walletError && (
            <p className="text-red-400 text-sm mt-2">{walletError}</p>
          )}
        </div>
      </section>
    </main>
  );
}
