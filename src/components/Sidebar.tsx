'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false); // desktop collapse
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen] = useState(true); // mobile starts collapsed

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const collapsed = isCollapsed || isMobile;

  return (
    <aside
      className={`
        bg-white border-gray-200 p-4
        transition-all duration-300 ease-in-out
        ${isMobile ? 'w-full border-t md:border-t-0' : isCollapsed ? 'w-16' : 'w-64'}
        ${isMobile ? (mobileOpen ? 'h-auto' : 'h-14') : 'min-h-screen'}
        relative
        z-10
      `}
    >
      {/* Desktop Collapse Button */}
      {!isMobile && (
        <button
          onClick={toggleSidebar}
          className="absolute top-4 right-[-12px] bg-gray-200 border border-gray-300 rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-gray-300 z-20"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      )}

      {/* Content */}
      {(mobileOpen || !isMobile) && (
        <div className={`space-y-3 ${isMobile ? 'flex justify-around' : 'block'}`}>
          {/* Collapsing Categories Header */}
          <div
            className={`
              bg-kaspaGreen text-white p-2 flex items-center
              ${collapsed ? 'justify-center' : 'justify-start'}
            `}
          >
            <span className="mr-2">📂</span>
            {!collapsed && <span className="text-sm font-semibold">Categories</span>}
          </div>

          <SidebarLink icon="🔤" label="Short Names" collapsed={collapsed} href="/categories/short" />
          <SidebarLink icon="#️⃣" label="999 Club" collapsed={collapsed} href="/categories/999club" />
          <SidebarLink icon="🔢" label="10k Club" collapsed={collapsed} href="/categories/10kclub" />
          <SidebarLink icon="💯" label="100k Club" collapsed={collapsed} href="/categories/100kclub" />
          <SidebarLink icon="🏷️" label="Brandables" collapsed={collapsed} href="/categories/brandables" />
          <SidebarLink icon="🌍" label="Real Words" collapsed={collapsed} href="/categories/real-words" />
          <SidebarLink icon="💼" label="Business" collapsed={collapsed} href="/categories/business" />
          <SidebarLink icon="🎮" label="Gaming" collapsed={collapsed} href="/categories/gaming" />
          <SidebarLink icon="🧠" label="AI & Tech" collapsed={collapsed} href="/categories/ai-tech" />
          <SidebarLink icon="💰" label="Finance" collapsed={collapsed} href="/categories/finance" />
          <SidebarLink icon="🌐" label="Web3 / dApps" collapsed={collapsed} href="/categories/web3" />
          <SidebarLink icon="🧸" label="Memes & Fun" collapsed={collapsed} href="/categories/memes" />
          <SidebarLink icon="📈" label="Trending" collapsed={collapsed} href="/categories/trending" />
        </div>
      )}
    </aside>
  );
}

function SidebarLink({
  icon,
  label,
  collapsed,
  href,
}: {
  icon: string;
  label: string;
  collapsed: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center text-sm hover:text-red-600 transition-colors duration-200 justify-center md:justify-start"
    >
      <span className="mr-2">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
