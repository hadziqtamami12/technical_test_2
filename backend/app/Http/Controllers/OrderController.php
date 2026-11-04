<?php

namespace App\Http\Controllers;

use App\Http\Requests\OrderCreateRequest;
use App\Http\Responses\ApiResponse;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    /**
     * OrderController constructor.
     *
     * @param OrderService $orderService
     */
    public function __construct(
        private readonly OrderService $orderService
    ) {}

    /**
     * Display a listing of orders.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $orders = $this->orderService->getOrderHistory($request->all());

        return ApiResponse::success($orders, 'Data order berhasil diambil.', 200);
    }

    /**
     * Store a newly created order.
     *
     * @param OrderCreateRequest $request
     * @return JsonResponse
     */
    public function store(OrderCreateRequest $request): JsonResponse
    {
        $idempotencyKey = $request->header('Idempotency-Key') ?: $request->input('idempotency_key');
        $order = $this->orderService->createOrder($request->validated(), $idempotencyKey);

        return ApiResponse::success($order, 'Order berhasil dibuat.', 201);
    }

    /**
     * Display the specified order.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        $order = $this->orderService->getOrderDetail($id);

        return ApiResponse::success($order, 'Detail order berhasil diambil.', 200);
    }

    /**
     * Update order status to paid.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function pay(int $id): JsonResponse
    {
        $order = $this->orderService->payOrder($id);

        return ApiResponse::success($order, 'Order berhasil dibayar.', 200);
    }

    /**
     * Cancel the specified order and restore stock.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function cancel(int $id): JsonResponse
    {
        $order = $this->orderService->cancelOrder($id);

        return ApiResponse::success($order, 'Order berhasil dibatalkan.', 200);
    }
}

