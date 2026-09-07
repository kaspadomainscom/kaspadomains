'use client';

import { useGetDomainLinks } from '@/hooks/domain/useGetDomainLinks';
import { safeLinkHref } from '@/lib/linkUrl';

export function DomainResources({ domainName }: { domainName: string }) {
  const { links, loading } = useGetDomainLinks(domainName);

  if (loading) return null;

  // Couldn't load. Rendering nothing would be indistinguishable from "this
  // domain has no links", which is a confident claim about someone else's
  // profile that we are in no position to make.
  if (links === null) {
    return (
      <div className="pt-2 text-sm text-gray-500">
        Resources couldn&apos;t be loaded right now.
      </div>
    );
  }

  if (links.length === 0) return null;

  return (
    <div className="pt-2">
      <span className="font-medium text-gray-400 min-w-[120px] block mb-2 text-sm md:text-base">
        Resources:
      </span>
      <ul className="flex flex-wrap gap-2">
        {links.map((link, i) => {
          const href = safeLinkHref(link.url);

          // Not clickable, but still shown. The owner put this on their profile,
          // so hiding it would misrepresent the page; making it a link would
          // trust a URL that failed the check. This used to rewrite anything
          // that failed as `https://${url}` and render it anyway -- which
          // neutralised a `javascript:` URL by accident rather than by
          // decision. See @/lib/linkUrl.
          if (!href) {
            return (
              <li key={`${link.name}-${i}`}>
                <span
                  title="This link was not saved as a valid http(s) address, so it is not clickable."
                  className="inline-block px-3 py-1 rounded-full bg-[#1d3b39]/50 text-sm text-gray-500 border border-white/10 cursor-not-allowed"
                >
                  {link.name}
                </span>
              </li>
            );
          }

          return (
            <li key={`${link.name}-${i}`}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-3 py-1 rounded-full bg-[#1d3b39] hover:bg-kaspaMint hover:text-[#0F2F2E] text-sm text-kaspaMint border border-[#3DFDAD]/30 transition"
              >
                {link.name}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
