// src/components/pages/domain/DomainBreadcrumb.tsx
import Link from "next/link";

type Props = {
  domainName: string;
  /**
   * The category this domain is listed under, when it is safe to link to.
   *
   * Omitted for a domain with no category and for one whose only category has
   * been withdrawn: that page calls `notFound()`, so the link would be a 404.
   * The label still appears elsewhere on the page either way -- the question
   * here is only whether it can be followed.
   */
  category?: { key: string; title: string };
};

export function DomainBreadcrumb({ domainName, category }: Props) {
  return (
    <nav
      className="text-sm text-gray-400 mb-6 flex gap-2 flex-wrap"
      aria-label="Breadcrumb"
    >
      <Link href="/" className="hover:text-kaspaMint hover:underline">
        Home
      </Link>
      <span>/</span>
      <Link href="/domains" className="hover:text-kaspaMint hover:underline">
        Domains
      </Link>
      {category && (
        <>
          <span>/</span>
          <Link
            href={`/domains/categories/category/${encodeURIComponent(category.key)}`}
            className="hover:text-kaspaMint hover:underline"
          >
            {category.title}
          </Link>
        </>
      )}
      <span>/</span>
      <span className="text-gray-200">{domainName}</span>
    </nav>
  );
}
