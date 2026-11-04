<?php

namespace App\Http\Controllers;

use App\Http\Requests\CustomerStoreRequest;
use App\Http\Responses\ApiResponse;
use App\Services\CustomerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    /**
     * CustomerController constructor.
     *
     * @param CustomerService $customerService
     */
    public function __construct(
        private readonly CustomerService $customerService
    ) {}

    /**
     * Display a listing of customers.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $customers = $this->customerService->listCustomers($request->all());

        return ApiResponse::success($customers, 'Data pelanggan berhasil diambil.', 200);
    }

    /**
     * Store a newly created customer.
     *
     * @param CustomerStoreRequest $request
     * @return JsonResponse
     */
    public function store(CustomerStoreRequest $request): JsonResponse
    {
        $customer = $this->customerService->storeCustomer($request->validated());

        return ApiResponse::success($customer, 'Pelanggan berhasil ditambahkan.', 201);
    }

    /**
     * Display the specified customer.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        $customer = $this->customerService->findCustomer($id);

        return ApiResponse::success($customer, 'Detail pelanggan berhasil diambil.', 200);
    }
}

