'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const sections = [
  { id: 'what', label: 'What is KaspaDomains?' },
  { id: 'how', label: 'How It Works' },
  { id: 'kns', label: 'KNS Verification' },
  { id: 'details', label: 'Listing Details' },
  { id: 'rules', label: 'Listing Rules' },
  { id: 'resources', label: 'Domain Resources' },
  { id: 'benefits', label: 'Why List Your Domain?' },
  { id: 'voting', label: 'Community Voting' },
  { id: 'notmarketplace', label: 'We Are Not a Marketplace' },
  { id: 'start', label: 'Get Started' },
];

export default function Docs() {
  const [activeId, setActiveId] = useState(sections[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Scroll-spy: highlight whichever section is currently in view
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1e1d] text-gray-100 px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold text-white mb-8">KaspaDomains Docs</h1>
      </div>
      <div className="max-w-6xl mx-auto md:grid md:grid-cols-[220px_1fr] md:gap-10">

        {/* Sidebar navigation */}
        <nav className="mb-8 md:mb-0 md:sticky md:top-24 md:self-start bg-[#142f2c] rounded-2xl shadow p-4 md:p-5">
          <h2 className="text-white text-sm font-semibold uppercase tracking-wide mb-3">
            Docs
          </h2>
          <ul className="text-sm space-y-1">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`block px-2 py-1.5 rounded-md transition ${
                    activeId === s.id
                      ? 'bg-kaspaMint text-[#0F2F2E] font-medium'
                      : 'text-gray-300 hover:text-white hover:bg-[#1d3b39]'
                  }`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="space-y-8">
          <Section id="what" title="What is KaspaDomains?">
            <p>
              KaspaDomains is a discovery registry for verified KNS (.kas) domains. Any domain
              holder can list their domain for a one-time <strong>200 KAS</strong> fee, to get a public
              profile, a category placement, and search visibility.
            </p>
            <p className="text-gray-400 text-sm">
              No marketplace, no intermediaries — only you control your domain.
            </p>
          </Section>

          <Section id="how" title="How It Works">
            <ul>
              <li>Own a verified KNS domain (e.g. <code>player456.kas</code>)</li>
              <li>A one-time <strong>200 KAS</strong> listing fee — no renewals</li>
              <li>Sign a message so we can confirm the request came from your wallet</li>
              <li>Your listing gets a public profile, category placement and search visibility</li>
              <li>You retain full ownership — we don&apos;t sell domains</li>
            </ul>
          </Section>

          <Section id="where-data-lives" title="Where your listing is stored">
            <p>
              Your <code>.kas</code> name itself lives on KNS (Kaspa L1) and is yours regardless
              of anything here. The <em>listing</em> — its category, profile and links — is
              currently held in the KaspaDomains index, not written to a smart contract.
            </p>
            <p className="text-gray-400 text-sm">
              That means a listing is a profile we maintain rather than an immutable on-chain
              record: it can be corrected or removed, and it is not a claim on the name itself.
              We say so plainly because earlier versions of this page promised permanence we do
              not currently provide.
            </p>
          </Section>

          <Section id="kns" title="KNS Verification">
            <p>We use the official KNS smart contracts to ensure domain legitimacy:</p>
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
              <li>The owner is read from KNS when you list</li>
              <li>Each domain can only be listed once</li>
              <li>Must belong to at least one category</li>
              <li>Categories and resources can be updated by the wallet that listed it</li>
            </ul>
          </Section>

          <Section id="resources" title="Domain Resources">
            <p>
              Once listed, you can attach resources to your domain&apos;s profile page —
              your <strong>X (Twitter) account</strong> and any links you want visitors to see
              (website, Discord, docs, whatever represents you). This is how people who find
              your domain through search or category browsing actually reach you.
            </p>
          </Section>

          <Section id="benefits" title="Why List Your Domain?">
            <ul>
              <li>
                Get indexed on KaspaDomains, organized by{" "}
                <Link href="/domains/categories" className="text-kaspaMint hover:underline">
                  category
                </Link>
              </li>
              <li>Attach an X account and links so people can find you</li>
              <li>
                Participate in community voting and{" "}
                <Link href="/domains/top-voted" className="text-kaspaMint hover:underline">
                  rankings
                </Link>
              </li>
              <li>Build brand identity across the Kaspa ecosystem</li>
            </ul>
          </Section>

          <Section id="voting" title="Community Voting">
            <p>
              Anyone can support a listed domain for <strong>1 KAS</strong> per vote, one per
              wallet. Votes raise a domain&apos;s ranking and visibility across the site.
            </p>
            <p className="text-gray-400 text-sm">Voting empowers domain owners and strengthens community engagement.</p>
          </Section>

          <Section id="notmarketplace" title="We Are Not a Marketplace">
            <p>
              KaspaDomains does not sell domains. We&apos;re a registry — not a reseller. Every listing is owned and controlled by the original wallet that created it. There&apos;s no gatekeeping, no central control.
            </p>
          </Section>

          <Section id="start" title="Get Started">
            <p>
              Ready to list your domain? Connect your wallet, verify your KNS domain, and sign a
              message to confirm the request is yours, then pay the one-time 200 KAS fee from
              your wallet. Signing itself is free and moves no funds.
            </p>
            <Link
              href="/list-domain"
              className="inline-block bg-kaspaMint text-[#0F2F2E] px-6 py-2.5 rounded-full font-semibold hover:bg-[#3DFDAD]/90 transition mt-2"
            >
              List Your Domain
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              Need help? Join the KaspaDomains community on X or Discord and help shape the future of identity on Kaspa.
            </p>
          </Section>
        </div>

      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-[#122c2a] p-4 md:p-8 rounded-2xl shadow-md space-y-4 scroll-mt-24">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="text-gray-300 text-sm md:text-base space-y-2">{children}</div>
    </section>
  );
}
