// src/app/docs/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs | KaspaDomains",
  description:
    "How KaspaDomains works: KNS verification, listing rules, domain resources, and community voting.",
  alternates: {
    canonical: "https://kaspadomains.com/docs",
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
