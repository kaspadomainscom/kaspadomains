import type { Metadata } from "next";

/**
 * `list-domain/page.tsx` is a client component, and a client component cannot
 * export `metadata` — so without this file the page inherited whatever the root
 * layout declared, which included `canonical: https://kaspadomains.com`. The
 * page that explains how to list a domain was telling search engines it was the
 * homepage.
 */
export const metadata: Metadata = {
  title: "List Your .kas Domain | KaspaDomains",
  description:
    "List a .kas domain you already own: prove ownership with Kasware, choose categories, and add your links.",
  alternates: { canonical: "https://kaspadomains.com/list-domain" },
};

export default function ListDomainLayout({ children }: { children: React.ReactNode }) {
  return children;
}
