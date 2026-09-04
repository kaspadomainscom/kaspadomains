// src/app/business-plan/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Business Plan | KaspaDomains",
  description:
    "The logic behind KaspaDomains: a one-time on-chain listing, then SEO and additional data per domain.",
  alternates: {
    canonical: "https://kaspadomains.com/business-plan",
  },
};

export default function BusinessPlanPage() {
  return (
    <div className="min-h-screen bg-[#0b1e1d] text-gray-100 px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-12">

        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">Business Plan</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Pay once, get listed on-chain — then KaspaDomains&apos; job is SEO and additional
            data per domain: an indexed, discoverable page and resources a bare on-chain
            record can&apos;t carry.
          </p>
        </header>

        <Section title="The Problem">
          <p>
            A .kas domain on its own is an on-chain ownership record — nothing more. No SEO
            footprint, no meta tags, no structured data a search engine can read, no category,
            nothing telling a visitor who holds it or where to find them. There&apos;s no
            curated place to browse premium Kaspa-native names by niche, and no standard way to
            attach an identity — an X account, a website — to a domain.
          </p>
        </Section>

        <Section title="The Solution">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Prove ownership</strong> — connect Kasware to verify the .kas name on KNS.</li>
            <li><strong>List it</strong> — pay a one-time <strong className="text-kaspaMint">210 KAS</strong> fee via Kasware. No renewals, ever.</li>
            <li><strong>Categorize it</strong> — pick at least one category so it can actually be found.</li>
            <li><strong>Add resources</strong> — attach an X account and links to the domain&apos;s public profile.</li>
            <li><strong>Get discovered</strong> — the domain appears on its category page and in search.</li>
            <li><strong>Community voting</strong> — anyone can support a domain for 6 KAS per vote, boosting its ranking.</li>
          </ol>
          <p className="text-gray-400 text-sm mt-4">
            Hard cap: <strong className="text-white">10,000 listings, ever.</strong> Scarcity is structural, not promotional.
          </p>
        </Section>

        <Section title="Revenue Model">
          <ul className="space-y-2">
            <li>
              <strong className="text-kaspaMint">Listing fees</strong> — 210 KAS per domain,
              one-time, capped at 10,000 listings.
            </li>
            <li>
              <strong className="text-kaspaMint">Voting fees</strong> — 6 KAS per vote,
              uncapped and ongoing as long as the community keeps engaging. A portion goes to
              the domain owner, the rest funds the ecosystem.
            </li>
          </ul>
        </Section>

        <Section title="Not a Marketplace">
          <p>
            KaspaDomains does not sell, resell, or broker .kas domains, and never takes custody
            of them. Every listing is created and controlled by the wallet that owns the
            underlying KNS name. This keeps the product scoped to what it actually is: a
            discovery and identity layer on top of ownership that already exists on Kaspa L1.
          </p>
        </Section>

        <Section title="Who It's For">
          <ul className="space-y-2">
            <li>
              <strong className="text-white">.kas domain holders</strong> who want their name
              to be more than a wallet-address curiosity — projects, creators, and individuals
              building a Kaspa-native identity.
            </li>
            <li>
              <strong className="text-white">The Kaspa community</strong>, as the audience
              browsing and voting on the domains they value.
            </li>
          </ul>
        </Section>

        <Section title="Where Things Stand">
          <p>
            The full flow described above — wallet-gated listing, mandatory categories,
            resource management, community voting, category and search browsing — is live and
            working today on Kasplex testnet. See the{" "}
            <Link href="/docs" className="text-kaspaMint hover:underline">
              docs
            </Link>{" "}
            for the details, or browse{" "}
            <Link href="/domains" className="text-kaspaMint hover:underline">
              what&apos;s already listed
            </Link>
            . A mainnet launch, a formal contract security review, and continued ecosystem
            growth are the next milestones.
          </p>
        </Section>

        <section className="text-center py-4">
          <Link
            href="/list-domain"
            className="inline-block bg-kaspaMint text-[#0F2F2E] px-8 py-3 rounded-full font-semibold shadow-lg hover:bg-[#3DFDAD]/90 transition"
          >
            List Your Domain
          </Link>
        </section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39] space-y-4">
      <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
      <div className="text-gray-300 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
