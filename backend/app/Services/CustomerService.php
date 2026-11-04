<?php

namespace App\Services;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Collection;

class CustomerService
{
    /**
     * Retrieve all customers or search by name/code.
     *
     * @param array<string, mixed> $filters
     * @return Collection<int, Customer>
     */
    public function listCustomers(array $filters = []): Collection
    {
        $query = Customer::query();

        if (! empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('customer_code', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('name')->get();
    }

    /**
     * Store a newly created customer.
     *
     * @param array<string, mixed> $data
     * @return Customer
     */
    public function storeCustomer(array $data): Customer
    {
        if (empty($data['customer_code'])) {
            $count = Customer::query()->count() + 1;
            $data['customer_code'] = sprintf('CUST-%03d', $count);
        }

        return Customer::query()->create($data);
    }

    /**
     * Find a customer by ID.
     *
     * @param int $id
     * @return Customer
     */
    public function findCustomer(int $id): Customer
    {
        return Customer::query()->findOrFail($id);
    }
}

