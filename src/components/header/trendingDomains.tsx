'use client';

import Link from 'next/link';

interface TrendingDomainsProps {
  trendingDomains: string[];
}

export default function TrendingDomainsComponent({ trendingDomains }: TrendingDomainsProps) {
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
              href={`/domain/${encodeURIComponent(domain)}`}
              className="flex-shrink-0 whitespace-nowrap hover:underline glow-green"
            >
              🔥 <span className="font-semibold">{domain}</span> —{' '}
              <span className="underline underline-offset-4">Buy&nbsp;Now</span>
            </Link>
          ))
        ) : (
          <p className="text-white/60">No trending domains right now.</p>
        )}
      </div>
    </div>
  );
}
