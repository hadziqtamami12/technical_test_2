<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ProductService
{
    /**
     * Retrieve paginated products with optional search query.
     *
     * @param array<string, mixed> $filters
     * @return LengthAwarePaginator
     */
    public function getPaginatedProducts(array $filters = []): LengthAwarePaginator
    {
        $query = Product::query();

        if (! empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%");
            });
        }

        $perPage = isset($filters['per_page']) ? (int) $filters['per_page'] : 15;

        return $query->latest('id')->paginate($perPage);
    }

    /**
     * Store a newly created product.
     *
     * @param array<string, mixed> $data
     * @return Product
     */
    public function storeProduct(array $data): Product
    {
        return Product::query()->create($data);
    }

    /**
     * Update an existing product.
     *
     * @param int $id
     * @param array<string, mixed> $data
     * @return Product
     */
    public function updateProduct(int $id, array $data): Product
    {
        $product = Product::query()->findOrFail($id);
        $product->update($data);

        return $product;
    }

    /**
     * Find a product by ID.
     *
     * @param int $id
     * @return Product
     */
    public function findProduct(int $id): Product
    {
        return Product::query()->findOrFail($id);
    }
}

