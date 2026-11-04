<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Responses\ApiResponse;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    /**
     * AuthController constructor.
     *
     * @param AuthService $authService
     */
    public function __construct(
        private readonly AuthService $authService
    ) {}

    /**
     * Handle user login.
     *
     * @param LoginRequest $request
     * @return JsonResponse
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->validated());

        return ApiResponse::success($result, 'Login berhasil.', 200);
    }

    /**
     * Handle user logout.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return ApiResponse::success(null, 'Logout berhasil.', 200);
    }

    /**
     * Get current authenticated user profile.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success($request->user(), 'Data user ditemukan.', 200);
    }
}

