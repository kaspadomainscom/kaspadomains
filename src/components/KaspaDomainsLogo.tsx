// src/components/KaspaDomainsLogo.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function KaspaDomainsLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 group transition hover:scale-105">
      {/* Empty alt on purpose, not by omission: the link's own text says
          "KaspaDomains" right beside it, and a link's accessible name
          concatenates everything inside it -- so a matching alt made screen
          readers announce "KaspaDomains KaspaDomains, link". */}
      <Image
        src="/kaspadomains-logo.jpg"
        alt=""
        width={40}
        height={40}
        className="w-10 h-10 rounded-md"
        priority
      />
      <span className="text-2xl md:text-3xl font-bold tracking-tight text-white">
        Kaspa
        <span className="text-[#3DFDAD] glowText">
          Domains
        </span>
      </span>
    </Link>
  );
}
