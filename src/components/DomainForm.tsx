import Link from 'next/link';

/**
 * @deprecated Use the wallet-verified listing flow at /list-domain.
 *
 * This compatibility component deliberately does not collect data or submit a
 * transaction. The former form used placeholder wallet/contract data and could
 * make an unsuccessful listing look real.
 */
export default function DomainForm() {
  return (
    <section
      aria-labelledby="legacy-domain-form-title"
      className="mx-auto max-w-xl rounded-lg border bg-white p-6 dark:bg-zinc-900"
    >
      <h2 id="legacy-domain-form-title" className="text-2xl font-semibold">
        Domain listing has moved
      </h2>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        To protect ownership verification, listings can only be created from a
        connected wallet in the current listing flow.
      </p>
      <Link
        href="/list-domain"
        className="mt-5 inline-flex rounded bg-kaspaGreen px-4 py-2 text-white"
      >
        Go to domain listing
      </Link>
    </section>
  );
}
