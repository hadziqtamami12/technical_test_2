<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Customer $customer;

    /**
     * Setup test dependencies.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create();
        $this->customer = Customer::query()->create([
            'customer_code' => 'CUST-TEST-1',
            'name' => 'Budi Santoso',
            'email' => 'budi.test@example.com',
            'phone' => '081234567890',
        ]);
    }

    /**
     * Scenario 1: Access protected endpoints without Sanctum token returns HTTP 401.
     */
    public function test_accessing_order_endpoints_without_token_returns_unauthorized(): void
    {
        $this->postJson('/api/orders', [])->assertStatus(401);
        $this->getJson('/api/orders')->assertStatus(401);
        $this->getJson('/api/orders/1')->assertStatus(401);
        $this->patchJson('/api/orders/1/pay')->assertStatus(401);
        $this->patchJson('/api/orders/1/cancel')->assertStatus(401);
    }

    /**
     * Scenario 2: Successful order creation decrements product stock and saves snapshots.
     */
    public function test_order_creation_success(): void
    {
        Sanctum::actingAs($this->admin);

        $product1 = Product::query()->create([
            'product_code' => 'PRD-T1',
            'name' => 'Mousepad Gaming',
            'description' => 'Mousepad Deskmat',
            'price' => 100000.00,
            'stock' => 10,
        ]);

        $product2 = Product::query()->create([
            'product_code' => 'PRD-T2',
            'name' => 'Mechanical Switch',
            'description' => 'Linear Switch',
            'price' => 50000.00,
            'stock' => 20,
        ]);

        $payload = [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $product1->id,
                    'quantity' => 2,
                ],
                [
                    'product_id' => $product2->id,
                    'quantity' => 3,
                ],
            ],
        ];

        $response = $this->postJson('/api/orders', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Order berhasil dibuat.',
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'order_number',
                    'status',
                    'subtotal',
                    'discount_amount',
                    'tax_amount',
                    'grand_total',
                    'customer',
                    'items',
                ],
            ]);

        $this->assertDatabaseHas('orders', [
            'customer_id' => $this->customer->id,
            'status' => 'PENDING',
            'subtotal' => 350000.00,
        ]);

        $this->assertEquals(8, $product1->fresh()->stock);
        $this->assertEquals(17, $product2->fresh()->stock);

        $this->assertDatabaseHas('order_items', [
            'product_id' => $product1->id,
            'product_code_snapshot' => 'PRD-T1',
            'product_name_snapshot' => 'Mousepad Gaming',
            'price_snapshot' => 100000.00,
            'quantity' => 2,
            'subtotal' => 200000.00,
        ]);
    }

    /**
     * Scenario 3: Order creation fails when stock is insufficient, triggers full rollback.
     */
    public function test_order_creation_fails_when_stock_insufficient(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::query()->create([
            'product_code' => 'PRD-LOW',
            'name' => 'Limited Edition Keyboard',
            'description' => 'Rare item',
            'price' => 500000.00,
            'stock' => 2,
        ]);

        $payload = [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 5,
                ],
            ],
        ];

        $response = $this->postJson('/api/orders', $payload);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);

        $errors = $response->json('errors');
        $this->assertArrayHasKey('items.0.quantity', $errors);
        $this->assertStringContainsString('tersisa 2, diminta 5', $errors['items.0.quantity'][0]);

        $this->assertEquals(2, $product->fresh()->stock);
        $this->assertEquals(0, Order::query()->count());
    }

    /**
     * Scenario 4: Cancelling an order restores product stock to original condition.
     */
    public function test_order_cancellation_restores_product_stock(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::query()->create([
            'product_code' => 'PRD-CANC',
            'name' => 'USB Cable',
            'description' => 'Cable Type C',
            'price' => 50000.00,
            'stock' => 10,
        ]);

        $createResponse = $this->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 3,
                ],
            ],
        ]);

        $orderId = $createResponse->json('data.id');
        $this->assertEquals(7, $product->fresh()->stock);

        $cancelResponse = $this->patchJson("/api/orders/{$orderId}/cancel");

        $cancelResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $orderId,
                    'status' => 'CANCELLED',
                ],
            ]);

        $this->assertEquals(10, $product->fresh()->stock);
    }

    /**
     * Scenario 5: Invalid status transition rejected with HTTP 409 Conflict.
     */
    public function test_invalid_status_transition_returns_conflict(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::query()->create([
            'product_code' => 'PRD-TRANS',
            'name' => 'Earbuds',
            'description' => 'TWS',
            'price' => 100000.00,
            'stock' => 10,
        ]);

        $createResponse = $this->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $orderId = $createResponse->json('data.id');

        $this->patchJson("/api/orders/{$orderId}/cancel")->assertStatus(200);

        $invalidPayResponse = $this->patchJson("/api/orders/{$orderId}/pay");
        $invalidPayResponse->assertStatus(409)
            ->assertJson([
                'success' => false,
            ]);

        $invalidCancelAgain = $this->patchJson("/api/orders/{$orderId}/cancel");
        $invalidCancelAgain->assertStatus(409)
            ->assertJson([
                'success' => false,
            ]);
    }

    /**
     * Scenario 6: Business rules verification (Tiered discount & VAT calculation).
     */
    public function test_tiered_discount_and_vat_calculation(): void
    {
        Sanctum::actingAs($this->admin);

        $product1 = Product::query()->create([
            'product_code' => 'PRD-TIER-1',
            'name' => 'Mechanical Keyboard',
            'description' => 'Keyboard',
            'price' => 600000.00,
            'stock' => 10,
        ]);

        $response1 = $this->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $product1->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $response1->assertStatus(201);
        $this->assertEquals(600000.00, (float) $response1->json('data.subtotal'));
        $this->assertEquals(30000.00, (float) $response1->json('data.discount_amount'));
        $this->assertEquals(66000.00, (float) $response1->json('data.tax_amount'));
        $this->assertEquals(636000.00, (float) $response1->json('data.grand_total'));

        $product2 = Product::query()->create([
            'product_code' => 'PRD-TIER-2',
            'name' => 'High End Monitor',
            'description' => 'Monitor',
            'price' => 2000000.00,
            'stock' => 10,
        ]);

        $response2 = $this->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $product2->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $response2->assertStatus(201);
        $this->assertEquals(2000000.00, (float) $response2->json('data.subtotal'));
        $this->assertEquals(150000.00, (float) $response2->json('data.discount_amount'));
        $this->assertEquals(220000.00, (float) $response2->json('data.tax_amount'));
        $this->assertEquals(2070000.00, (float) $response2->json('data.grand_total'));
    }

    /**
     * Scenario 6b: Purchase limit rules (max 5 units per product & max 3 pending orders).
     */
    public function test_purchase_limit_rules_enforced(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::query()->create([
            'product_code' => 'PRD-LIM',
            'name' => 'Gaming Mouse',
            'description' => 'Mouse',
            'price' => 100000.00,
            'stock' => 50,
        ]);

        $exceedUnitResponse = $this->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 6,
                ],
            ],
        ]);

        $exceedUnitResponse->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.quantity']);

        Order::query()->create([
            'order_number' => 'INV-20261103-9001',
            'customer_id' => $this->customer->id,
            'status' => 'PENDING',
            'subtotal' => 100000,
            'grand_total' => 100000,
        ]);
        Order::query()->create([
            'order_number' => 'INV-20261103-9002',
            'customer_id' => $this->customer->id,
            'status' => 'PENDING',
            'subtotal' => 100000,
            'grand_total' => 100000,
        ]);
        Order::query()->create([
            'order_number' => 'INV-20261103-9003',
            'customer_id' => $this->customer->id,
            'status' => 'PENDING',
            'subtotal' => 100000,
            'grand_total' => 100000,
        ]);

        $exceedPendingResponse = $this->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $exceedPendingResponse->assertStatus(422)
            ->assertJsonValidationErrors(['customer_id']);
    }

    /**
     * Scenario 7: Idempotency Key prevents duplicate orders and double decrement.
     */
    public function test_idempotency_key_prevents_duplicate_orders(): void
    {
        Sanctum::actingAs($this->admin);

        $product = Product::query()->create([
            'product_code' => 'PRD-IDEMP',
            'name' => 'Webcam HD',
            'description' => 'Webcam',
            'price' => 200000.00,
            'stock' => 10,
        ]);

        $payload = [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                ],
            ],
        ];

        $idempotencyKey = 'IDEMP-TEST-KEY-12345';

        $firstResponse = $this->withHeader('Idempotency-Key', $idempotencyKey)
            ->postJson('/api/orders', $payload);

        $firstResponse->assertStatus(201);
        $firstOrderId = $firstResponse->json('data.id');
        $firstOrderNumber = $firstResponse->json('data.order_number');

        $this->assertEquals(8, $product->fresh()->stock);
        $this->assertEquals(1, Order::query()->count());

        $secondResponse = $this->withHeader('Idempotency-Key', $idempotencyKey)
            ->postJson('/api/orders', $payload);

        $secondResponse->assertSuccessful();
        $this->assertEquals($firstOrderId, $secondResponse->json('data.id'));
        $this->assertEquals($firstOrderNumber, $secondResponse->json('data.order_number'));

        $this->assertEquals(8, $product->fresh()->stock);
        $this->assertEquals(1, Order::query()->count());
    }
}
