'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { apiClient } from '@/services/api';
import { ApiResponse, Order } from '@/types';

/**
 * Detailed order invoice page with status lifecycle actions in clean SaaS light style.
 */
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOrderDetail = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get<ApiResponse<Order>>(`/orders/${orderId}`);
      if (response.data.success && response.data.data) {
        setOrder(response.data.data);
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse>;
      setActionMessage({
        type: 'error',
        text: axiosError.response?.data?.message || 'Pesanan tidak ditemukan.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handlePay = async () => {
    if (!order) return;
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const response = await apiClient.patch<ApiResponse<Order>>(`/orders/${order.id}/pay`);
      if (response.data.success && response.data.data) {
        setOrder(response.data.data);
        setActionMessage({
          type: 'success',
          text: 'Pembayaran berhasil dikonfirmasi. Status pesanan kini PAID (Lunas).',
        });
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse>;
      setActionMessage({
        type: 'error',
        text: axiosError.response?.data?.message || 'Gagal memproses pembayaran.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    const confirmCancel = window.confirm(
      'Apakah Anda yakin ingin membatalkan pesanan ini? Stok produk akan dikembalikan ke inventaris.'
    );
    if (!confirmCancel) return;

    setIsProcessing(true);
    setActionMessage(null);
    try {
      const response = await apiClient.patch<ApiResponse<Order>>(`/orders/${order.id}/cancel`);
      if (response.data.success && response.data.data) {
        setOrder(response.data.data);
        setActionMessage({
          type: 'success',
          text: 'Pesanan berhasil dibatalkan dan stok produk telah dikembalikan ke inventaris.',
        });
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse>;
      setActionMessage({
        type: 'error',
        text: axiosError.response?.data?.message || 'Gagal membatalkan pesanan.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatRupiah = (amount: number | string) => {
    const num = Number(amount);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-36 bg-slate-200 animate-pulse rounded" />
        <div className="p-8 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
          <div className="h-6 w-48 bg-slate-200 animate-pulse rounded" />
          <div className="h-24 bg-slate-100 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-sm max-w-lg mx-auto mt-12">
        <h2 className="text-base font-bold text-slate-900 mb-1">Pesanan Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500 mb-5">
          Pesanan dengan ID #{orderId} tidak terdaftar di sistem.
        </p>
        <button
          onClick={() => router.push('/orders')}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
        >
          Kembali ke Riwayat Pesanan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/orders" className="hover:text-slate-900">
              Riwayat Pesanan
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-700 font-semibold">{order.order_number}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Faktur Pembelian
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {order.status === 'PENDING' && (
            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              {isProcessing ? 'Memproses...' : '✓ Konfirmasi Pembayaran'}
            </button>
          )}

          {(order.status === 'PENDING' || order.status === 'PAID') && (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
            >
              {isProcessing ? 'Memproses...' : '✕ Batalkan Pesanan'}
            </button>
          )}

          {order.status === 'CANCELLED' && (
            <span className="text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
              Pesanan Dibatalkan
            </span>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          className={`rounded-lg p-4 text-xs font-semibold flex items-center justify-between border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div>{actionMessage.text}</div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold hover:opacity-75 cursor-pointer ml-4"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Nomor Faktur / Invoice
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
              {order.order_number}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Waktu Transaksi: {formatDate(order.created_at)}
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Transaksi</div>
            <div className="mt-1">
              {order.status === 'PAID' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  PAID (LUNAS)
                </span>
              )}
              {order.status === 'PENDING' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  PENDING (MENUNGGU PEMBAYARAN)
                </span>
              )}
              {order.status === 'CANCELLED' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  CANCELLED (DIBATALKAN)
                </span>
              )}
            </div>
            {order.idempotency_key && (
              <div className="text-[11px] text-slate-400 font-mono mt-1">
                Key: {order.idempotency_key}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Data Pelanggan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Nama Pelanggan:</span>
              <p className="font-semibold text-slate-900 mt-0.5">{order.customer?.name || '-'}</p>
            </div>
            <div>
              <span className="text-slate-400">Email:</span>
              <p className="font-mono text-slate-900 mt-0.5">{order.customer?.email || '-'}</p>
            </div>
            <div>
              <span className="text-slate-400">Nomor Telepon:</span>
              <p className="font-mono text-slate-900 mt-0.5">{order.customer?.phone || '-'}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Daftar Produk yang Dipesan
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-center w-12">#</th>
                  <th className="px-4 py-2.5 text-left">SKU Snapshot</th>
                  <th className="px-4 py-2.5 text-left">Nama Produk</th>
                  <th className="px-4 py-2.5 text-right">Harga Satuan</th>
                  <th className="px-4 py-2.5 text-center">Qty</th>
                  <th className="px-4 py-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items?.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-center font-mono text-xs text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                      {item.product_code_snapshot}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.product_name_snapshot}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {formatRupiah(item.price_snapshot)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-semibold text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatRupiah(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="max-w-xs ml-auto space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">
                {formatRupiah(order.subtotal)}
              </span>
            </div>

            <div className="flex justify-between text-emerald-700">
              <span>Diskon Bertingkat:</span>
              <span className="font-semibold">
                - {formatRupiah(order.discount_amount)}
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>PPN (11%):</span>
              <span className="font-semibold text-slate-900">
                + {formatRupiah(order.tax_amount)}
              </span>
            </div>

            <div className="border-t border-slate-300 pt-2.5 flex justify-between text-sm font-bold text-slate-950">
              <span>Grand Total:</span>
              <span className="font-mono text-base text-slate-950">
                {formatRupiah(order.grand_total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
