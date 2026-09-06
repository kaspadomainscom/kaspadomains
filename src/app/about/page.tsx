// src/app/about/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { LISTING_FEE_SOMPI, VOTE_FEE_SOMPI, formatKas } from '@/lib/fees';

export const metadata: Metadata = {
  title: 'About | KaspaDomains',
  description:
    'What KaspaDomains is, how listings and ownership work, and where the data is stored.',
  alternates: { canonical: 'https://kaspadomains.com/about' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-gray-300">{children}</div>
    </section>
  );
}

/**
 * The "how does this work" page.
 *
 * Aimed at the two questions a visitor with a domain and a wallet actually
 * asks -- what do I get for the fee, and who can change my listing -- rather
 * than at a mission statement. It also states plainly where the data lives,
 * because "off-chain database" is exactly the sort of thing a project is
 * tempted to leave vague.
 */
export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-gray-200">
      <h1 className="text-3xl font-bold text-white">About KaspaDomains</h1>

      <p className="mt-6 text-lg text-gray-300">
        A directory of <code>.kas</code> domains: a place to list a domain you own, put a
        profile behind it, and be found by category or by how the community has voted.
      </p>

      <Section title="What it is not">
        <p>
          It is not a registrar and not a marketplace. You do not buy, sell, or register a
          domain here, and the site never takes custody of a domain or of any funds beyond
          the listing and voting fees. Registration lives with{' '}
          <a
            href="https://knsdomains.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-300 hover:text-teal-200"
          >
            KNS
          </a>
          .
        </p>
      </Section>

      <Section title="How a listing works">
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            Connect the Kasware wallet that holds the domain. Nothing else identifies you —
            there are no accounts.
          </li>
          <li>
            Pick the domain and its categories. Categories are the site&apos;s only
            navigation, so a listing with none cannot be found.
          </li>
          <li>
            Pay {formatKas(LISTING_FEE_SOMPI)} in KAS on Kaspa L1 and sign a message with
            the same wallet.
          </li>
          <li>
            The server checks three things before anything is written: that the signature
            is real, that KNS says that key owns the domain, and that the fee transaction
            was actually paid <em>by you</em>.
          </li>
        </ol>
        <p>
          Voting works the same way at {formatKas(VOTE_FEE_SOMPI)} per vote, one vote per
          wallet per domain.
        </p>
      </Section>

      <Section title="Only the owner can change anything">
        <p>
          Every write is signed by the domain&apos;s owner and checked against KNS at the
          moment of the request — not against whoever created the listing. So a domain that
          changes hands on KNS becomes editable by its new owner immediately, and stops
          being editable by the old one. There is nothing to transfer and no permission to
          revoke.
        </p>
      </Section>

      <Section title="Where the data lives">
        <p>
          Listings, votes, categories and profile links are stored in a Postgres database
          (Supabase). Ownership is not stored as an authority — it is read live from KNS
          every time it matters, so the database is a cache of it rather than a competing
          claim.
        </p>
        <p>
          Fees are on the Kaspa blockchain and are public and permanent. The site verifies
          them from the chain rather than trusting the browser.
        </p>
        <p>
          Earlier versions kept listings in smart contracts on Kasplex. Six of the eight
          contract addresses turned out to have no deployed code and the other two failed
          every call, so that path was removed entirely on 6 September 2026 rather than kept
          as a fallback that had never worked.
        </p>
      </Section>

      <Section title="Open source">
        <p>
          The site&apos;s source, its database schema and its written record of known bugs
          and gaps are all public. So is the reasoning behind the architecture — including
          the parts that are unfinished.
        </p>
        <p>
          The{' '}
          <Link href="/status" className="text-teal-300 hover:text-teal-200">
            status page
          </Link>{' '}
          reports the live health of this deployment, including anything currently broken.
        </p>
      </Section>

      <Section title="Read more">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <Link href="/learn" className="text-teal-300 hover:text-teal-200">
              Learn
            </Link>{' '}
            — what <code>.kas</code> domains are and why they matter.
          </li>
          <li>
            <Link href="/docs" className="text-teal-300 hover:text-teal-200">
              Docs
            </Link>{' '}
            — how to use the site.
          </li>
          <li>
            <Link href="/terms" className="text-teal-300 hover:text-teal-200">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-teal-300 hover:text-teal-200">
              Privacy
            </Link>
            .
          </li>
        </ul>
      </Section>
    </main>
  );
}
