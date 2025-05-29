'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function KaspaDomainsLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 group transition hover:scale-105">
      <Image
        src="/kaspadomains-logo.jpg"
        alt="KaspaDomains"
        width={40}
        height={40}
        className="w-10 h-10 rounded-md"
        priority
      />
      <span className="text-2xl md:text-3xl font-bold tracking-tight text-white">
        Kaspa
        <span
            className="text-[#3DFDAD]"
            style={{
            textShadow: '0 0 3px #3DFDAD, 0 0 5px #3DFDAD'
            }}>
          Domains
        </span>
      </span>
    </Link>
  );
}
