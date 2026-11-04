'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Root index redirector to dashboard or login.
 */
export default function HomePage() {
  const router = useRouter();
  const { token, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (token) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [token, isLoading, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-slate-500 font-medium text-sm animate-pulse">
        Memuat sistem Order Service...
      </div>
    </div>
  );
}
