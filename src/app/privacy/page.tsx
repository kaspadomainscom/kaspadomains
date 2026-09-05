// src/app/privacy/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy | KaspaDomains',
  description:
    'What KaspaDomains stores, what it does not, and which third parties see your requests.',
  alternates: { canonical: 'https://kaspadomains.com/privacy' },
};

/**
 * Written from the code, not from a template.
 *
 * Every claim on this page corresponds to something checkable in this
 * repository -- the schema in `supabase/schema.sql`, the API routes, the CSP in
 * `src/proxy.ts`. That constraint is the point: a privacy page assembled from
 * boilerplate describes an app that does not exist, and the gap between the two
 * is exactly what makes it worthless.
 *
 * It has not been reviewed by a lawyer. See the note at the foot of the page.
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

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-gray-200">
      <h1 className="text-3xl font-bold text-white">Privacy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated {LAST_UPDATED}</p>

      <p className="mt-6 text-gray-300">
        KaspaDomains has no accounts, no passwords and no sign-up. There is nothing to
        register, so there is no profile to hold. What follows is everything the site
        actually stores.
      </p>

      <Section title="What is stored">
        <p>When you list a domain, a row is created containing:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>the domain name;</li>
          <li>
            the Kaspa address that owns it, read live from KNS rather than taken from your
            browser;
          </li>
          <li>the Kaspa address that submitted the listing;</li>
          <li>
            the transaction id of the listing fee, and the amount it paid, so the same
            payment cannot be spent twice;
          </li>
          <li>the categories you chose, and any links you add to the profile;</li>
          <li>timestamps.</li>
        </ul>
        <p>When you vote, a row is created containing your Kaspa address, the domain, the
        fee transaction id and a timestamp.</p>
        <p>
          All of it is public. Listings, votes and profile links are rendered on this site
          for anyone to read — that is what listing a domain is for.
        </p>
      </Section>

      <Section title="What is not stored">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>No private keys, ever.</strong> Signing happens inside your wallet
            extension. This site receives a signature and a public key, never a key that
            can spend.
          </li>
          <li>
            <strong>No email address, name, phone number or postal address.</strong> None
            is ever requested.
          </li>
          <li>
            <strong>No analytics, no tracking pixels, no advertising.</strong> There is no
            third-party analytics script anywhere in the codebase.
          </li>
          <li>
            <strong>No cookies.</strong> The only browser storage used is two flags in
            <code className="mx-1 rounded bg-white/10 px-1 py-0.5 text-sm">localStorage</code>
            recording whether you had a wallet connected, so the page does not forget
            between reloads. They never leave your device.
          </li>
        </ul>
      </Section>

      <Section title="Your Kaspa address is a public identifier">
        <p>
          Addresses are pseudonymous, not anonymous. An address on this site can be
          matched against the same address on the Kaspa blockchain and anywhere else it
          has been used. If that matters to you, use an address you are comfortable
          publishing.
        </p>
        <p>
          This applies to the fee payment too: paying a listing or vote fee is a public
          Kaspa transaction, visible to anyone, permanently.
        </p>
      </Section>

      <Section title="Who else sees your requests">
        <p>Using the site sends requests to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Supabase</strong> — hosts the database of listings and votes.
          </li>
          <li>
            <strong>KNS (knsdomains.org)</strong> — asked who owns a domain. This is
            checked on the server for every write, which is what stops anyone editing a
            domain they do not own.
          </li>
          <li>
            <strong>The Kaspa API (api.kaspa.org)</strong> — asked, from our server, to
            confirm a fee transaction and who paid it.
          </li>
          <li>
            <strong>Kasplex RPC</strong> — used only when the database is unavailable and
            the site falls back to reading its old smart contracts.
          </li>
          <li>
            <strong>Google Fonts</strong> — serves the site&apos;s typeface.
          </li>
        </ul>
        <p>
          Each of these is a separate company with its own privacy policy. Like any web
          service, they can see your IP address when your browser or our server contacts
          them.
        </p>
      </Section>

      <Section title="Server logs">
        <p>
          The server logs errors and browser security (CSP) reports so that faults can be
          diagnosed. Security reports are truncated to a fixed set of fields before being
          written. Logs are not used to build a profile of anyone.
        </p>
      </Section>

      <Section title="Deleting your data">
        <p>
          Profile links and categories can be changed or emptied at any time from your
          domain&apos;s edit page, using the wallet that owns the domain.
        </p>
        <p>
          A listing and its votes are the public record of a paid action, and votes are
          other people&apos;s, not yours to remove. For anything else, contact whoever
          operates this deployment.
        </p>
        <p className="text-gray-400">
          Note that the fee payments themselves are on the Kaspa blockchain and cannot be
          deleted by anyone, including us.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          This page is versioned in the site&apos;s source repository, so every change to
          it is part of the public commit history.
        </p>
      </Section>

      <div className="mt-12 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
        <p className="font-medium">This page has not been reviewed by a lawyer.</p>
        <p className="mt-1 text-amber-200/80">
          It is an accurate description of what the software does, written from its source
          code. It is not a substitute for a privacy policy reviewed against the law of
          whichever jurisdiction applies to this deployment and its operator.
        </p>
      </div>

      <p className="mt-8 text-sm text-gray-500">
        See also the{' '}
        <Link href="/terms" className="text-teal-300 hover:text-teal-200">
          terms
        </Link>{' '}
        and the live{' '}
        <Link href="/status" className="text-teal-300 hover:text-teal-200">
          status page
        </Link>
        .
      </p>
    </main>
  );
}
