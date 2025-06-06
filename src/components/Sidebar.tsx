'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiChevronDown,
  FiFolder,
} from 'react-icons/fi';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const collapsed = isMobile ? false : isCollapsed;

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  const filteredLinks = categoryLinks.filter(({ label }) =>
    label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside
      className={[
        'transition-all duration-300 ease-in-out z-10 relative text-white shadow-lg border-r border-[#3DFDAD]/20',
        isMobile ? (mobileOpen ? 'h-auto' : 'h-14 w-full border-t md:border-t-0') : collapsed ? 'w-16 min-h-screen' : 'w-64 min-h-screen',
        'bg-[#0F2F2E]',
      ].join(' ')}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center bg-[#1C4745] text-[#3DFDAD] border border-[#3DFDAD]/40 rounded-full hover:bg-[#1a403d] transition-colors duration-200"
        title="Toggle Sidebar"
      >
        <span className="text-[18px] leading-none">
          {isMobile ? (
            mobileOpen ? <FiChevronUp /> : <FiChevronDown />
          ) : collapsed ? (
            <FiChevronRight />
          ) : (
            <FiChevronLeft />
          )}
        </span>
      </button>

      {(mobileOpen || !isMobile) && (
        <div className="h-full overflow-y-auto pt-5 pb-6 space-y-3">
          {/* Header */}
          <div
            className={[
              'flex items-center px-4 py-2 rounded-md mx-2 bg-[#162f2d] text-[#3DFDAD] text-[11px] font-semibold tracking-wider uppercase',
              collapsed ? 'justify-center' : 'justify-start',
            ].join(' ')}
          >
            <span className="text-sm mr-2 leading-none">
              <FiFolder />
            </span>
            {!collapsed && <span>Categories</span>}
          </div>

          {/* Search Filter */}
          {!collapsed && (
            <div className="px-3">
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm text-white placeholder-white/50 bg-[#1a403d] rounded-md border border-[#3DFDAD]/20 focus:outline-none focus:ring-2 focus:ring-[#3DFDAD]/50"
              />
            </div>
          )}

          {/* Category Links */}
          <nav className="space-y-1 px-2">
            {filteredLinks.length > 0 ? (
              filteredLinks.map(({ icon, label, href }) => (
                <SidebarLink
                  key={href}
                  icon={icon}
                  label={label}
                  href={href}
                  collapsed={collapsed}
                  active={pathname === href}
                />
              ))
            ) : (
              !collapsed && (
                <p className="text-sm text-white/50 px-3 pt-2">No categories found</p>
              )
            )}
          </nav>
        </div>
      )}
    </aside>
  );
}

const categoryLinks = [
  { icon: '🔤', label: 'Short Names', href: '/domains/categories/category/short' },
  { icon: '#️⃣', label: '999 Club', href: '/domains/categories/category/999club' },
  { icon: '🔢', label: '10k Club', href: '/domains/categories/category/10kclub' },
  { icon: '💯', label: '100k Club', href: '/domains/categories/category/100kclub' },
  { icon: '🏷️', label: 'Brandables', href: '/domains/categories/category/brandables' },
  { icon: '🌍', label: 'Real Words', href: '/domains/categories/category/real-words' },
  { icon: '💼', label: 'Business', href: '/domains/categories/category/business' },
  { icon: '🎮', label: 'Gaming', href: '/domains/categories/category/gaming' },
  { icon: '🧠', label: 'AI & Tech', href: '/domains/categories/category/ai-tech' },
  { icon: '💰', label: 'Finance', href: '/domains/categories/category/finance' },
  { icon: '🌐', label: 'Web3 / dApps', href: '/domains/categories/category/web3' },
  { icon: '🧸', label: 'Memes & Fun', href: '/domains/categories/category/memes' },
  { icon: '📈', label: 'Trending', href: '/domains/categories/category/trending' },
];

function SidebarLink({
  icon,
  label,
  href,
  collapsed,
  active,
}: {
  icon: string;
  label: string;
  href: string;
  collapsed: boolean;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
        collapsed ? 'justify-center' : 'justify-start',
        active
          ? 'bg-[#1c403d] text-[#3DFDAD] font-semibold'
          : 'text-white/80 hover:bg-[#1a403d] hover:text-[#3DFDAD]',
      ].join(' ')}
    >
      <span className="text-base">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
