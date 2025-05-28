// src/components/Sidebar.tsx
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
          <div className={`bg-[#70C7BA] text-white p-2 space-y-3`}>
            <p>Categories</p>
          </div>
          <SidebarLink icon="🔤" label="Short Names" collapsed={isCollapsed || isMobile} href="/categories/short" />
          <SidebarLink icon="#️⃣" label="999 Club" collapsed={isCollapsed || isMobile} href="/categories/999club" />
          <SidebarLink icon="🔢" label="10k Club" collapsed={isCollapsed || isMobile} href="/categories/10kclub" />
          <SidebarLink icon="💯" label="100k Club" collapsed={isCollapsed || isMobile} href="/categories/100kclub" />
          <SidebarLink icon="🏷️" label="Brandables" collapsed={isCollapsed || isMobile} href="/categories/brandables" />
          <SidebarLink icon="🌍" label="Real Words" collapsed={isCollapsed || isMobile} href="/categories/real-words" />
          <SidebarLink icon="💼" label="Business" collapsed={isCollapsed || isMobile} href="/categories/business" />
          <SidebarLink icon="🎮" label="Gaming" collapsed={isCollapsed || isMobile} href="/categories/gaming" />
          <SidebarLink icon="🧠" label="AI & Tech" collapsed={isCollapsed || isMobile} href="/categories/ai-tech" />
          <SidebarLink icon="💰" label="Finance" collapsed={isCollapsed || isMobile} href="/categories/finance" />
          <SidebarLink icon="🌐" label="Web3 / dApps" collapsed={isCollapsed || isMobile} href="/categories/web3" />
          <SidebarLink icon="🧸" label="Memes & Fun" collapsed={isCollapsed || isMobile} href="/categories/memes" />
          <SidebarLink icon="📈" label="Trending" collapsed={isCollapsed || isMobile} href="/categories/trending" />
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
      {/* Show label only if not collapsed */}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
