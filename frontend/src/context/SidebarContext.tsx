'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  setIsCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

/**
 * Context provider managing sidebar collapse state across layout components with screen size responsiveness.
 */
export const SidebarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 1024) {
          setIsCollapsedState(true);
        } else {
          const saved = localStorage.getItem('sidebar_collapsed');
          if (saved !== null) {
            setIsCollapsedState(saved === 'true');
          } else {
            setIsCollapsedState(false);
          }
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleCollapse, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

/**
 * Custom hook to access sidebar collapse state.
 */
export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
