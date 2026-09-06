'use client';

import Link from 'next/link';
import { baseDomainName } from '@/lib/domainName';

interface TrendingDomainsProps {
  /** Canonical names. `null` means "not known", which is not "there are none". */
  trendingDomains: string[] | null;
}

export default function TrendingDomainsComponent({ trendingDomains }: TrendingDomainsProps) {
  // Render nothing rather than announcing an empty list we never managed to
  // read. The strip is decoration; a false statement is not.
  if (trendingDomains === null) return null;

  return (
    <div className="bg-[#0F2F2E] border-t border-[#3DFDAD]/20 overflow-hidden">
      <div
        className="animate-marquee flex gap-8 py-2 px-4 text-[#3DFDAD] text-sm md:text-base font-medium tracking-tight hover:[animation-play-state:paused]"
        aria-label="Trending domains"
      >
        {trendingDomains.length ? (
          trendingDomains.map(domain => (
            <Link
              key={domain}
              // The canonical name, so the profile page does not have to
              // redirect to add the suffix back.
              href={`/domain/${encodeURIComponent(domain)}`}
              className="flex-shrink-0 whitespace-nowrap hover:underline glow-green"
            >
              🔥 <span className="font-semibold">{baseDomainName(domain)}</span> —{' '}
              <span className="underline underline-offset-4">View&nbsp;Domain</span>
            </Link>
          ))
        ) : (
          <p className="text-white/60">No trending domains right now.</p>
        )}
      </div>
    </div>
  );
}
