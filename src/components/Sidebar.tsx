'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  IconTrending,
  IconUser,
  IconVault,
  IconActivity,
  IconHeart,
  IconSettings,
  IconTool,
} from '@/components/icons';

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
        'transition-all duration-300 ease-in-out z-10 relative text-white shadow-lg border-r border-[#3DFDAD]/20 bg-[#0F2F2E]',
        isMobile
          ? mobileOpen
            ? 'h-auto w-full border-t md:border-t-0'
            : 'h-14 w-full border-t md:border-t-0'
          : collapsed
          ? 'w-16 min-h-screen'
          : 'w-64 min-h-screen',
      ].join(' ')}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center bg-[#1C4745] text-[#3DFDAD] border border-[#3DFDAD]/40 rounded-full hover:bg-[#1a403d] transition-colors duration-200"
        title="Toggle Sidebar"
        aria-label="Toggle Sidebar"
      >
        {isMobile ? (
          mobileOpen ? (
            <IconChevronUp width={18} height={18} />
          ) : (
            <IconChevronDown width={18} height={18} />
          )
        ) : collapsed ? (
          <IconChevronRight width={18} height={18} />
        ) : (
          <IconChevronLeft width={18} height={18} />
        )}
      </button>

      {(mobileOpen || !isMobile) && (
        <div className="h-full overflow-y-auto pt-5 pb-6 space-y-3">
          {/* Main Tools */}
          <nav className="space-y-1 px-2" aria-label="My Tools">
            <SidebarLink
              icon={IconUser}
              label="My Domains"
              href="/domains/mine"
              collapsed={collapsed}
              active={pathname === '/domains/mine'}
              isMobile={isMobile}
              onClick={toggleSidebar}
            />
            <SidebarLink
              icon={IconVault}
              label="Vault"
              href="/vault"
              collapsed={collapsed}
              active={pathname === '/vault'}
              isMobile={isMobile}
              onClick={toggleSidebar}
            />
            <SidebarLink
              icon={IconActivity}
              label="Activity"
              href="/activity"
              collapsed={collapsed}
              active={pathname === '/activity'}
              isMobile={isMobile}
              onClick={toggleSidebar}
            />
            <SidebarLink
              icon={IconTool}
              label="Creator Tools"
              href="/creator-tools"
              collapsed={collapsed}
              active={pathname === '/creator-tools'}
              isMobile={isMobile}
              onClick={toggleSidebar}
            />
            <SidebarLink
              icon={IconHeart}
              label="Favorites"
              href="/favorites"
              collapsed={collapsed}
              active={pathname === '/favorites'}
              isMobile={isMobile}
              onClick={toggleSidebar}
            />
            <SidebarLink
              icon={IconSettings}
              label="Settings"
              href="/settings"
              collapsed={collapsed}
              active={pathname === '/settings'}
              isMobile={isMobile}
              onClick={toggleSidebar}
            />
          </nav>

          {/* Category Header */}
          <div
            className={[
              'flex items-center px-4 py-2 rounded-md mx-2 bg-[#162f2d] text-[#3DFDAD] text-[11px] font-semibold tracking-wider uppercase',
              collapsed ? 'justify-center' : 'justify-start',
            ].join(' ')}
          >
            <IconFolder className="text-sm mr-2 leading-none" width={16} height={16} />
            {!collapsed && <span>Categories</span>}
          </div>

          {/* Search */}
          {!collapsed && (
            <div className="px-3">
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm text-white placeholder-white/50 bg-[#1a403d] rounded-md border border-[#3DFDAD]/20 focus:outline-none focus:ring-2 focus:ring-[#3DFDAD]/50 transition"
                aria-label="Search categories"
              />
            </div>
          )}

          {/* Category Links */}
          <nav className="space-y-1 px-2" aria-label="Category Links">
            {filteredLinks.length > 0 ? (
              filteredLinks.map(({ icon: IconComp, label, href }) => (
                <SidebarLink
                  key={href}
                  icon={IconComp}
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
  { icon: IconUser, label: 'Profiles', href: '/domains/categories/category/profiles' },  // Added IconUser with a logical label
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
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
        collapsed ? 'justify-center' : 'justify-start',
        active
          ? 'bg-[#1c403d] text-[#3DFDAD] font-semibold'
          : 'text-white/80 hover:bg-[#1a403d] hover:text-[#3DFDAD]',
      ].join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      <Icon width={20} height={20} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
