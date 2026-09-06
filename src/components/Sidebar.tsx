'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGetAllowedCategories } from '@/hooks/domains/useGetAllowedCategories';

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
  // IconSettings,
} from '@/components/icons';

function clsx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile && !isCollapsed && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isCollapsed, isMobile]);

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
      if (!isCollapsed) setSearch('');
      setIsCollapsed((prev) => !prev);
    }
  }, [isCollapsed, isMobile]);

  // Derived from the real category list, not hard-coded.
  //
  // The hard-coded version had **nine of nineteen** links pointing at
  // categories that do not exist -- `ai-tech` for `tech`, `real-words` for
  // `realWords`, `memes` for `meme`, plus `profiles`, `vaults`, `tools`,
  // `utilities`, `loved` and `active-projects`, which were never categories at
  // all. Roughly half the primary navigation 404'd, and nothing could ever have
  // told us: a link is just a string until someone clicks it.
  //
  // Deriving it means a category added to the database appears here, one
  // removed disappears, and no link can point at something that is not there.
  const { options: categoryOptions } = useGetAllowedCategories();

  const categoryLinks = useMemo(
    () =>
      categoryOptions.map(({ key, title }) => ({
        icon: CATEGORY_ICONS[key] ?? IconFolder,
        label: title,
        href: `/domains/categories/category/${key}`,
      })),
    [categoryOptions]
  );

  const filteredLinks = useMemo(() => {
    return categoryLinks.filter(({ label }) =>
      label.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [categoryLinks, debouncedSearch]);

  const showSidebar = !isMobile || mobileOpen;

  return showSidebar ? (
    <aside
      role="navigation"
      aria-label="Sidebar"
      className={clsx(
        'relative z-10 text-white shadow-lg border-r border-[#3DFDAD]/20 bg-[#0F2F2E]',
        'transition-all duration-300 ease-in-out',
        isMobile ? 'w-full' : collapsed ? 'w-16 min-h-screen' : 'w-64 min-h-screen'
      )}
    >
      {/* Sidebar Header */}
      <div
        className={clsx(
          'flex items-center px-5 py-3 font-bold text-[#3DFDAD] border-b border-[#3DFDAD]/20 select-none',
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
          'absolute top-2.5 z-20 w-7 h-7 flex items-center justify-center rounded-full border border-[#3DFDAD]/40 bg-[#1C4745] text-[#3DFDAD]',
          'hover:bg-[#1a403d] transition-colors duration-200',
          'focus:outline-none focus:ring-[1.5px] focus:ring-[#3DFDAD]/50',
          isMobile
            ? 'right-2.5'
            : collapsed
              ? '-right-3' // negative right pushes button outward (half out of 24px button)
              : 'right-2.5'
        )}
        type="button"
      >
        {isMobile ? (
          mobileOpen ? (
            <IconChevronUp width={12} height={12} />
          ) : (
            <IconChevronDown width={12} height={12} />
          )
        ) : collapsed ? (
          <IconChevronRight width={12} height={12} />
        ) : (
          <IconChevronLeft width={12} height={12} />
        )}
      </button>

      {/* Sidebar Content */}
      <div
        id="sidebar-content"
        className="h-full overflow-y-auto pt-5 pb-6 space-y-3"
        tabIndex={-1}
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
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        <div
          className={clsx(
            'flex items-center px-4 py-2 mx-2 rounded-md bg-[#162f2d] text-[#3DFDAD] text-[11px] font-semibold tracking-wider uppercase select-none',
            collapsed ? 'justify-center' : 'justify-start'
          )}
        >
          <IconFolder
            className="mr-2 shrink-0"
            width={20}
            height={20}
          />
          {!collapsed && <span>Categories</span>}
        </div>


        {!collapsed && (
          <div className="px-3 transition-opacity duration-300 ease-in-out">
            <input
              id="sidebar-search"
              name="categorySearch"
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
                onClick={() => setMobileOpen(false)}
              />
            ))
          ) : (
            !collapsed && (
              <p className="px-3 pt-2 text-sm text-white/50">No categories found</p>
            )
          )}
        </nav>
      </div>
    </aside>
  ) : (
    // On mobile the sidebar collapses to nothing -- and the only toggle used to
    // live *inside* it, so once closed there was no way to reopen it and the
    // whole navigation surface was unreachable. This button is the way back in.
    <button
      type="button"
      onClick={() => setMobileOpen(true)}
      aria-label="Open sidebar navigation"
      aria-expanded={false}
      aria-controls="sidebar-content"
      className="fixed bottom-4 left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[#3DFDAD]/40 bg-[#1C4745] text-[#3DFDAD] shadow-lg hover:bg-[#1a403d] focus:outline-none focus:ring-2 focus:ring-[#3DFDAD]/50 md:hidden"
    >
      <IconFolder width={20} height={20} />
    </button>
  );
}

const toolLinks = [
  { icon: IconUser, label: 'My Domains', href: '/domains/my-domains' },
  { icon: IconHeart, label: 'My Votes', href: '/domains/my-votes' },
  { icon: IconTrending, label: 'Top Voted', href: '/domains/top-voted' },
  { icon: IconActivity, label: 'New Listings', href: '/list-domain' },
  // { icon: IconSettings, label: 'Settings', href: '/settings' },
];

/**
 * Icons by category key, for the categories the database actually has.
 *
 * A key with no entry falls back to the folder icon rather than being dropped:
 * a new category should appear in the navigation immediately, looking plain,
 * rather than silently not appearing at all.
 */
const CATEGORY_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  trending: IconTrending,
  '999club': IconClub,
  '10kclub': IconClub,
  '100kclub': IconClub,
  short: IconShortNames,
  realWords: IconGlobe,
  brandables: IconTag,
  business: IconBriefcase,
  finance: IconMoney,
  gaming: IconGamepad,
  tech: IconBrain,
  web3: IconNetwork,
  meme: IconTeddy,
  characters: IconUser,
  geo: IconGlobe,
  other: IconTool,
};

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
  return (
    <Link
      href={href}
      onClick={() => isMobile && onClick?.()}
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
