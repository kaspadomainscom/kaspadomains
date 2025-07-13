'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Icons
import {
  IconFolder,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconShortNames,
  IconClub,
  IconTag,
  IconGlobe,
  IconBriefcase,
  IconGamepad,
  IconBrain,
  IconMoney,
  IconNetwork,
  IconTeddy,
  IconTool,
  IconVault,
  IconTrending,
  IconUser,
  IconActivity,
  IconHeart,
  IconSettings,
} from '@/components/icons';

// Simple clsx helper for conditional class names
function clsx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// Debounce hook to delay search input updates
function useDebounce<T>(value: T, delay = 200): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pathname = usePathname();

  const debouncedSearch = useDebounce(search, 150);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sidebarContentRef = useRef<HTMLDivElement>(null);

  // Update isMobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-focus search input when sidebar expands on desktop
  useEffect(() => {
    if (!isMobile && !isCollapsed && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isCollapsed, isMobile]);

  // Clear search when sidebar collapses (desktop)
  useEffect(() => {
    if (isCollapsed && !isMobile) {
      setSearch('');
    }
  }, [isCollapsed, isMobile]);

  // Close mobile sidebar with Escape key
  useEffect(() => {
    if (!isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, isMobile]);

  const collapsed = isMobile ? false : isCollapsed;

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  // Memoized filtered links for performance
  const filteredLinks = useMemo(() => {
    return categoryLinks.filter(({ label }) =>
      label.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [debouncedSearch]);

  // For smooth mobile open/close height animation
  const mobileSidebarMaxHeight = mobileOpen ? '1000px' : '56px'; // 14 * 4 (rem to px approx)

  return (
    <aside
      role="navigation"
      aria-label="Sidebar"
      className={clsx(
        'relative z-10 text-white shadow-lg border-r border-[#3DFDAD]/20 bg-[#0F2F2E]',
        'transition-width duration-300 ease-in-out min-h-screen',
        isMobile
          ? 'w-full border-t md:border-t-0'
          : collapsed
          ? 'w-16'
          : 'w-64'
      )}
      style={{
        transitionProperty: 'width',
        maxHeight: isMobile ? mobileSidebarMaxHeight : undefined,
        transitionDuration: isMobile ? '300ms' : undefined,
        transitionTimingFunction: isMobile ? 'ease-in-out' : undefined,
        overflow: isMobile ? 'hidden' : undefined,
      }}
    >
      {/* Sidebar Header */}
      <div
        className={clsx(
          'flex items-center px-4 py-3 font-bold text-[#3DFDAD] border-b border-[#3DFDAD]/20 select-none',
          collapsed ? 'justify-center' : 'justify-start'
        )}
      >
        <IconVault width={24} height={24} className={collapsed ? 'mx-auto' : 'mr-2'} />
        {!collapsed && <span className="text-lg">Kaspa Domains</span>}
      </div>

      <button
        onClick={toggleSidebar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSidebar();
          }
        }}
        aria-label="Toggle Sidebar"
        aria-expanded={isMobile ? mobileOpen : !collapsed}
        aria-controls="sidebar-content"
        title="Toggle Sidebar"
        className={clsx(
          'absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full border border-[#3DFDAD]/40 bg-[#1C4745] text-[#3DFDAD]',
          'hover:bg-[#1a403d] transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[#3DFDAD]/50'
        )}
        type="button"
      >
        {isMobile ? (
          mobileOpen ? (
            <IconChevronUp width={18} height={18} />
          ) : (
            <IconChevronDown width={18} height={18} />
          )
        ) : (
          <span
            className={clsx(
              'inline-block transform transition-transform duration-300',
              collapsed ? 'rotate-0' : 'rotate-180'
            )}
          >
            {collapsed ? (
              <IconChevronRight width={18} height={18} />
            ) : (
              <IconChevronLeft width={18} height={18} />
            )}
          </span>
        )}
      </button>

      {/* Sidebar Content */}
      {(mobileOpen || !isMobile) && (
        <div
          id="sidebar-content"
          ref={sidebarContentRef}
          className="h-full overflow-y-auto pt-5 pb-6 space-y-3"
          tabIndex={-1} // for focus management if needed
        >
          <nav className="space-y-1 px-2" aria-label="My Tools">
            {toolLinks.map(({ icon, label, href }) => (
              <SidebarLink
                key={href}
                icon={icon}
                label={label}
                href={href}
                collapsed={collapsed}
                active={pathname === href}
                isMobile={isMobile}
                onClick={toggleSidebar}
              />
            ))}
          </nav>

          <div
            className={clsx(
              'flex items-center px-4 py-2 mx-2 rounded-md bg-[#162f2d] text-[#3DFDAD] text-[11px] font-semibold tracking-wider uppercase select-none',
              collapsed ? 'justify-center' : 'justify-start'
            )}
          >
            <IconFolder width={16} height={16} className="mr-2 leading-none" />
            {!collapsed && <span>Categories</span>}
          </div>

          {!collapsed && (
            <div className="px-3 transition-opacity duration-300 ease-in-out">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-[#3DFDAD]/20 bg-[#1a403d] px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#3DFDAD]/50 transition"
                aria-label="Search categories"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}

          <nav className="space-y-1 px-2" aria-label="Category Links">
            {filteredLinks.length > 0 ? (
              filteredLinks.map(({ icon, label, href }) => (
                <SidebarLink
                  key={href}
                  icon={icon}
                  label={label}
                  href={href}
                  collapsed={collapsed}
                  active={pathname === href}
                  isMobile={isMobile}
                  onClick={toggleSidebar}
                />
              ))
            ) : (
              !collapsed && (
                <p className="px-3 pt-2 text-sm text-white/50">No categories found</p>
              )
            )}
          </nav>
        </div>
      )}
    </aside>
  );
}

const toolLinks = [
  { icon: IconUser, label: 'My Domains', href: '/domains/my-domains' },
  { icon: IconHeart, label: 'My Votes', href: '/domains/my-votes' },
  { icon: IconTrending, label: 'Top Voted', href: '/domains/top-voted' },
  { icon: IconActivity, label: 'New Listings', href: '/list-domain' },
  { icon: IconSettings, label: 'Settings', href: '/settings' },
];

const categoryLinks = [
  { icon: IconShortNames, label: 'Short Names', href: '/domains/categories/category/short' },
  { icon: IconClub, label: '999 Club', href: '/domains/categories/category/999club' },
  { icon: IconClub, label: '10k Club', href: '/domains/categories/category/10kclub' },
  { icon: IconClub, label: '100k Club', href: '/domains/categories/category/100kclub' },
  { icon: IconTag, label: 'Brandables', href: '/domains/categories/category/brandables' },
  { icon: IconGlobe, label: 'Real Words', href: '/domains/categories/category/real-words' },
  { icon: IconBriefcase, label: 'Business', href: '/domains/categories/category/business' },
  { icon: IconGamepad, label: 'Gaming', href: '/domains/categories/category/gaming' },
  { icon: IconBrain, label: 'AI & Tech', href: '/domains/categories/category/ai-tech' },
  { icon: IconMoney, label: 'Finance', href: '/domains/categories/category/finance' },
  { icon: IconNetwork, label: 'Web3 / dApps', href: '/domains/categories/category/web3' },
  { icon: IconUser, label: 'Profiles', href: '/domains/categories/category/profiles' },
  { icon: IconTeddy, label: 'Memes & Fun', href: '/domains/categories/category/memes' },
  { icon: IconVault, label: 'Vaults', href: '/domains/categories/category/vaults' },
  { icon: IconActivity, label: 'Active Projects', href: '/domains/categories/category/active-projects' },
  { icon: IconHeart, label: 'Loved', href: '/domains/categories/category/loved' },
  { icon: IconSettings, label: 'Utilities', href: '/domains/categories/category/utilities' },
  { icon: IconTool, label: 'Tools', href: '/domains/categories/category/tools' },
  { icon: IconTrending, label: 'Trending', href: '/domains/categories/category/trending' },
];

function SidebarLink({
  icon: Icon,
  label,
  href,
  collapsed,
  active,
  isMobile,
  onClick,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  href: string;
  collapsed: boolean;
  active?: boolean;
  isMobile?: boolean;
  onClick?: () => void;
}) {
  const handleClick = () => {
    if (isMobile && onClick) {
      setTimeout(() => onClick(), 400);
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-label={label}
      className={clsx(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
        collapsed ? 'justify-center' : 'justify-start',
        active
          ? 'bg-[#1c403d] font-semibold text-[#3DFDAD]'
          : 'text-white/80 hover:bg-[#1a403d] hover:text-[#3DFDAD]'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon width={20} height={20} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
