// src/app/terms/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { LISTING_FEE_SOMPI, VOTE_FEE_SOMPI, formatKas } from '@/lib/fees';

export const metadata: Metadata = {
  title: 'Terms | KaspaDomains',
  description:
    'The rules of using KaspaDomains: fees, ownership, what is guaranteed and what is not.',
  alternates: { canonical: 'https://kaspadomains.com/terms' },
};

/**
 * Fees are read from `src/lib/fees.ts` rather than typed in as prose.
 *
 * A terms page that states a price the software does not charge is worse than
 * no page at all, and hard-coded numbers drift the moment the fee changes.
 */

const LAST_UPDATED = '5 September 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-gray-300">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-gray-200">
      <h1 className="text-3xl font-bold text-white">Terms</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated {LAST_UPDATED}</p>

      <p className="mt-6 text-gray-300">
        KaspaDomains is a public directory of <code>.kas</code> domains. It does not sell
        domains, hold them, or take custody of anything. Registration and ownership happen
        on KNS; this site is a place to be found.
      </p>

      <Section title="What you are paying for">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>{formatKas(LISTING_FEE_SOMPI)} to list a domain.</strong> This creates a
            public entry for a domain you own, in the categories you choose, with a profile
            page you can edit.
          </li>
          <li>
            <strong>{formatKas(VOTE_FEE_SOMPI)} to cast a vote.</strong> One vote per wallet
            per domain. Votes drive the ranking on the top-voted pages.
          </li>
        </ul>
        <p>
          Editing a listing you already paid for — its links, its categories — is free.
        </p>
        <p>
          Fees are paid in KAS on the Kaspa blockchain, directly from your wallet to the
          address shown on the{' '}
          <Link href="/status" className="text-teal-300 hover:text-teal-200">
            status page
          </Link>
          . Always confirm the destination in your wallet before approving.
        </p>
      </Section>

      <Section title="Payments are final">
        <p>
          Kaspa transactions cannot be reversed, by us or by anyone. Once a payment is
          confirmed on the network the KAS is gone from your wallet regardless of what
          happens next.
        </p>
        <p>
          The site tries hard not to take money for nothing: ownership is checked before a
          fee is requested, a fee transaction can only ever be spent on one action, and a
          failed write releases the payment so you can retry with the same transaction.
        </p>
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-amber-200">
          It is still possible for a payment to be made and the action to fail — for
          example if the server is misconfigured at that moment. If that happens, contact
          the operator. Whether a refund is offered, and how, is an operator decision that
          is not yet settled; do not assume one.
        </p>
      </Section>

      <Section title="Only the owner can change a listing">
        <p>
          Every write — listing, editing links, changing categories — requires a signature
          from the wallet that owns the domain, and ownership is re-read from KNS on each
          request rather than from anything stored here.
        </p>
        <p>
          The practical consequence: if a domain is transferred on KNS, control of its
          listing moves with it immediately. The new owner can edit it; the previous owner
          cannot, and does not get a refund for the listing fee they paid.
        </p>
      </Section>

      <Section title="What you post">
        <p>
          You are responsible for the links and text you attach to a domain. Do not post
          anything unlawful, malicious, or designed to deceive — phishing links in
          particular.
        </p>
        <p>
          Listings that do this may be removed or hidden without a refund. Paying a fee
          does not buy immunity from moderation.
        </p>
      </Section>

      <Section title="Votes">
        <p>
          A vote is an opinion, not an endorsement by this site, and the rankings are
          nothing more than a count of paid votes. They are not a valuation, a
          recommendation, or a signal of quality. Treat them accordingly.
        </p>
      </Section>

      <Section title="No warranty, and nothing here is advice">
        <p>
          The site is provided as-is. It depends on third-party services — KNS, the Kaspa
          network, the database host — any of which can be slow, wrong, or unavailable,
          and none of which are under our control.
        </p>
        <p>
          Nothing on this site is financial or investment advice. Domain names are not an
          investment product, and a high vote count says nothing about what a domain is
          worth.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          This page lives in the site&apos;s source repository, so every change is part of
          the public commit history. Continuing to use the site after a change means
          accepting it.
        </p>
      </Section>

      <div className="mt-12 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
        <p className="font-medium">This page has not been reviewed by a lawyer.</p>
        <p className="mt-1 text-amber-200/80">
          It describes how the software actually behaves, written from its source code, and
          is deliberately silent where a real decision has not been made — refunds, the
          operating entity, and the governing jurisdiction. Those need to be settled and
          written in before this counts as a terms of service.
        </p>
      </div>

      <p className="mt-8 text-sm text-gray-500">
        See also the{' '}
        <Link href="/privacy" className="text-teal-300 hover:text-teal-200">
          privacy page
        </Link>
        .
      </p>
    </main>
  );
}
