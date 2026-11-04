'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider } from '@/context/SidebarContext';
import { Sidebar } from './Sidebar';
import { TopMenu } from './TopMenu';

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Shell layout with collapsible independent sidebar, sticky top menu, and main content area.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopMenu />
          <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
