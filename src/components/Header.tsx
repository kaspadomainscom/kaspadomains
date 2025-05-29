'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import KaspaDomainsLogo from './KaspaDomainsLogo';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Domains', href: '/domains' },
    { label: 'Categories', href: '/domains/categories' },
    { label: 'Learn', href: '/learn' },
  ];

  const isActive = (href: string) =>
    pathname === href
      ? 'text-white after:block after:h-0.5 after:bg-white after:w-full'
      : 'text-white/80 hover:text-white';

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

  return (
    <header className="sticky top-0 z-50 shadow-sm">
      {/* Top Navigation */}
      <div className="bg-[#0F2F2E]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
          {/* Logo */}
          <KaspaDomainsLogo />

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative pb-1 font-medium transition-colors duration-200 ${isActive(item.href)}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search .kas domains"
                className="w-52 px-3 py-2 rounded-md text-sm text-white bg-white/10 border border-white/20 placeholder-white/50 focus:bg-white focus:text-gray-900 focus:outline-none transition"
              />
              <svg
                className="absolute right-2 top-1/2 h-4 w-4 text-white/60 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Connect Button */}
            <button className="ml-4 px-4 py-2 bg-[#3DFDAD] text-[#0F2F2E] font-semibold rounded-md hover:bg-[#34e29c] transition">
              Connect Wallet
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden p-2 text-white hover:text-white transition"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
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
          {premiumDomains.map((domain, index) => (
            <a
              key={index}
              href={`/domains/${domain}`}
              className="flex-shrink-0 whitespace-nowrap hover:underline transition duration-200 glow-green"
            >
              🔥 <span className="font-semibold">{domain}</span> — <span className="underline underline-offset-4">Buy Now</span>
            </a>
          ))}
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <nav className="md:hidden bg-[#0F2F2E] px-4 pb-4 pt-2 animate-slide-down space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-2 py-2 rounded-md text-white/90 hover:text-white ${isActive(item.href)}`}
            >
              {item.label}
            </Link>
          ))}
          <button className="w-full px-4 py-2 bg-[#3DFDAD] text-[#0F2F2E] rounded-md font-semibold hover:bg-[#34e29c] transition">
            Connect Wallet
          </button>
        </nav>
      )}

      <style jsx>{`
        .glow-green {
          text-shadow: 0 0 6px #3DFDAD, 0 0 12px #3DFDAD;
        }
      `}</style>
    </header>
  );
}
