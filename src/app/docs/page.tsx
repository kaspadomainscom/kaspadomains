'use client';

import { useEffect } from 'react';

const sections = [
  { id: 'what', label: 'What is KaspaDomains?' },
  { id: 'how', label: 'How It Works' },
  { id: 'kns', label: 'KNS Verification' },
  { id: 'details', label: 'Listing Details' },
  { id: 'rules', label: 'Listing Rules' },
  { id: 'benefits', label: 'Why List Your Domain?' },
  { id: 'distribution', label: 'KAS Distribution' },
  { id: 'voting', label: 'Voting & KDC Rewards' },
  { id: 'notmarketplace', label: 'We Are Not a Marketplace' },
  { id: 'start', label: 'Get Started' },
];

export default function Docs() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1e1d] text-gray-100 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-12">

        {/* Table of Contents */}
        <nav className="bg-[#142f2c] rounded-2xl shadow p-4 md:p-6 mb-8">
          <h2 className="text-white text-lg font-semibold mb-2">Docs Navigation</h2>
          <ul className="text-sm space-y-1 md:flex md:flex-wrap md:gap-4 md:space-y-0">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-gray-300 hover:text-white underline underline-offset-2"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sections */}
        <Section id="what" title="What is KaspaDomains?">
          <p>
            KaspaDomains is an on-chain registry for verified KNS (.kas) domains. Any domain holder can permanently list their domain by paying a one-time fee of <strong>420 KAS</strong>.
          </p>
          <p className="text-gray-400 text-sm">
            No marketplace, no intermediaries — only you control your domain.
          </p>
        </Section>

        <Section id="how" title="How It Works">
          <ul>
            <li>Own a verified KNS domain (e.g. <code>player456.kas</code>)</li>
            <li>Pay a one-time <strong>420 KAS</strong> fee to list forever</li>
            <li>Your domain is assigned a unique ID (0–9999)</li>
            <li>Listings are immutable, secure, and on-chain</li>
            <li>You retain full ownership — we don&apos;t sell domains</li>
          </ul>
        </Section>

        <Section id="kns" title="KNS Verification">
          <p>We will use the official KNS smart contracts to ensure domain legitimacy:</p>
          <ul>
            <li><code>ownerOf(tokenId)</code> — to verify ownership</li>
            <li><code>isVerifiedDomain(name)</code> — to validate name</li>
            <li><code>keccak256(&quot;yourdomain.kas&quot;)</code> — for domain hashing</li>
            <li>Only real owners can list. No duplicates, no fakes.</li>
          </ul>
        </Section>

        <Section id="details" title="Listing Details">
          <ul>
            <li>Plaintext domain (e.g. <code>example.kas</code>)</li>
            <li>Hashed domain (<code>keccak256(&quot;example.kas&quot;)</code>)</li>
            <li>Wallet address of the domain owner</li>
            <li>Unique ID (0–9999) tied to listing</li>
          </ul>
        </Section>

        <Section id="rules" title="Listing Rules">
          <ul>
            <li>Must be a verified KNS domain</li>
            <li>You must be the on-chain owner</li>
            <li>Each domain can only be listed once</li>
            <li>Listings are permanent — no edits or removals</li>
          </ul>
        </Section>

        <Section id="benefits" title="Why List Your Domain?">
          <ul>
            <li>Get permanently indexed on KaspaDomains</li>
            <li>Qualify for KDC (KaspaDomains Community) rewards</li>
            <li>Participate in voting, rankings, and airdrops</li>
            <li>Build brand identity across the Kaspa ecosystem</li>
          </ul>
        </Section>

        <Section id="distribution" title="KAS Distribution">
          <p>Each 420 KAS listing fee is split evenly:</p>
          <ul>
            <li><strong>50%</strong> — Mints KDC tokens for community incentives</li>
            <li><strong>50%</strong> — Funds the ecosystem: liquidity, dev, and growth</li>
          </ul>
        </Section>

        <Section id="voting" title="Voting & KDC Rewards">
          <p>
            Users can vote on domains using <strong>24 KAS</strong> per vote. In return:
          </p>
          <ul>
            <li>Voter gets KDC tokens minted to their wallet</li>
            <li>12 KAS goes to the domain owner</li>
            <li>12 KAS goes to the treasury</li>
          </ul>
          <p className="text-gray-400 text-sm">Voting empowers domain owners and strengthens community engagement.</p>
        </Section>

        <Section id="notmarketplace" title="We Are Not a Marketplace">
          <p>
            KaspaDomains does not sell domains. We&apos;re a registry — not a reseller. Every listing is owned and controlled by the original wallet that created it. There&apos;s no gatekeeping, no central control.
          </p>
        </Section>

        <Section id="start" title="Get Started">
          <p>
            Ready to list your domain? Connect your wallet, verify your KNS domain, and pay the 420 KAS fee. Your domain will be recorded on-chain — forever.
          </p>
          <p className="text-sm text-gray-500">
            Need help? Join the KaspaDomains community on X or Discord and help shape the future of identity on Kaspa.
          </p>
        </Section>

      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-[#122c2a] p-4 md:p-8 rounded-2xl shadow-md space-y-4">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="text-gray-300 text-sm md:text-base space-y-2">{children}</div>
    </section>
  );
}
