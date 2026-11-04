'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiClient } from '@/services/api';
import { ApiResponse, Order } from '@/types';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';

/**
 * Order history list page utilizing the enterprise DataTable with sorting, numbering, and pagination.
 */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<ApiResponse<Order[]>>('/orders', {
        params: {
          status: status || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          per_page: 100,
        },
      });

      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch {
      // Handled via interceptor
    } finally {
      setIsLoading(false);
    }
  }, [status, dateFrom, dateTo]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleResetFilters = () => {
    setStatus('');
    setDateFrom('');
    setDateTo('');
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
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStatusBadge = (orderStatus: Order['status']) => {
    switch (orderStatus) {
      case 'PAID':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            PAID
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            PENDING
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            CANCELLED
          </span>
        );
      default:
        return null;
    }
  };

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        header: 'No. Invoice',
        accessorKey: 'order_number',
        sortable: true,
        className: 'font-mono text-xs font-bold text-slate-900',
      },
      {
        header: 'Waktu Transaksi',
        accessorKey: 'created_at',
        sortable: true,
        sortValue: (order) => new Date(order.created_at).getTime(),
        cell: (order) => (
          <span className="text-xs text-slate-500">{formatDate(order.created_at)}</span>
        ),
      },
      {
        header: 'Pelanggan',
        sortable: true,
        sortValue: (order) => order.customer?.name || '',
        cell: (order) => (
          <div>
            <div className="font-semibold text-slate-900">
              {order.customer?.name || `Customer #${order.customer_id}`}
            </div>
            {order.customer?.email && (
              <div className="text-xs text-slate-400">{order.customer.email}</div>
            )}
          </div>
        ),
      },
      {
        header: 'Status',
        accessorKey: 'status',
        sortable: true,
        align: 'center',
        cell: (order) => renderStatusBadge(order.status),
      },
      {
        header: 'Grand Total',
        accessorKey: 'grand_total',
        sortable: true,
        align: 'right',
        sortValue: (order) => Number(order.grand_total),
        cell: (order) => (
          <span className="font-bold text-slate-900">{formatRupiah(order.grand_total)}</span>
        ),
      },
      {
        header: 'Aksi',
        align: 'center',
        cell: (order) => (
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors shadow-xs"
          >
            Detail Invoice
          </Link>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Riwayat Pesanan</h1>
          <p className="mt-1 text-xs text-slate-500">
            Daftar seluruh transaksi pemesanan beserta status verifikasi dan rincian nominal
          </p>
        </div>
        <div>
          <Link
            href="/orders/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
          >
            + Buat Pesanan Baru
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Filter Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">PENDING (Menunggu)</option>
              <option value="PAID">PAID (Lunas)</option>
              <option value="CANCELLED">CANCELLED (Dibatalkan)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          <div>
            <button
              onClick={handleResetFilters}
              className="w-full px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      <DataTable<Order>
        data={orders}
        columns={columns}
        keyExtractor={(o) => o.id}
        isLoading={isLoading}
        emptyMessage="Tidak ada pesanan ditemukan pada filter ini."
        searchPlaceholder="Cari nomor invoice, pelanggan, atau status..."
        showNumbering={true}
        numberingHeader="#"
        initialPageSize={10}
        pageSizeOptions={[5, 10, 25, 50]}
      />
    </div>
  );
}
