<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

class ApiResponse
{
    /**
     * Return a standardized success JSON response.
     *
     * @param mixed $data
     * @param string $message
     * @param int $status
     * @param array<string, mixed>|object $meta
     * @return JsonResponse
     */
    public static function success(
        mixed $data = null,
        string $message = 'OK',
        int $status = 200,
        array|object $meta = new \stdClass()
    ): JsonResponse {
        if ($data instanceof LengthAwarePaginator) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $data->items(),
                'meta' => [
                    'current_page' => $data->currentPage(),
                    'per_page' => $data->perPage(),
                    'total' => $data->total(),
                    'last_page' => $data->lastPage(),
                ],
            ], $status);
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => is_array($meta) && empty($meta) ? new \stdClass() : $meta,
        ], $status);
    }

    /**
     * Return a standardized error JSON response.
     *
     * @param string $message
     * @param mixed $errors
     * @param int $status
     * @return JsonResponse
     */
    public static function error(
        string $message,
        mixed $errors = new \stdClass(),
        int $status = 400
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => is_array($errors) && empty($errors) ? new \stdClass() : $errors,
        ], $status);
    }
}

