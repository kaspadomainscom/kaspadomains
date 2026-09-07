import type { Metadata } from "next";

/** Per-wallet page. Same reasoning as `my-domains/layout.tsx`. */
export const metadata: Metadata = {
  title: "My Votes | KaspaDomains",
  description: "The .kas domains this wallet has voted for.",
  robots: { index: false, follow: true },
};

export default function MyVotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
