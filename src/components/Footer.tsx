// src/components/Footer.tsx
'use client';

import Link from 'next/link';

const FOOTER_LINKS = [
  { label: 'Domains', href: '/domains' },
  { label: 'Categories', href: '/domains/categories' },
  { label: 'Learn', href: '/learn' },
  { label: 'Docs', href: '/docs' },
  { label: 'About', href: '/about' },
  { label: 'Business Plan', href: '/business-plan' },
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Status', href: '/status' },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#0F2F2E] border-t border-[#3DFDAD]/20 text-gray-300 text-sm py-8 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-4 text-center">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-kaspaMint transition">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="text-gray-500">
          © {new Date().getFullYear()} kaspadomains.com — Built on Kaspa 🧱
        </div>
      </div>
    </footer>
  );
}
