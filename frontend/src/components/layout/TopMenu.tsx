'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';

/**
 * Enterprise SaaS top menu navigation bar with sidebar toggle and quick navigation.
 */
export const TopMenu: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isCollapsed, toggleCollapse } = useSidebar();

  const getPageTitle = (path: string): string => {
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/products') return 'Katalog Produk';
    if (path === '/orders/create') return 'Buat Pesanan';
    if (path === '/orders') return 'Riwayat Pesanan';
    if (path.startsWith('/orders/')) return 'Detail Faktur';
    return 'Backoffice';
  };

  const topNavLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Katalog Produk', href: '/products' },
    { label: 'Buat Order', href: '/orders/create' },
    { label: 'Riwayat Order', href: '/orders' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? 'Maximize Sidebar' : 'Minimize Sidebar'}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          aria-label="Toggle sidebar collapse"
        >
          {isCollapsed ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5" />
            </svg>
          )}
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Halaman</span>
          <span className="text-xs text-slate-300 hidden sm:inline">/</span>
          <span className="text-xs font-semibold text-slate-900">{getPageTitle(pathname)}</span>
        </div>

        <nav className="hidden lg:flex items-center gap-1 ml-4 pl-4 border-l border-slate-200">
          {topNavLinks.map((link) => {
            const isActive =
              link.href === '/orders'
                ? pathname === '/orders'
                : pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href="/orders/create"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="hidden sm:inline">Buat Pesanan Baru</span>
          <span className="sm:hidden">Buat Pesanan</span>
        </Link>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.name || 'Administrator'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium capitalize">
              {user?.role || 'Administrator'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            title="Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-100"
            aria-label="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
