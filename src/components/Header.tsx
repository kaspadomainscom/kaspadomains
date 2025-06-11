// src/components/Header.tsx
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import KaspaDomainsLogo from './KaspaDomainsLogo';
import { findDomainByName } from '@/data/domainLookup';
import { categoriesData } from '@/data/categoriesManifest';
import { useWallet } from '@/hooks/wallet/useWallet';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Domains', href: '/domains' },
  { label: 'Learn', href: '/learn' },
];

// strip “.kas” suffix once, memoize for performance
const trendingDomains = categoriesData.trending.domains
  .map(d => d.name.replace(/\.kas$/i, ''));

function ConnectButton() {
  const {
    connect,
    account,
    walletType,
    isCorrectNetwork,
    switchNetwork,
    disconnect,
    status,
    error,
  } = useWallet();

  const isConnecting = status === 'connecting';
  const isConnected  = status === 'connected';
  const shortAddress = useMemo(
    () => account ? `${account.slice(0, 6)}…${account.slice(-4)}` : '',
    [account]
  );

  const handleConnect = async (type: 'metamask' | 'kasware') => {
    if (!account) {
      await connect(type);
    } else if (!isCorrectNetwork) {
      await switchNetwork();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {isConnected ? (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleConnect(walletType!)}
            disabled={isConnecting}
            className="bg-kaspaMint hover:bg-[#3DFDAD]/90 text-[#0F2F2E]
                       font-semibold py-1.5 px-4 rounded-lg transition
                       disabled:opacity-50"
          >
            {isConnecting
              ? 'Connecting…'
              : `${shortAddress} (${walletType})`}
          </button>
          <button
            onClick={disconnect}
            className="bg-red-600 hover:bg-red-700 text-white
                       font-semibold py-1.5 px-3 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleConnect('metamask')}
            disabled={isConnecting}
            className="bg-kaspaMint hover:bg-[#3DFDAD]/90 text-[#0F2F2E]
                       font-semibold py-1.5 px-4 rounded-lg transition
                       disabled:opacity-50"
          >
            {isConnecting ? 'Connecting…' : 'MetaMask'}
          </button>
          <button
            onClick={() => handleConnect('kasware')}
            disabled={isConnecting}
            className="bg-[#5183f5] hover:bg-[#4169c9] text-white
                       font-semibold py-1.5 px-4 rounded-lg transition
                       disabled:opacity-50"
          >
            {isConnecting ? 'Connecting…' : 'Kasware'}
          </button>
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

interface NavProps {
  onSearch: (term: string) => void;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  isPathActive: (href: string) => boolean;
}

function DesktopNav({ onSearch, searchTerm, setSearchTerm, isPathActive }: NavProps) {
  return (
    <nav className="hidden md:flex items-center space-x-6">
      <div className="flex space-x-4">
        {NAV_ITEMS.map(({ label, href }) => (
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

      <form
        onSubmit={e => {
          e.preventDefault();
          onSearch(searchTerm);
        }}
        className="relative"
        role="search"
        aria-label="Search domains"
      >
        <input
          type="search"
          placeholder="Search domains…"
          className="w-52 px-3 py-2 rounded-md text-sm text-white
                     bg-white/10 border border-white/20 placeholder-white/50
                     focus:bg-white focus:text-gray-900 transition"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2">
          <svg
            className="h-4 w-4 text-white/60"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>

      <ConnectButton />
    </nav>
  );
}

function MobileMenu({
  open,
  onClose,
  onSearch,
  searchTerm,
  setSearchTerm,
}: {
  open: boolean;
  onClose: () => void;
  onSearch: (term: string) => void;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
}) {
  if (!open) return null;

  return (
    <nav className="md:hidden bg-[#0F2F2E] px-4 py-4 space-y-3
                    shadow-md border-t border-[#3DFDAD]/40">
      {NAV_ITEMS.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          onClick={onClose}
          className="block px-2 py-2 rounded-md text-white/90 hover:text-white"
        >
          {label}
        </Link>
      ))}

      <form
        onSubmit={e => {
          e.preventDefault();
          onSearch(searchTerm);
          onClose();
        }}
      >
        <input
          type="search"
          placeholder="Search domains…"
          className="w-full px-3 py-2 rounded-md text-sm text-white
                     bg-white/10 border border-white/20 placeholder-white/50
                     focus:bg-white focus:text-gray-900 transition mb-2"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </form>

      <ConnectButton />
    </nav>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();
  const router   = useRouter();

  const isPathActive = useCallback(
    (href: string) =>
      pathname === href || (href !== '/' && pathname.startsWith(href)),
    [pathname]
  );

  const handleSearch = useCallback(
    (raw: string) => {
      let term = raw.trim().toLowerCase();
      if (!term) return;
      if (term.endsWith('.kas')) term = term.slice(0, -4);

      const exists = findDomainByName(term);
      router.push(
        exists
          ? `/domain/${encodeURIComponent(term)}`
          : `/search?q=${encodeURIComponent(term)}`
      );
      setSearchTerm('');
      setMenuOpen(false);
    },
    [router]
  );

  return (
    <header className="sticky top-0 z-50 shadow-sm bg-[#0F2F2E]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center
                      justify-between px-4 py-3 md:py-4">
        <KaspaDomainsLogo />

        <DesktopNav
          onSearch={handleSearch}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isPathActive={isPathActive}
        />

        <button
          onClick={() => setMenuOpen(o => !o)}
          className="md:hidden text-white p-2 rounded-md
                     hover:bg-white/20 focus:outline-none
                     focus:ring-2 focus:ring-offset-2 focus:ring-kaspaMint"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg"
                 className="h-6 w-6" fill="none"
                 stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg"
                 className="h-6 w-6" fill="none"
                 stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <div className="bg-[#0F2F2E] border-t border-[#3DFDAD]/20 overflow-hidden">
        <div
          className="animate-marquee flex gap-8 py-2 px-4 text-[#3DFDAD]
                     text-sm md:text-base font-medium tracking-tight
                     hover:[animation-play-state:paused]"
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
                <span className="underline underline-offset-4">Buy Now</span>
              </Link>
            ))
          ) : (
            <p className="text-white/60">No trending domains right now.</p>
          )}
        </div>
      </div>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
    </header>
  );
}
