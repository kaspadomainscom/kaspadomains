// src/app/search/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search .kas Domains | KaspaDomains",
  description: "Search premium .kas domains listed on KaspaDomains.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
