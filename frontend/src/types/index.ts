/**
 * User representation in the system.
 */
export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Product item in catalog.
 */
export interface Product {
  id: number;
  product_code: string;
  name: string;
  description: string | null;
  price: string | number;
  stock: number;
  created_at: string;
  updated_at: string;
}

/**
 * Customer profile.
 */
export interface Customer {
  id: number;
  customer_code: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Snapshot of an ordered item.
 */
export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_code_snapshot: string;
  product_name_snapshot: string;
  price_snapshot: string | number;
  quantity: number;
  subtotal: string | number;
  product?: Product;
}

/**
 * Order entity with pricing snapshots and status.
 */
export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  subtotal: string | number;
  discount_amount: string | number;
  tax_amount: string | number;
  grand_total: string | number;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: OrderItem[];
}

/**
 * Pagination metadata format.
 */
export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

/**
 * Standard backend response wrapper.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
  errors?: Record<string, string[]>;
}

