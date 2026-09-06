'use client';

import React from 'react';
import PickDomainModal from '@/components/PickDomainModal';
import { useOwnedDomains } from '@/hooks/kns/api/useOwnedDomains';
import { useWalletContext } from '@/context/WalletContext';

export default function ListDomainPage() {
  const { kasware } = useWalletContext();

  const isKaspaConnected = kasware.status === 'connected';
  const kaspaAccount = kasware.account;

  const {
    data: domainData,
    isLoading: domainsLoading,
    error: domainsError,
  } = useOwnedDomains(kaspaAccount);

  const ownedDomains = domainData?.domains ?? [];

  // Kasware (L1) is the only wallet involved — it holds the key that owns the
  // domain on KNS and signs the listing request.
  const shouldShowConnectPrompt = !isKaspaConnected;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
      {/* Header */}
      <header className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold text-white">List Your .kas Domain</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Showcase your Kaspa identity. A listed domain gets a profile page, a place in the
          categories you choose, and visibility in search.
        </p>
      </header>

      {/* Wallets Not Connected */}
      {shouldShowConnectPrompt ? (
        <section className="rounded-3xl border border-[#1e2d38] bg-gradient-to-br from-[#121E28] to-[#0E1E25] p-8 md:p-10 shadow-xl text-yellow-400 font-semibold text-center">
          Please connect your Kasware wallet in the header to list domains.
          <div className="mt-4">
            <button
              className="underline text-sm text-yellow-300"
              onClick={() => {
                kasware.connect();
              }}
            >
              Retry connecting wallet
            </button>
          </div>
        </section>
      ) : (
        // Domain Listing Section
        <section className="relative rounded-3xl border border-[#1e2d38] bg-gradient-to-br from-[#121E28] to-[#0E1E25] p-8 md:p-10 shadow-xl text-gray-200">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Listing Benefits</h2>
            <p className="text-gray-300 leading-relaxed">
              Listing your domain costs a one-time{' '}
              <span className="font-semibold text-yellow-400">200 KAS</span>. No renewals, no subscriptions. You&apos;ll be asked to sign a message so we can
              check the request came from your wallet — signing is free and moves no funds.
            </p>

            <div className="bg-[#101A23] p-5 rounded-xl border border-[#1f2c38]">
              <h3 className="text-white font-medium mb-3">Includes:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Ownership checked against KNS when you list, and on every later edit</li>
                <li>A profile page with your own links, editable any time, free</li>
                <li>Placement in up to six categories, changeable later, free</li>
                <li>Community voting, and a place in the top-voted ranking</li>
                <li>One-time 200 KAS fee — no renewals or subscriptions</li>
              </ul>
            </div>

            <p className="text-sm text-gray-400">
              * You must own the domain on <strong>KNS</strong>, and sign with the same Kasware
              wallet that holds it. We read the owner from KNS ourselves — you cannot list a
              domain you do not own.
            </p>

            {/* Domain Picker Section */}
            {domainsLoading ? (
              <p className="text-white">Loading your domains…</p>
            ) : domainsError ? (
              <p className="text-red-400">Error loading domains: {domainsError.message}</p>
            ) : ownedDomains.length === 0 ? (
              <p className="text-white">You don’t own any .kas domains.</p>
            ) : (
              <PickDomainModal domains={ownedDomains} kaspaAccount={kaspaAccount} />
            )}

            {/* Wallet Errors */}
            {kasware.error && (
              <p className="text-red-400 text-sm mt-4">{kasware.error}</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
