'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiMenu, FiX, FiChevronLeft, FiChevronRight, FiFolder } from 'react-icons/fi';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(true);
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
      setMobileOpen(!mobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <aside
      className={`
        transition-all duration-300 ease-in-out
        ${isMobile ? (mobileOpen ? 'h-auto' : 'h-14') : 'min-h-screen'}
        ${isMobile ? 'w-full border-t md:border-t-0' : collapsed ? 'w-16' : 'w-64'}
        bg-[#0F2F2E] text-white relative z-10 shadow-inner border-r border-[#3DFDAD]/20
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={`
          absolute top-4 right-4 z-20
          bg-[#1C4745] border border-[#3DFDAD]/30 rounded-full w-8 h-8
          flex items-center justify-center text-sm text-[#3DFDAD]
          hover:bg-[#1a403d]
        `}
        title="Toggle Sidebar"
      >
        {isMobile ? (
          mobileOpen ? <FiX size={16} /> : <FiMenu size={16} />
        ) : collapsed ? (
          <FiChevronRight size={16} />
        ) : (
          <FiChevronLeft size={16} />
        )}
      </button>

      {/* Sidebar Content */}
      {(mobileOpen || !isMobile) && (
        <div className="h-full overflow-y-auto pt-4 pb-8 space-y-2">
          {/* Header */}
          <div
            className={`bg-[#152d2b] text-[#3DFDAD] px-3 py-2 text-xs font-semibold tracking-wide uppercase flex items-center ${collapsed ? 'justify-center' : 'justify-start'}`}
          >
            <FiFolder className="mr-2" />
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
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
        transition-colors duration-200
        ${active ? 'bg-[#1c403d] text-[#3DFDAD] font-semibold' : 'text-white/80 hover:bg-[#1a403d] hover:text-[#3DFDAD]'}
        ${collapsed ? 'justify-center' : 'justify-start'}
      `}
    >
      <span>{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
