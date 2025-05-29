'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const collapsed = isCollapsed || isMobile;

  return (
    <aside
      className={`
        bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
        ${isMobile ? 'w-full border-t md:border-t-0' : collapsed ? 'w-16' : 'w-64'}
        ${isMobile ? (mobileOpen ? 'h-auto' : 'h-14') : 'min-h-screen'}
        relative z-10
      `}
    >
      {/* Collapse Button */}
      {!isMobile && (
        <button
          onClick={toggleSidebar}
          className="absolute top-4 right-[-12px] bg-gray-100 border border-gray-300 rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-gray-200 z-20"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      )}

      {/* Content */}
      {(mobileOpen || !isMobile) && (
        <div className="h-full overflow-y-auto pt-4 pb-8 space-y-2">
          {/* Header */}
          <div
            className={`bg-kaspaGreen text-white px-3 py-2 text-xs font-semibold tracking-wide uppercase flex items-center ${collapsed ? 'justify-center' : 'justify-start'}`}
          >
            <span className="mr-2">📂</span>
            {!collapsed && <span>Categories</span>}
          </div>

          {/* Links */}
          <nav className="px-1 space-y-1">
            {categoryLinks.map(({ icon, label, href }) => (
              <SidebarLink
                key={href}
                icon={icon}
                label={label}
                href={href}
                collapsed={collapsed}
                active={pathname === href}
              />
            ))}
          </nav>
        </div>
      )}
    </aside>
  );
}

const categoryLinks = [
  { icon: '🔤', label: 'Short Names', href: '/categories/short' },
  { icon: '#️⃣', label: '999 Club', href: '/categories/999club' },
  { icon: '🔢', label: '10k Club', href: '/categories/10kclub' },
  { icon: '💯', label: '100k Club', href: '/categories/100kclub' },
  { icon: '🏷️', label: 'Brandables', href: '/categories/brandables' },
  { icon: '🌍', label: 'Real Words', href: '/categories/real-words' },
  { icon: '💼', label: 'Business', href: '/categories/business' },
  { icon: '🎮', label: 'Gaming', href: '/categories/gaming' },
  { icon: '🧠', label: 'AI & Tech', href: '/categories/ai-tech' },
  { icon: '💰', label: 'Finance', href: '/categories/finance' },
  { icon: '🌐', label: 'Web3 / dApps', href: '/categories/web3' },
  { icon: '🧸', label: 'Memes & Fun', href: '/categories/memes' },
  { icon: '📈', label: 'Trending', href: '/categories/trending' },
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
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
        transition-colors duration-200
        ${active ? 'bg-gray-100 text-kaspaGreen font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-kaspaGreen'}
        ${collapsed ? 'justify-center' : 'justify-start'}
      `}
    >
      <span>{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
