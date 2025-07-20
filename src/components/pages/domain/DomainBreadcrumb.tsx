// src/components/pages/domain/DomainBreadcrumb.tsx
import Link from "next/link";

type Props = {
  domainName: string;
};

export function DomainBreadcrumb({ domainName }: Props) {
  return (
    <nav
      className="text-sm text-gray-500 mb-6 flex gap-2 flex-wrap"
      aria-label="Breadcrumb"
    >
      <Link href="/" className="hover:underline">
        Home
      </Link>
      <span>/</span>
      <Link href="/domains" className="hover:underline">
        Domains
      </Link>
      <span>/</span>
      <span className="text-gray-700">{domainName}</span>
    </nav>
  );
}
