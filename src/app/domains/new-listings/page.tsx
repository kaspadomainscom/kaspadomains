import { redirect } from 'next/navigation';

/**
 * Legacy entry point kept for bookmarks and external links.
 *
 * Listing must go through the wallet-verified flow. Do not forward a `name`
 * query parameter here: the current flow intentionally derives the available
 * domains from the connected wallet instead of accepting arbitrary input.
 */
export default function LegacyNewListingsPage() {
  redirect('/list-domain');
}
