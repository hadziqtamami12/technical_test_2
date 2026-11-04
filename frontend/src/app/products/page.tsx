'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/services/api';
import { ApiResponse, Product } from '@/types';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';

/**
 * Product catalog list page utilizing the enterprise DataTable with sorting, numbering, and pagination.
 */
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<ApiResponse<Product[]>>('/products', {
        params: {
          per_page: 100,
        },
      });

      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch {
      // Handled via interceptor
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const formatRupiah = (amount: number | string) => {
    const num = Number(amount);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        header: 'Kode Produk',
        accessorKey: 'product_code',
        sortable: true,
        className: 'font-mono text-xs font-semibold text-slate-900',
      },
      {
        header: 'Nama & Deskripsi',
        accessorKey: 'name',
        sortable: true,
        cell: (product) => (
          <div>
            <div className="font-semibold text-slate-900">{product.name}</div>
            {product.description && (
              <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {product.description}
              </div>
            )}
          </div>
        ),
      },
      {
        header: 'Harga Satuan',
        accessorKey: 'price',
        sortable: true,
        align: 'right',
        sortValue: (product) => Number(product.price),
        cell: (product) => (
          <span className="font-semibold text-slate-900">
            {formatRupiah(product.price)}
          </span>
        ),
      },
      {
        header: 'Sisa Stok',
        accessorKey: 'stock',
        sortable: true,
        align: 'center',
        sortValue: (product) => product.stock,
        cell: (product) => (
          <span className="font-mono font-medium text-slate-700">
            {product.stock}
          </span>
        ),
      },
      {
        header: 'Status',
        align: 'center',
        cell: (product) => {
          const isOutOfStock = product.stock <= 0;
          const isLowStock = product.stock > 0 && product.stock <= 5;

          if (isOutOfStock) {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Habis
              </span>
            );
          }
          if (isLowStock) {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Menipis
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Tersedia
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Katalog Produk</h1>
          <p className="mt-1 text-xs text-slate-500">
            Daftar seluruh item dan status ketersediaan inventaris terkini
          </p>
        </div>
      </div>

      <DataTable<Product>
        data={products}
        columns={columns}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyMessage="Tidak ada produk ditemukan."
        searchPlaceholder="Cari nama atau kode produk..."
        showNumbering={true}
        numberingHeader="#"
        initialPageSize={10}
        pageSizeOptions={[5, 10, 25, 50]}
      />
    </div>
  );
}
