import type { Metadata } from 'next';
import './globals.css';
import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Order Service - Toko Online Enterprise',
  description: 'Enterprise Order Management Service',
};

/**
 * Root application layout wrapped with global authentication context and independent sidebar layout shell.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full bg-slate-50">
      <body className="min-h-full font-sans text-slate-800 antialiased bg-slate-50">
        <Suspense fallback={null}>
          <AuthProvider>
            <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
              <AppLayout>{children}</AppLayout>
            </Suspense>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
