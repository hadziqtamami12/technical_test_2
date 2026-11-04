'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { apiClient } from '@/services/api';
import { ApiResponse, Customer, Product, Order } from '@/types';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';

interface OrderItemForm {
  product_id: number | '';
  quantity: number;
}

/**
 * Order creation page with dynamic rows, live business calculations, and stock error mapping.
 */
export default function CreateOrderPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [items, setItems] = useState<OrderItemForm[]>([{ product_id: '', quantity: 1 }]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});

  const [idempotencyKey] = useState<string>(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `IDEMP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customerRes, productRes] = await Promise.all([
          apiClient.get<ApiResponse<Customer[]>>('/customers'),
          apiClient.get<ApiResponse<Product[]>>('/products', { params: { per_page: 100 } }),
        ]);

        if (customerRes.data.success) {
          setCustomers(customerRes.data.data);
          if (customerRes.data.data.length > 0) {
            setSelectedCustomerId(customerRes.data.data[0].id);
          }
        }

        if (productRes.data.success) {
          setProducts(productRes.data.data);
        }
      } catch {
        setGlobalError('Gagal memuat data pelanggan dan produk.');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const calculations = useMemo(() => {
    let subtotal = 0;

    items.forEach((item) => {
      if (typeof item.product_id === 'number') {
        const prod = productMap.get(item.product_id);
        if (prod) {
          subtotal += Number(prod.price) * item.quantity;
        }
      }
    });

    let discount = 0;
    let discountLabel = '0%';
    if (subtotal >= 1000000) {
      discount = subtotal * 0.1;
      discountLabel = '10%';
    } else if (subtotal >= 500000) {
      discount = subtotal * 0.05;
      discountLabel = '5%';
    }

    if (discount > 150000) {
      discount = 150000;
      discountLabel = `${discountLabel} (Maks. Rp 150.000)`;
    }

    const rawTax = subtotal * 0.11;
    const tax = Math.ceil(rawTax / 100) * 100;
    const grandTotal = Math.max(0, subtotal - discount + tax);

    return {
      subtotal,
      discount,
      discountLabel,
      tax,
      grandTotal,
    };
  }, [items, productMap]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { product_id: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
    setServerErrors((prev) => {
      const next = { ...prev };
      delete next[`items.${index}.quantity`];
      delete next[`items.${index}.product_id`];
      return next;
    });
  };

  const handleItemChange = (index: number, field: keyof OrderItemForm, value: number | '') => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    setServerErrors((prev) => {
      const next = { ...prev };
      delete next[`items.${index}.${field}`];
      return next;
    });
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const customerOptions = useMemo<SelectOption[]>(() => {
    return customers.map((c) => ({
      value: c.id,
      label: `[${c.customer_code}] ${c.name}`,
      subLabel: `${c.email} • ${c.phone}`,
    }));
  }, [customers]);

  const productOptions = useMemo<SelectOption[]>(() => {
    return products.map((p) => ({
      value: p.id,
      label: `[${p.product_code}] ${p.name}`,
      subLabel: `Harga: ${formatRupiah(Number(p.price))} | Sisa Stok: ${p.stock}`,
      disabled: p.stock <= 0,
      badge: p.stock <= 0 ? 'Habis' : p.stock <= 5 ? `Sisa ${p.stock}` : undefined,
    }));
  }, [products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setServerErrors({});

    if (!selectedCustomerId) {
      setGlobalError('Silakan pilih pelanggan terlebih dahulu.');
      return;
    }

    const validItems = items.filter((item) => typeof item.product_id === 'number');
    if (validItems.length === 0) {
      setGlobalError('Pilih minimal satu produk untuk dipesan.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customer_id: Number(selectedCustomerId),
        items: validItems.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
        })),
      };

      const response = await apiClient.post<ApiResponse<Order>>('/orders', payload, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      if (response.data.success && response.data.data) {
        router.push(`/orders/${response.data.data.id}`);
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse>;
      const responseData = axiosError.response?.data;

      if (responseData) {
        if (responseData.errors) {
          setServerErrors(responseData.errors);
          if (responseData.errors.customer_id) {
            setGlobalError(responseData.errors.customer_id[0]);
          }
        }
        if (!responseData.errors?.customer_id) {
          setGlobalError(responseData.message || 'Gagal membuat pesanan.');
        }
      } else {
        setGlobalError('Terjadi kesalahan jaringan.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
          <div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
          <div className="h-10 w-full max-w-md bg-slate-100 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buat Pesanan Baru</h1>
        <p className="mt-1 text-xs text-slate-500">
          Form checkout order enterprise dengan validasi stok atomik dan diskon bertingkat
        </p>
      </div>

      {globalError && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-800 flex items-center justify-between">
          <div>{globalError}</div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Informasi Pelanggan
          </h2>
          <div className="max-w-md">
            <SearchableSelect
              label="Pilih Pelanggan"
              required
              options={customerOptions}
              value={selectedCustomerId}
              onChange={(val) => setSelectedCustomerId(Number(val))}
              placeholder="-- Pilih Pelanggan --"
              searchPlaceholder="Cari nama, kode pelanggan, atau email..."
              error={serverErrors.customer_id ? serverErrors.customer_id[0] : undefined}
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              * Pelanggan dibatasi maksimal 3 order aktif berstatus PENDING.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Item Pesanan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Maksimal 5 unit per produk dalam satu order.</p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer shadow-xs"
            >
              + Tambah
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const selectedProd = typeof item.product_id === 'number' ? productMap.get(item.product_id) : null;
              const quantityErrorKey = `items.${index}.quantity`;
              const productErrorKey = `items.${index}.product_id`;
              const itemSubtotal = selectedProd ? Number(selectedProd.price) * item.quantity : 0;

              return (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    <div className="md:col-span-6">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pilih Produk #{index + 1} <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        options={productOptions}
                        value={item.product_id}
                        onChange={(val) => handleItemChange(index, 'product_id', Number(val))}
                        placeholder="-- Pilih Produk --"
                        searchPlaceholder="Cari kode atau nama produk..."
                        error={serverErrors[productErrorKey] ? serverErrors[productErrorKey][0] : undefined}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kuantitas (Maks 5)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                        }
                        required
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subtotal Item
                      </label>
                      <div className="py-2 text-sm font-bold text-slate-900">
                        {formatRupiah(itemSubtotal)}
                      </div>
                    </div>

                    <div className="md:col-span-1 pt-6 text-right">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  {serverErrors[quantityErrorKey] && (
                    <div className="mt-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-md">
                      ⚠️ {serverErrors[quantityErrorKey][0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
            Ringkasan Biaya
          </h2>
          <div className="space-y-2 text-sm max-w-md ml-auto">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">
                {formatRupiah(calculations.subtotal)}
              </span>
            </div>

            <div className="flex justify-between text-emerald-700">
              <span>Diskon Bertingkat ({calculations.discountLabel}):</span>
              <span className="font-semibold">
                - {formatRupiah(calculations.discount)}
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>PPN 11% (Dibulatkan ke atas Rp 100):</span>
              <span className="font-semibold text-slate-900">
                + {formatRupiah(calculations.tax)}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between text-base font-bold text-slate-950">
              <span>Grand Total:</span>
              <span className="text-slate-900 font-mono text-lg">
                {formatRupiah(calculations.grandTotal)}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 font-mono">
              Idempotency-Key: {idempotencyKey.slice(0, 18)}...
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
            >
              {isSubmitting ? 'Memproses Order...' : 'Konfirmasi & Buat Pesanan'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
