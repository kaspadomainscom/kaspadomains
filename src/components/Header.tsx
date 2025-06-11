'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import KaspaDomainsLogo from './KaspaDomainsLogo';
import { findDomainByName } from '@/data/domainLookup';
import { categoriesData } from '@/data/categoriesManifest';
import { useMetaMask } from '@/hooks/metamask/useMetaMask';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Domains', href: '/domains' },
  { label: 'Learn', href: '/learn' },
];

const trendingDomains = categoriesData.trending.domains.map(d => d.name);

function ConnectButton() {
  const { connect, account, isCorrectNetwork, switchNetwork, isConnecting, disconnect } = useMetaMask();

  const handleConnectClick = async () => {
    if (!account) {
      await connect();
    } else if (!isCorrectNetwork) {
      await switchNetwork();
    }
  };

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : 'Connect Wallet';

  return account ? (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleConnectClick}
        disabled={isConnecting}
        className="bg-kaspaMint hover:bg-[#3DFDAD]/90 text-[#0F2F2E] font-semibold py-1.5 px-4 rounded-lg transition disabled:opacity-50"
        type="button"
      >
        {isConnecting ? 'Connecting...' : shortAddress}
      </button>
      <button
        onClick={disconnect}
        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded-lg transition"
        type="button"
        aria-label="Disconnect wallet"
      >
        Logout
      </button>
    </div>
  ) : (
    <button
      onClick={handleConnectClick}
      disabled={isConnecting}
      className="bg-kaspaMint hover:bg-[#3DFDAD]/90 text-[#0F2F2E] font-semibold py-1.5 px-4 rounded-lg transition disabled:opacity-50"
      type="button"
    >
      {isConnecting ? 'Connecting...' : shortAddress}
    </button>
  );
}

function DesktopNav({
  searchTerm,
  setSearchTerm,
  handleSearchKeyDown,
  isPathActive,
}: {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isPathActive: (href: string) => boolean;
}) {
  return (
    <nav className="hidden md:flex items-center space-x-6">
      <div className="flex space-x-4">
        {navItems.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={`relative pb-1 font-medium transition-colors duration-200 ${
              isPathActive(href)
                ? 'text-white after:block after:h-0.5 after:bg-white after:w-full'
                : 'text-white/80 hover:text-white'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="relative">
        <input
          type="search"
          placeholder="Search domains"
          className="w-52 px-3 py-2 rounded-md text-sm text-white bg-white/10 border border-white/20 placeholder-white/50 focus:bg-white focus:text-gray-900 transition"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          aria-label="Search domains"
        />
        <svg
          className="absolute right-2 top-1/2 h-4 w-4 text-white/60 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <ConnectButton />
    </nav>
  );
}

function MobileMenu({
  menuOpen,
  setMenuOpen,
}: {
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  if (!menuOpen) return null;

  return (
    <nav className="md:hidden bg-[#0F2F2E] px-4 py-4 space-y-3 shadow-md border-t border-[#3DFDAD]/40">
      {navItems.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setMenuOpen(false)}
          className="block px-2 py-2 rounded-md text-white/90 hover:text-white"
        >
          {label}
        </Link>
      ))}
      <ConnectButton />
    </nav>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && searchTerm.trim()) {
        let term = searchTerm.trim().toLowerCase();
        if (term.endsWith('.kas')) term = term.slice(0, -4);

        const domainFound = findDomainByName(term);
        router.push(domainFound ? `/domain/${encodeURIComponent(term)}` : `/search?q=${encodeURIComponent(term)}`);
        setSearchTerm('');
        setMenuOpen(false);
      }
    },
    [searchTerm, router]
  );

  const isPathActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 shadow-sm bg-[#0F2F2E]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
        <KaspaDomainsLogo />

        <DesktopNav
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleSearchKeyDown={handleSearchKeyDown}
          isPathActive={isPathActive}
        />

        <button
          onClick={() => setMenuOpen(open => !open)}
          className="md:hidden text-white p-2 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kaspaMint"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          type="button"
        >
          {menuOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <div className="bg-[#0F2F2E] border-t border-[#3DFDAD]/20 overflow-hidden">
        <div className="animate-marquee flex gap-8 py-2 px-4 text-[#3DFDAD] text-sm md:text-base font-medium tracking-tight hover:[animation-play-state:paused]">
          {trendingDomains.map(domain => (
            <Link
              key={domain}
              href={`/domain/${domain.replace('.kas', '')}`}
              className="flex-shrink-0 whitespace-nowrap hover:underline glow-green"
            >
              🔥 <span className="font-semibold">{domain}</span> —{' '}
              <span className="underline underline-offset-4">Buy&nbsp;Now</span>
            </Link>
          ))}
        </div>
      </div>

      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
    </header>
  );
}
