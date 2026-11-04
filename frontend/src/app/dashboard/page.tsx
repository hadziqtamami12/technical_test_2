'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/services/api';
import { ApiResponse, Order, Product } from '@/types';

interface DailyTrend {
  dateKey: string;
  displayDate: string;
  revenue: number;
  orderCount: number;
}

interface BestSellerProduct {
  productId: number;
  productCode: string;
  name: string;
  soldQuantity: number;
  currentStock: number;
}

/**
 * Enterprise analytics dashboard with real-time aggregated metrics, SVG charts, and operational insights.
 */
export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [chartMetric, setChartMetric] = useState<'revenue' | 'volume'>('revenue');

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        apiClient.get<ApiResponse<Order[]>>('/orders', { params: { per_page: 100 } }),
        apiClient.get<ApiResponse<Product[]>>('/products', { params: { per_page: 100 } }),
      ]);

      if (ordersRes.data.success && Array.isArray(ordersRes.data.data)) {
        setOrders(ordersRes.data.data);
      }
      if (productsRes.data.success && Array.isArray(productsRes.data.data)) {
        setProducts(productsRes.data.data);
      }
    } catch {
      // Handled via axios interceptor
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const metrics = useMemo(() => {
    let totalPaidRevenue = 0;
    let pendingCount = 0;
    let paidCount = 0;
    let cancelledCount = 0;

    orders.forEach((order) => {
      const grandTotal = Number(order.grand_total) || 0;
      if (order.status === 'PAID') {
        totalPaidRevenue += grandTotal;
        paidCount++;
      } else if (order.status === 'PENDING') {
        pendingCount++;
      } else if (order.status === 'CANCELLED') {
        cancelledCount++;
      }
    });

    const totalOrdersCount = orders.length;

    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((product) => {
      if (product.stock <= 0) {
        outOfStockCount++;
      } else if (product.stock <= 5) {
        lowStockCount++;
      }
    });

    const averageOrderValue = paidCount > 0 ? totalPaidRevenue / paidCount : 0;

    return {
      totalPaidRevenue,
      totalOrdersCount,
      pendingCount,
      paidCount,
      cancelledCount,
      activeProductsCount: products.length,
      lowStockCount,
      outOfStockCount,
      averageOrderValue,
    };
  }, [orders, products]);

  const statusDistribution = useMemo(() => {
    const total = metrics.totalOrdersCount;
    if (total === 0) {
      return {
        paidPercent: 0,
        pendingPercent: 0,
        cancelledPercent: 0,
      };
    }

    return {
      paidPercent: Math.round((metrics.paidCount / total) * 100),
      pendingPercent: Math.round((metrics.pendingCount / total) * 100),
      cancelledPercent: Math.round((metrics.cancelledCount / total) * 100),
    };
  }, [metrics]);

  const trendData = useMemo<DailyTrend[]>(() => {
    if (orders.length === 0) {
      return [];
    }

    const dateMap = new Map<string, { revenue: number; orderCount: number }>();

    orders.forEach((order) => {
      const rawDate = order.created_at ? order.created_at.slice(0, 10) : '';
      if (!rawDate) return;

      const existing = dateMap.get(rawDate) || { revenue: 0, orderCount: 0 };
      existing.orderCount += 1;
      if (order.status === 'PAID') {
        existing.revenue += Number(order.grand_total) || 0;
      }
      dateMap.set(rawDate, existing);
    });

    const sortedDates = Array.from(dateMap.keys()).sort();

    return sortedDates.map((dateKey) => {
      const item = dateMap.get(dateKey)!;
      const parsedDate = new Date(dateKey);
      const displayDate = parsedDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
      });

      return {
        dateKey,
        displayDate,
        revenue: item.revenue,
        orderCount: item.orderCount,
      };
    });
  }, [orders]);

  const topProducts = useMemo<BestSellerProduct[]>(() => {
    const productSalesMap = new Map<number, { code: string; name: string; qty: number }>();

    orders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          const pid = item.product_id;
          const current = productSalesMap.get(pid) || {
            code: item.product_code_snapshot || '',
            name: item.product_name_snapshot || `Produk #${pid}`,
            qty: 0,
          };
          current.qty += item.quantity;
          productSalesMap.set(pid, current);
        });
      }
    });

    const productStockMap = new Map<number, number>();
    products.forEach((p) => productStockMap.set(p.id, p.stock));

    const salesList: BestSellerProduct[] = [];
    productSalesMap.forEach((val, pid) => {
      salesList.push({
        productId: pid,
        productCode: val.code,
        name: val.name,
        soldQuantity: val.qty,
        currentStock: productStockMap.get(pid) ?? 0,
      });
    });

    salesList.sort((a, b) => b.soldQuantity - a.soldQuantity);

    if (salesList.length < 5 && products.length > 0) {
      const existingIds = new Set(salesList.map((s) => s.productId));
      for (const prod of products) {
        if (!existingIds.has(prod.id)) {
          salesList.push({
            productId: prod.id,
            productCode: prod.product_code,
            name: prod.name,
            soldQuantity: 0,
            currentStock: prod.stock,
          });
        }
        if (salesList.length >= 5) break;
      }
    }

    return salesList.slice(0, 5);
  }, [orders, products]);

  const recentOrders = useMemo(() => {
    return [...orders].slice(0, 5);
  }, [orders]);

  const peakDay = useMemo(() => {
    if (trendData.length === 0) return null;
    let peak = trendData[0];
    trendData.forEach((d) => {
      if (d.revenue > peak.revenue) {
        peak = d;
      }
    });
    return peak;
  }, [trendData]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatShortRupiah = (amount: number) => {
    if (amount >= 1000000000) {
      return `Rp ${(amount / 1000000000).toFixed(1)}M`;
    }
    if (amount >= 1000000) {
      return `Rp ${(amount / 1000000).toFixed(1)}jt`;
    }
    if (amount >= 1000) {
      return `Rp ${(amount / 1000).toFixed(0)}rb`;
    }
    return `Rp ${amount}`;
  };

  const renderStatusBadge = (status: Order['status']) => {
    switch (status) {
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-48 bg-slate-200 animate-pulse rounded" />
          <div className="h-4 w-72 bg-slate-200 animate-pulse rounded mt-2" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
              <div className="h-3 w-28 bg-slate-200 animate-pulse rounded" />
              <div className="h-8 w-36 bg-slate-200 animate-pulse rounded" />
              <div className="h-3 w-20 bg-slate-200 animate-pulse rounded" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
            <div className="h-5 w-48 bg-slate-200 animate-pulse rounded" />
            <div className="h-44 bg-slate-100 animate-pulse rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="h-16 bg-slate-100 animate-pulse rounded-lg" />
              <div className="h-16 bg-slate-100 animate-pulse rounded-lg" />
              <div className="h-16 bg-slate-100 animate-pulse rounded-lg" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
              <div className="h-4 w-36 bg-slate-200 animate-pulse rounded" />
              <div className="h-16 bg-slate-100 animate-pulse rounded" />
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
              <div className="h-4 w-36 bg-slate-200 animate-pulse rounded" />
              <div className="h-24 bg-slate-100 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...trendData.map((d) => d.revenue), 1000000);
  const maxOrderCount = Math.max(...trendData.map((d) => d.orderCount), 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Analitik</h1>
          <p className="mt-1 text-xs text-slate-500">
            Ringkasan performa finansial, volume pesanan, dan status operasional inventaris toko
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Perbarui Data
          </button>
          <Link
            href="/orders/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            + Buat Pesanan
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Pendapatan
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
            {formatRupiah(metrics.totalPaidRevenue)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              {metrics.paidCount} order
            </span>
            <span>berstatus lunas (PAID)</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Order Masuk
            </span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.totalOrdersCount}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Rata-rata order: <span className="font-semibold text-slate-700">{formatRupiah(metrics.averageOrderValue)}</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Menunggu Pembayaran
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.pendingCount}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {metrics.pendingCount > 0 ? (
              <span className="text-amber-700 font-medium">Memerlukan tindak lanjut invoice</span>
            ) : (
              <span className="text-emerald-700 font-medium">Semua transaksi telah terselesaikan</span>
            )}
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Produk Aktif & Stok
            </span>
            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
            {metrics.activeProductsCount} <span className="text-sm font-normal text-slate-500">SKU</span>
          </div>
          <div className="mt-2 text-[11px] flex items-center gap-1.5">
            {metrics.lowStockCount > 0 ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-amber-800 bg-amber-50 border border-amber-200">
                {metrics.lowStockCount} stok menipis (&le; 5)
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                Inventaris optimal
              </span>
            )}
            {metrics.outOfStockCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-rose-800 bg-rose-50 border border-rose-200">
                {metrics.outOfStockCount} habis
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Tren Penjualan & Order</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualisasi volume transaksi dan pergerakan omzet toko per tanggal transaksi
                </p>
              </div>

              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setChartMetric('revenue')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    chartMetric === 'revenue'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Omzet (Rp)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('volume')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    chartMetric === 'volume'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Jumlah Order
                </button>
              </div>
            </div>

            {trendData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                Belum ada transaksi terekam untuk divisualisasikan.
              </div>
            ) : (
              <div className="mt-5">
                <div className="h-44 w-full relative flex flex-col justify-end">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-100 w-full text-[10px] text-slate-400 font-mono text-right pr-2">
                      {chartMetric === 'revenue' ? formatShortRupiah(maxRevenue) : `${maxOrderCount} order`}
                    </div>
                    <div className="border-b border-slate-100 w-full text-[10px] text-slate-400 font-mono text-right pr-2">
                      {chartMetric === 'revenue' ? formatShortRupiah(maxRevenue * 0.66) : `${Math.round(maxOrderCount * 0.66)} order`}
                    </div>
                    <div className="border-b border-slate-100 w-full text-[10px] text-slate-400 font-mono text-right pr-2">
                      {chartMetric === 'revenue' ? formatShortRupiah(maxRevenue * 0.33) : `${Math.round(maxOrderCount * 0.33)} order`}
                    </div>
                    <div className="border-b border-slate-200 w-full text-[10px] text-slate-400 font-mono text-right pr-2">
                      0
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-flow-col auto-cols-fr gap-3 items-end h-32 px-4">
                    {trendData.map((point) => {
                      const value = chartMetric === 'revenue' ? point.revenue : point.orderCount;
                      const maxVal = chartMetric === 'revenue' ? maxRevenue : maxOrderCount;
                      const barHeightPercent = Math.max(8, Math.round((value / maxVal) * 100));

                      return (
                        <div key={point.dateKey} className="group relative flex flex-col items-center h-full justify-end">
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-medium py-1 px-2 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                            <span className="font-semibold">{point.displayDate}:</span>{' '}
                            {chartMetric === 'revenue' ? formatRupiah(point.revenue) : `${point.orderCount} pesanan`}
                          </div>

                          <div
                            style={{ height: `${barHeightPercent}%` }}
                            className={`w-full max-w-[48px] rounded-t-md transition-all ${
                              chartMetric === 'revenue'
                                ? 'bg-slate-900 group-hover:bg-slate-800'
                                : 'bg-blue-600 group-hover:bg-blue-700'
                            }`}
                          />

                          <div className="mt-2 text-[11px] font-medium text-slate-500 truncate w-full text-center">
                            {point.displayDate}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 block">Rata-rata / Hari</span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">
                {formatRupiah(trendData.length > 0 ? Math.round(metrics.totalPaidRevenue / trendData.length) : 0)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">berdasarkan hari aktif</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 block">Penjualan Tertinggi</span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">
                {peakDay ? formatRupiah(peakDay.revenue) : 'Rp 0'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {peakDay ? peakDay.displayDate : '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 block">Rasio Pembayaran</span>
              <span className="text-sm font-bold text-emerald-700 block mt-0.5">
                {statusDistribution.paidPercent}% Lunas
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {metrics.paidCount} dari {metrics.totalOrdersCount} order
              </span>
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 inline-block" />
                <span>Omzet Terverifikasi (PAID)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
                <span>Volume Masuk</span>
              </div>
            </div>
            <div className="font-medium text-slate-700">
              Total Data: {trendData.length} hari aktif
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Distribusi Status Order
            </h3>

            <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden mb-4">
              <div
                style={{ width: `${statusDistribution.paidPercent}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`PAID: ${statusDistribution.paidPercent}%`}
              />
              <div
                style={{ width: `${statusDistribution.pendingPercent}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`PENDING: ${statusDistribution.pendingPercent}%`}
              />
              <div
                style={{ width: `${statusDistribution.cancelledPercent}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`CANCELLED: ${statusDistribution.cancelledPercent}%`}
              />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 font-medium">Lunas (PAID)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{metrics.paidCount}</span>
                  <span className="text-slate-400 text-[11px]">({statusDistribution.paidPercent}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-slate-600 font-medium">Menunggu (PENDING)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{metrics.pendingCount}</span>
                  <span className="text-slate-400 text-[11px]">({statusDistribution.pendingPercent}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-slate-600 font-medium">Dibatalkan (CANCELLED)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{metrics.cancelledCount}</span>
                  <span className="text-slate-400 text-[11px]">({statusDistribution.cancelledPercent}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Produk Terlaris
              </h3>
              <Link href="/products" className="text-[11px] text-slate-500 hover:text-slate-900 font-semibold">
                Lihat Semua &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {topProducts.map((item, index) => (
                <div key={item.productId} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">#{index + 1}</span>
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.name}</p>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {item.productCode} &bull; Stok: {item.currentStock}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold text-slate-900">{item.soldQuantity} terjual</div>
                    {item.currentStock <= 5 ? (
                      <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
                        Menipis
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                        Tersedia
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Transaksi Terakhir
              </h3>
              <Link href="/orders" className="text-[11px] text-slate-500 hover:text-slate-900 font-semibold">
                Semua Order &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">Belum ada transaksi.</div>
              ) : (
                recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {order.order_number}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {order.customer?.name || `Customer #${order.customer_id}`}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-semibold text-slate-900">
                        {formatRupiah(Number(order.grand_total))}
                      </div>
                      <div className="mt-1">{renderStatusBadge(order.status)}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

