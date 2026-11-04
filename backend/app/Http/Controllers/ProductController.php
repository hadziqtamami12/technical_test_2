<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductStoreRequest;
use App\Http\Requests\ProductUpdateRequest;
use App\Http\Responses\ApiResponse;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * ProductController constructor.
     *
     * @param ProductService $productService
     */
    public function __construct(
        private readonly ProductService $productService
    ) {}

    /**
     * Display a listing of products.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $products = $this->productService->getPaginatedProducts($request->all());

        return ApiResponse::success($products, 'Data produk berhasil diambil.', 200);
    }

    /**
     * Store a newly created product.
     *
     * @param ProductStoreRequest $request
     * @return JsonResponse
     */
    public function store(ProductStoreRequest $request): JsonResponse
    {
        $product = $this->productService->storeProduct($request->validated());

        return ApiResponse::success($product, 'Produk berhasil ditambahkan.', 201);
    }

    /**
     * Display the specified product.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        $product = $this->productService->findProduct($id);

        return ApiResponse::success($product, 'Detail produk berhasil diambil.', 200);
    }

    /**
     * Update the specified product.
     *
     * @param ProductUpdateRequest $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(ProductUpdateRequest $request, int $id): JsonResponse
    {
        $product = $this->productService->updateProduct($id, $request->validated());

        return ApiResponse::success($product, 'Produk berhasil diperbarui.', 200);
    }
}

