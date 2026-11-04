'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/services/api';
import { User, ApiResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login'];

/**
 * Route protection listener.
 */
function RouteGuard({
  token,
  isLoading,
}: {
  token: string | null;
  isLoading: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
      if (!token && !isPublicRoute) {
        router.push('/login');
      } else if (token && pathname === '/login') {
        router.push('/dashboard');
      }
    }
  }, [token, isLoading, pathname, router]);

  return null;
}

/**
 * Authentication context provider managing user session and route protection.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiClient.post('/logout');
      }
    } catch {
      /* Silently proceed with local session cleanup */
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      router.push('/login');
    }
  }, [token, router]);

  const login = useCallback(
    (newToken: string, newUser: User) => {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      router.push('/dashboard');
    },
    [router]
  );

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUser));
          const response = await apiClient.get<ApiResponse<User>>('/me');
          if (response.data.success && response.data.data) {
            setUser(response.data.data);
            localStorage.setItem('user', JSON.stringify(response.data.data));
          }
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      <Suspense fallback={null}>
        <RouteGuard token={token} isLoading={isLoading} />
      </Suspense>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access authentication context.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
