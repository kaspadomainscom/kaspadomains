'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import KaspaDomainsLogo from './KaspaDomainsLogo';
import { findDomainByName } from '@/data/domainLookup';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Domains', href: '/domains' },
  { label: 'Categories', href: '/domains/categories' },
  { label: 'Learn', href: '/learn' },
];

const premiumDomains = [
  'wallet.kas',
  'pay.kas',
  'nft.kas',
  'dex.kas',
  'ai.kas',
  'btc.kas',
  'eth.kas',
  'chat.kas',
  'swap.kas',
  'gas.kas',
];

const isPathActive = (pathname: string, href: string) => {
  if (href === '/') return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
};

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  const handleSearchKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      let term = searchTerm.trim().toLowerCase();

      // Remove ".kas" if the user includes it
      if (term.endsWith('.kas')) {
        term = term.slice(0, -4);
      }

      const domainFound = findDomainByName(term);

      if (domainFound) {
        router.push(`/domain/${encodeURIComponent(term)}`);
      } else {
        router.push(`/search?q=${encodeURIComponent(term)}`);
      }

      setSearchTerm('');
      setMenuOpen(false);
    }
  },
  [searchTerm, router]
);


  const handleNavClick = useCallback(() => {
    if (menuOpen) setMenuOpen(false);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 shadow-sm" role="banner">
      {/* Top Navigation */}
      <div className="bg-[#0F2F2E]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
          <KaspaDomainsLogo />

          {/* Desktop Nav */}
          <nav aria-label="Primary" className="hidden md:flex items-center space-x-6">
            <div className="flex space-x-4">
              {navItems.map(({ label, href }) => {
                const active = isPathActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative pb-1 font-medium transition-colors duration-200 ${
                      active
                        ? 'text-white after:block after:h-0.5 after:bg-white after:w-full'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <label htmlFor="search-domains" className="sr-only">
                Search Kaspa domains
              </label>
              <input
                type="search"
                id="search-domains"
                name="search"
                placeholder="Search domains (e.g. pay or pay.kas)"
                className="w-52 px-3 py-2 rounded-md text-sm text-white bg-white/10 border border-white/20 placeholder-white/50 focus:bg-white focus:text-gray-900 focus:outline-none transition"
                autoComplete="off"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              <svg
                className="absolute right-2 top-1/2 h-4 w-4 text-white/60 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Connect Button */}
            <button
              type="button"
              className="ml-4 px-4 py-2 bg-[#3DFDAD] text-[#0F2F2E] font-semibold rounded-md hover:bg-[#34e29c] transition"
            >
              Connect Wallet
            </button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden p-2 text-white hover:text-white transition"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {menuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Premium Domains Ticker */}
      <div className="bg-[#0F2F2E] border-t border-[#3DFDAD]/20 overflow-hidden">
        <div className="animate-marquee flex gap-8 py-2 px-4 text-[#3DFDAD] text-sm md:text-base font-medium tracking-tight hover:[animation-play-state:paused]">
          {premiumDomains.map((domain) => (
            <Link
              key={domain}
              href={`/domain/${domain.replace('.kas', '')}`}
              className="flex-shrink-0 whitespace-nowrap hover:underline transition duration-200 glow-green"
            >
              🔥 <span className="font-semibold">{domain}</span> —{' '}
              <span className="underline underline-offset-4">Buy&nbsp;Now</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="md:hidden bg-[#0F2F2E] px-4 pb-4 pt-2 animate-slide-down space-y-3"
        >
          {navItems.map(({ label, href }) => {
            const active = isPathActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={handleNavClick}
                aria-current={active ? 'page' : undefined}
                className={`block px-2 py-2 rounded-md text-white/90 hover:text-white ${
                  active ? 'text-white after:block after:h-0.5 after:bg-white after:w-full' : ''
                }`}
              >
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            className="w-full px-4 py-2 bg-[#3DFDAD] text-[#0F2F2E] rounded-md font-semibold hover:bg-[#34e29c] transition"
          >
            Connect Wallet
          </button>
        </nav>
      )}
    </header>
  );
}
