<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class OrderService
{
    /**
     * Create a new order with stock validation, pessimistic locking, and idempotency check.
     *
     * @param array<string, mixed> $payload
     * @param string|null $idempotencyKey
     * @return Order
     *
     * @throws ValidationException
     */
    public function createOrder(array $payload, ?string $idempotencyKey = null): Order
    {
        if (! empty($idempotencyKey)) {
            $existingOrder = Order::query()
                ->with(['customer', 'items.product'])
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existingOrder) {
                return $existingOrder;
            }
        }

        try {
            return DB::transaction(function () use ($payload, $idempotencyKey): Order {
                if (! empty($idempotencyKey)) {
                    $existingOrder = Order::query()
                        ->with(['customer', 'items.product'])
                        ->where('idempotency_key', $idempotencyKey)
                        ->lockForUpdate()
                        ->first();

                    if ($existingOrder) {
                        return $existingOrder;
                    }
                }

                $customerId = (int) $payload['customer_id'];
                $pendingOrdersCount = Order::query()
                    ->where('customer_id', $customerId)
                    ->where('status', 'PENDING')
                    ->count();

                if ($pendingOrdersCount >= 3) {
                    throw ValidationException::withMessages([
                        'customer_id' => ['Pelanggan telah mencapai batas maksimal 3 order berstatus PENDING.'],
                    ]);
                }

                foreach ($payload['items'] as $index => $item) {
                    if ((int) $item['quantity'] > 5) {
                        throw ValidationException::withMessages([
                            "items.{$index}.quantity" => ['Maksimal pembelian 5 unit per produk dalam satu order.'],
                        ]);
                    }
                }

                $productIds = collect($payload['items'])->pluck('product_id')->unique()->all();

                $products = Product::query()
                    ->whereIn('id', $productIds)
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                $subtotal = 0.00;

                foreach ($payload['items'] as $index => $item) {
                    $productId = (int) $item['product_id'];
                    $quantity = (int) $item['quantity'];

                    /** @var Product|null $product */
                    $product = $products->get($productId);

                    if (! $product) {
                        throw ValidationException::withMessages([
                            "items.{$index}.product_id" => ["Produk dengan ID {$productId} tidak ditemukan."],
                        ]);
                    }

                    if ($product->stock < $quantity) {
                        throw ValidationException::withMessages([
                            "items.{$index}.quantity" => [
                                "Stok {$product->name} tersisa {$product->stock}, diminta {$quantity}",
                            ],
                        ]);
                    }

                    $subtotal += round(((float) $product->price) * $quantity, 2);
                }

                $discountAmount = 0.00;
                if ($subtotal >= 1000000.00) {
                    $discountAmount = $subtotal * 0.10;
                } elseif ($subtotal >= 500000.00) {
                    $discountAmount = $subtotal * 0.05;
                }

                if ($discountAmount > 150000.00) {
                    $discountAmount = 150000.00;
                }
                $discountAmount = round($discountAmount, 2);

                $rawTax = $subtotal * 0.11;
                $taxAmount = (float) (ceil($rawTax / 100) * 100);

                $grandTotal = round($subtotal - $discountAmount + $taxAmount, 2);

                $orderNumber = $this->generateOrderNumber();

                foreach ($payload['items'] as $item) {
                    $product = $products->get((int) $item['product_id']);
                    $product->decrement('stock', (int) $item['quantity']);
                }

                $order = Order::query()->create([
                    'order_number' => $orderNumber,
                    'customer_id' => $customerId,
                    'status' => 'PENDING',
                    'subtotal' => $subtotal,
                    'discount_amount' => $discountAmount,
                    'tax_amount' => $taxAmount,
                    'grand_total' => $grandTotal,
                    'idempotency_key' => $idempotencyKey,
                ]);

                foreach ($payload['items'] as $item) {
                    $product = $products->get((int) $item['product_id']);
                    $itemQty = (int) $item['quantity'];
                    $itemPrice = (float) $product->price;
                    $itemSubtotal = round($itemPrice * $itemQty, 2);

                    OrderItem::query()->create([
                        'order_id' => $order->id,
                        'product_id' => $product->id,
                        'product_code_snapshot' => $product->product_code,
                        'product_name_snapshot' => $product->name,
                        'price_snapshot' => $itemPrice,
                        'quantity' => $itemQty,
                        'subtotal' => $itemSubtotal,
                    ]);
                }

                return $order->load(['customer', 'items.product']);
            });
        } catch (QueryException $e) {
            if (! empty($idempotencyKey)) {
                $existing = Order::query()
                    ->with(['customer', 'items.product'])
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($existing) {
                    return $existing;
                }
            }

            throw $e;
        }
    }

    /**
     * Mark an order as paid.
     *
     * @param int $orderId
     * @return Order
     *
     * @throws ConflictHttpException
     */
    public function payOrder(int $orderId): Order
    {
        return DB::transaction(function () use ($orderId): Order {
            $order = Order::query()->lockForUpdate()->findOrFail($orderId);

            if ($order->status !== 'PENDING') {
                throw new ConflictHttpException(
                    "Pesanan tidak dapat dibayar karena status saat ini adalah {$order->status}."
                );
            }

            $order->update(['status' => 'PAID']);

            return $order->fresh(['customer', 'items.product']);
        });
    }

    /**
     * Cancel an order and restore product stocks atomically.
     *
     * @param int $orderId
     * @return Order
     *
     * @throws ConflictHttpException
     */
    public function cancelOrder(int $orderId): Order
    {
        return DB::transaction(function () use ($orderId): Order {
            $order = Order::query()
                ->with('items')
                ->lockForUpdate()
                ->findOrFail($orderId);

            if ($order->status === 'CANCELLED') {
                throw new ConflictHttpException(
                    'Pesanan sudah dibatalkan sebelumnya.'
                );
            }

            if (! in_array($order->status, ['PENDING', 'PAID'], true)) {
                throw new ConflictHttpException(
                    "Pesanan dengan status {$order->status} tidak dapat dibatalkan."
                );
            }

            $order->update(['status' => 'CANCELLED']);

            foreach ($order->items as $item) {
                Product::query()
                    ->where('id', $item->product_id)
                    ->increment('stock', $item->quantity);
            }

            return $order->fresh(['customer', 'items.product']);
        });
    }

    /**
     * Get paginated order history with status and date filters.
     *
     * @param array<string, mixed> $filters
     * @return LengthAwarePaginator
     */
    public function getOrderHistory(array $filters = []): LengthAwarePaginator
    {
        $query = Order::query()->with(['customer', 'items.product']);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        $perPage = isset($filters['per_page']) ? (int) $filters['per_page'] : 15;

        return $query->latest('id')->paginate($perPage);
    }

    /**
     * Get single order detail with customer and order items.
     *
     * @param int $orderId
     * @return Order
     */
    public function getOrderDetail(int $orderId): Order
    {
        return Order::query()
            ->with(['customer', 'items.product'])
            ->findOrFail($orderId);
    }

    /**
     * Generate an invoice order number in INV-YYYYMMDD-XXXX format.
     *
     * @return string
     */
    private function generateOrderNumber(): string
    {
        $dateStr = Carbon::now()->format('Ymd');
        $prefix = "INV-{$dateStr}-";

        $countToday = Order::query()
            ->where('order_number', 'like', "{$prefix}%")
            ->count();

        $sequence = $countToday + 1;
        $orderNumber = sprintf('%s%04d', $prefix, $sequence);

        while (Order::query()->where('order_number', $orderNumber)->exists()) {
            $sequence++;
            $orderNumber = sprintf('%s%04d', $prefix, $sequence);
        }

        return $orderNumber;
    }
}

