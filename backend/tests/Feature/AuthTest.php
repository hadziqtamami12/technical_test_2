<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test successful login with valid credentials.
     */
    public function test_user_can_login_with_valid_credentials(): void
    {
        User::factory()->create([
            'email' => 'admin@tokoonline.com',
            'password' => Hash::make('Password123!'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'admin@tokoonline.com',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Login berhasil.',
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => ['id', 'name', 'email'],
                    'token',
                ],
                'meta',
            ]);
    }

    /**
     * Test failed login with invalid credentials returns HTTP 422.
     */
    public function test_login_fails_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'admin@tokoonline.com',
            'password' => Hash::make('Password123!'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'admin@tokoonline.com',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'errors' => ['email'],
            ]);
    }

    /**
     * Test accessing protected endpoint without token returns HTTP 401.
     */
    public function test_accessing_protected_endpoint_without_token_returns_unauthorized(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthenticated.',
            ]);
    }

    /**
     * Test authenticated user can access profile.
     */
    public function test_authenticated_user_can_access_profile(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/me');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $user->id,
                    'email' => $user->email,
                ],
            ]);
    }

    /**
     * Test authenticated user can logout.
     */
    public function test_authenticated_user_can_logout(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Logout berhasil.',
            ]);
    }
}

