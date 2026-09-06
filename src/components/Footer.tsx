// src/components/Footer.tsx
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
          {/* Evaluated on the server only. As a client component this ran in both
              runtimes, so a UTC server and a reader far enough east of it could
              disagree about the year for a day, and React would tear down and
              re-render the footer over it. Nothing here needs the client: no
              state, no handlers, and `Link` works in a server component. */}
          © {new Date().getFullYear()} kaspadomains.com — Built on Kaspa 🧱
        </div>
      </div>
    </footer>
  );
}
