'use client';

import React from 'react';
import PickDomainModal from '@/components/PickDomainModal';
import { useBaseWallet } from '@/hooks/wallet/internal/useBaseWallet';
import { useOwnedDomains } from '@/hooks/kns/api/useOwnedDomains';

export default function ListDomainPage() {
  const kasware = useBaseWallet('kasware');   // Kaspa wallet - domain ownership
  const metamask = useBaseWallet('metamask'); // EVM wallet - contract interaction

  const {
    data: domainData,
    isLoading: domainsLoading,
    error: domainsError,
  } = useOwnedDomains(kasware.account);

  const ownedDomains = domainData?.domains || [];

  const showKaswareConnect = !kasware.account;
  const showMetamaskConnect = !metamask.account;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
      {/* Header */}
      <header className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold text-white">List Your .kas Domain</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Showcase your Kaspa identity. Verified domains gain exposure in search, curated drops, and profile pages.
        </p>
      </header>

      {/* Listing Section */}
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
            * You must own the domain on the <strong>KNS</strong> contract (Kasware) and list it using your EVM wallet (MetaMask).
          </p>

          {/* Wallet connection logic */}
          {showKaswareConnect ? (
            <button
              onClick={() => kasware.connect()}
              disabled={kasware.status === 'connecting'}
              className="bg-[#5183f5] hover:bg-[#4169c9] text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {kasware.status === 'connecting' ? 'Connecting Kasware…' : 'Connect Kasware'}
            </button>
          ) : domainsLoading ? (
            <p className="text-white">Loading your domains…</p>
          ) : domainsError ? (
            <p className="text-red-400">Error loading domains: {domainsError.message}</p>
          ) : ownedDomains.length === 0 ? (
            <p className="text-white">You don’t own any .kas domains.</p>
          ) : showMetamaskConnect ? (
            <button
              onClick={() => metamask.connect()}
              disabled={metamask.status === 'connecting'}
              className="bg-[#7c5cfc] hover:bg-[#684ae3] text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {metamask.status === 'connecting' ? 'Connecting MetaMask…' : 'Connect MetaMask'}
            </button>
          ) : (
            <PickDomainModal
              domains={ownedDomains}
              evmAccount={metamask.account}
              kaspaAccount={kasware.account}
            />
          )}

          {/* Wallet Errors */}
          {(kasware.error || metamask.error) && (
            <p className="text-red-400 text-sm mt-4">
              {kasware.error || metamask.error}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
