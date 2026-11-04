'use client';

import React, { useState } from 'react';
import { AxiosError } from 'axios';
import { apiClient } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { ApiResponse, User } from '@/types';

interface LoginResponseData {
  user: User;
  token: string;
}

/**
 * Admin authentication login page styled with strict enterprise SaaS light theme.
 */
export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@tokoonline.com');
  const [password, setPassword] = useState('Password123!');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post<ApiResponse<LoginResponseData>>('/login', {
        email,
        password,
      });

      if (response.data.success && response.data.data) {
        login(response.data.data.token, response.data.data.user);
      } else {
        setErrorMessage(response.data.message || 'Login gagal.');
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse>;
      const responseData = axiosError.response?.data;
      if (responseData?.errors?.email) {
        setErrorMessage(responseData.errors.email[0]);
      } else {
        setErrorMessage(responseData?.message || 'Gagal terhubung ke server backend.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            OS
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
            Order Service Backoffice
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Masuk dengan kredensial administrator enterprise
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 font-medium">
            {errorMessage}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Administrator
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
              placeholder="admin@tokoonline.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
          >
            {isSubmitting ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 leading-relaxed">
            Kredensial Default Seeder:<br />
            <span className="font-mono font-medium text-slate-800">admin@tokoonline.com</span> &bull;{' '}
            <span className="font-mono font-medium text-slate-800">Password123!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
