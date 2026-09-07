import type { Metadata } from "next";

/**
 * Per-wallet page, so `noindex` rather than a canonical.
 *
 * It is a client component and cannot export metadata itself, so it inherited
 * the `/domains` layout's — serving the title "Browse Premium .kas Domains" and
 * a canonical pointing at `/domains`, which told search engines to drop this URL
 * in favour of that one. The honest answer is not a corrected canonical: the
 * content here is different for every visitor and there is nothing to index.
 * `follow: true` so the links out of it are still crawled.
 */
export const metadata: Metadata = {
  title: "My Domains | KaspaDomains",
  description: "The .kas domains this wallet owns, and which of them are listed here.",
  robots: { index: false, follow: true },
};

export default function MyDomainsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
