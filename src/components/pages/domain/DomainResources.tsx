'use client';

import { useGetDomainLinks } from '@/hooks/domain/useGetDomainLinks';

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function DomainResources({ domainName }: { domainName: string }) {
  const { links, loading } = useGetDomainLinks(domainName);

  if (loading) return null;
  if (links.length === 0) return null;

  return (
    <div className="pt-2">
      <span className="font-medium text-gray-700 min-w-[120px] block mb-2 text-sm md:text-base">
        Resources:
      </span>
      <ul className="flex flex-wrap gap-2">
        {links.map((link, i) => (
          <li key={`${link.name}-${i}`}>
            <a
              href={isExternalUrl(link.url) ? link.url : `https://${link.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-sm text-gray-800 border border-gray-200 transition"
            >
              {link.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
