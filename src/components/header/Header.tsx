'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import KaspaDomainsLogo from '../KaspaDomainsLogo';
import { findDomainByName, normalizeDomainName } from '@/data/domainLookup';
import { useTrendingDomains } from '@/hooks/domains/useTrendingDomains';
import { useWalletContext } from '@/context/WalletContext';
import TrendingDomainsComponent from './trendingDomains';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Domains', href: '/domains' },
  { label: 'Learn', href: '/learn' },
];

function ConnectButton() {
  const { kasware, account, error, isConnected, disconnect } = useWalletContext();
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const shortAccount = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : '';

  // One wallet. The Kasplex EVM signer was removed with the contract path on
  // 2026-09-06 -- it was a second prompt for a capability nothing used.
  const handleConnect = async () => {
    try {
      setConnectError(null);
      setConnecting(true);
      await kasware.connect();
    } catch (err) {
      console.error('Failed to connect Kasware:', err);
      setConnectError(
        `Failed to connect Kasware: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center space-x-2">
        <button
          onClick={handleConnect}
          disabled={connecting || isConnected}
          className="bg-kaspaMint hover:bg-[#3DFDAD]/90 text-[#0F2F2E] font-semibold py-1.5 px-4 rounded-lg transition disabled:opacity-50 flex items-center gap-1"
        >
          {connecting ? 'Connecting…' : isConnected ? 'Kasware' : 'Connect Kasware'}
          {isConnected && <span className="text-green-700 text-xs">●</span>}
        </button>
        {account && <span className="text-white text-sm font-mono">{shortAccount}</span>}
      </div>

      {isConnected && (
        <button
          onClick={disconnect}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded-lg transition mt-1"
          aria-label="Logout from wallet"
        >
          Logout
        </button>
      )}

      {(connectError || error) && (
        <p className="text-red-500 text-xs mt-1">{connectError || error}</p>
      )}
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
    <nav className="hidden md:flex items-center space-x-6" aria-label="Primary navigation">
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
            aria-current={isPathActive(href) ? 'page' : undefined}
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
          id="desktop-domain-search"
          name="domain-search"
          type="search"
          placeholder="Search domains…"
          className="w-52 px-3 py-2 rounded-md text-sm text-white bg-white/10 border border-white/20 placeholder-white/50 focus:bg-white focus:text-gray-900 transition"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          aria-label="Search domains input"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          aria-label="Submit domain search"
        >
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
    <nav
      className="md:hidden bg-[#0F2F2E] px-4 py-4 space-y-3 shadow-md border-t border-[#3DFDAD]/40"
      aria-label="Mobile navigation"
    >
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
          id="mobile-domain-search"
          name="domain-search"
          type="search"
          placeholder="Search domains…"
          className="w-full px-3 py-2 rounded-md text-sm text-white bg-white/10 border border-white/20 placeholder-white/50 focus:bg-white focus:text-gray-900 transition mb-2"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          aria-label="Search domains input"
        />
      </form>

      <ConnectButton />
    </nav>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  // One targeted query. This used to load the entire category manifest -- every
  // category, every listing, every membership row -- on every page view, to
  // display a dozen names.
  const trendingDomains = useTrendingDomains();

  const isPathActive = useCallback(
    (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href)),
    [pathname]
  );

  const handleSearch = useCallback(
    async (raw: string) => {
      const canonical = normalizeDomainName(raw);
      if (!canonical) return;

      // Clear the box and close the menu straight away, before awaiting the
      // lookup. Doing it afterwards left the typed term sitting in the input
      // for the whole round trip, so a second Enter re-ran the same search.
      setSearchTerm('');
      setMenuOpen(false);

      // Push the canonical name. Pushing the bare term made the profile page
      // immediately redirect to add `.kas`, which is a wasted navigation and
      // leaves the un-suffixed URL in history.
      const exists = await findDomainByName(canonical);
      router.push(
        exists
          ? `/domain/${encodeURIComponent(canonical)}`
          : `/search?q=${encodeURIComponent(canonical.replace(/\.kas$/, ''))}`
      );
    },
    [router]
  );

  return (
    <header className="sticky top-0 z-50 shadow-sm bg-[#0F2F2E]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
        <KaspaDomainsLogo />

        <DesktopNav
          onSearch={handleSearch}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isPathActive={isPathActive}
        />

        <button
          onClick={() => setMenuOpen(o => !o)}
          className="md:hidden text-white p-2 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kaspaMint"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
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
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <TrendingDomainsComponent trendingDomains={trendingDomains} />

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
