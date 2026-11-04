<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductAndCustomerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    /**
     * Setup authenticated admin user.
     */
    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create();
    }

    /**
     * Test retrieving products with search filter.
     */
    public function test_can_list_and_search_products(): void
    {
        Sanctum::actingAs($this->admin);

        Product::query()->create([
            'product_code' => 'SKU-001',
            'name' => 'Mechanical Keyboard Blue',
            'description' => 'Keyboard',
            'price' => 500000.00,
            'stock' => 10,
        ]);

        Product::query()->create([
            'product_code' => 'SKU-002',
            'name' => 'Mouse Wireless Ergonomic',
            'description' => 'Mouse',
            'price' => 250000.00,
            'stock' => 15,
        ]);

        $response = $this->getJson('/api/products?search=Keyboard');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('SKU-001', $data[0]['product_code']);
    }

    /**
     * Test product creation with validation.
     */
    public function test_can_create_product(): void
    {
        Sanctum::actingAs($this->admin);

        $payload = [
            'product_code' => 'SKU-NEW-01',
            'name' => 'Ultrawide Monitor 34 Inch',
            'description' => 'Curved monitor',
            'price' => 4500000.00,
            'stock' => 8,
        ];

        $response = $this->postJson('/api/products', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'product_code' => 'SKU-NEW-01',
                ],
            ]);

        $this->assertDatabaseHas('products', [
            'product_code' => 'SKU-NEW-01',
        ]);
    }

    /**
     * Test product update.
     */
    public function test_can_update_product(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::query()->create([
            'product_code' => 'SKU-UPDATE-1',
            'name' => 'Original Name',
            'description' => 'Description',
            'price' => 100000.00,
            'stock' => 10,
        ]);

        $response = $this->putJson("/api/products/{$product->id}", [
            'product_code' => 'SKU-UPDATE-1',
            'name' => 'Updated Name',
            'description' => 'Updated Description',
            'price' => 120000.00,
            'stock' => 14,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Updated Name',
                    'stock' => 14,
                ],
            ]);

        $this->assertEquals('Updated Name', $product->fresh()->name);
    }

    /**
     * Test customer listing and creation.
     */
    public function test_can_list_and_create_customers(): void
    {
        Sanctum::actingAs($this->admin);

        $responseCreate = $this->postJson('/api/customers', [
            'name' => 'Citra Dewi',
            'email' => 'citra@example.com',
            'phone' => '081233445566',
        ]);

        $responseCreate->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Citra Dewi',
                    'email' => 'citra@example.com',
                ],
            ]);

        $responseList = $this->getJson('/api/customers');
        $responseList->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertNotEmpty($responseList->json('data'));
    }
}

