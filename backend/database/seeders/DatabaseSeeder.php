<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@tokoonline.com'],
            [
                'name' => 'Administrator',
                'role' => 'admin',
                'password' => Hash::make('Password123!'),
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'manager@tokoonline.com'],
            [
                'name' => 'Store Manager',
                'role' => 'manager',
                'password' => Hash::make('Password123!'),
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'staff@tokoonline.com'],
            [
                'name' => 'Staff Operasional',
                'role' => 'staff',
                'password' => Hash::make('Password123!'),
            ]
        );

        $products = [
            [
                'product_code' => 'PRD-001',
                'name' => 'Mechanical Keyboard RGB TKL',
                'description' => 'Keyboard mekanik dengan switch tactile dan RGB backlight',
                'price' => 450000.00,
                'stock' => 25,
            ],
            [
                'product_code' => 'PRD-002',
                'name' => 'Wireless Gaming Mouse 16000 DPI',
                'description' => 'Mouse gaming wireless ultra-ringan dengan sensor optik presisi',
                'price' => 320000.00,
                'stock' => 40,
            ],
            [
                'product_code' => 'PRD-003',
                'name' => 'Monitor Gaming 24 Inch 144Hz IPS',
                'description' => 'Monitor gaming FHD 1080p panel IPS dengan response time 1ms',
                'price' => 1750000.00,
                'stock' => 15,
            ],
            [
                'product_code' => 'PRD-004',
                'name' => 'Headset Gaming 7.1 Surround Sound',
                'description' => 'Headset gaming dengan noise-cancelling microphone',
                'price' => 380000.00,
                'stock' => 30,
            ],
            [
                'product_code' => 'PRD-005',
                'name' => 'Mousepad Deskmat XL 900x400mm',
                'description' => 'Alas meja kerja dan gaming waterproof anti slip',
                'price' => 95000.00,
                'stock' => 60,
            ],
            [
                'product_code' => 'PRD-006',
                'name' => 'USB-C Multifunction Hub 7-in-1',
                'description' => 'Hub USB Type C dengan HDMI 4K, USB 3.0, dan slot SD Card',
                'price' => 275000.00,
                'stock' => 35,
            ],
            [
                'product_code' => 'PRD-007',
                'name' => 'Webcam Full HD 1080p with Privacy Shutter',
                'description' => 'Webcam streaming autofocus dengan mikrofon stereo',
                'price' => 310000.00,
                'stock' => 20,
            ],
            [
                'product_code' => 'PRD-008',
                'name' => 'Aluminium Laptop Stand Ergonomic',
                'description' => 'Stand laptop portable lipat bahan aluminium kokoh',
                'price' => 145000.00,
                'stock' => 50,
            ],
            [
                'product_code' => 'PRD-009',
                'name' => 'External Portable SSD 1TB USB 3.2',
                'description' => 'SSD eksternal kecepatan transfer hingga 1050 MB/s',
                'price' => 1250000.00,
                'stock' => 18,
            ],
            [
                'product_code' => 'PRD-010',
                'name' => 'True Wireless Stereo Earbuds ANC',
                'description' => 'Earphone Bluetooth dengan active noise cancellation',
                'price' => 490000.00,
                'stock' => 22,
            ],
            [
                'product_code' => 'PRD-011',
                'name' => 'Cable Organizer Magnetic Clip 5-Pack',
                'description' => 'Manajemen kabel meja kerja anti berantakan',
                'price' => 45000.00,
                'stock' => 100,
            ],
            [
                'product_code' => 'PRD-012',
                'name' => 'GaN Fast Charger 65W 3-Port',
                'description' => 'Adaptor charger cepat untuk laptop, tablet, dan smartphone',
                'price' => 260000.00,
                'stock' => 45,
            ],
            [
                'product_code' => 'PRD-013',
                'name' => 'Screenbar Monitor Light with Remote',
                'description' => 'Lampu gantung monitor pelindung mata dengan pengaturan suhu warna',
                'price' => 385000.00,
                'stock' => 28,
            ],
            [
                'product_code' => 'PRD-014',
                'name' => 'Ergonomic Vertical Mouse Wireless',
                'description' => 'Mouse bentuk vertikal ramah pergelangan tangan',
                'price' => 210000.00,
                'stock' => 30,
            ],
            [
                'product_code' => 'PRD-015',
                'name' => 'Microphone Condenser USB Cardioid',
                'description' => 'Mic rekaman podcast dan meeting online plug-and-play',
                'price' => 420000.00,
                'stock' => 16,
            ],
            [
                'product_code' => 'PRD-016',
                'name' => 'High-Speed HDMI 2.1 Cable 8K 2M',
                'description' => 'Kabel HDMI braided bandwidth tinggi 48Gbps',
                'price' => 85000.00,
                'stock' => 75,
            ],
        ];

        foreach ($products as $product) {
            Product::query()->updateOrCreate(
                ['product_code' => $product['product_code']],
                $product
            );
        }

        $customers = [
            [
                'customer_code' => 'CUST-001',
                'name' => 'Budi Santoso',
                'email' => 'budi.santoso@example.com',
                'phone' => '081234567890',
            ],
            [
                'customer_code' => 'CUST-002',
                'name' => 'Siti Rahmawati',
                'email' => 'siti.rahma@example.com',
                'phone' => '081298765432',
            ],
            [
                'customer_code' => 'CUST-003',
                'name' => 'Ahmad Fauzi',
                'email' => 'ahmad.fauzi@example.com',
                'phone' => '081377889900',
            ],
            [
                'customer_code' => 'CUST-004',
                'name' => 'Dewi Lestari',
                'email' => 'dewi.lestari@example.com',
                'phone' => '081455667788',
            ],
            [
                'customer_code' => 'CUST-005',
                'name' => 'Eko Prasetyo',
                'email' => 'eko.prasetyo@example.com',
                'phone' => '081511223344',
            ],
            [
                'customer_code' => 'CUST-006',
                'name' => 'Rina Wijaya',
                'email' => 'rina.wijaya@example.com',
                'phone' => '081622334455',
            ],
            [
                'customer_code' => 'CUST-007',
                'name' => 'Hendra Setiawan',
                'email' => 'hendra.setiawan@example.com',
                'phone' => '081733445566',
            ],
            [
                'customer_code' => 'CUST-008',
                'name' => 'Maya Kartika',
                'email' => 'maya.kartika@example.com',
                'phone' => '081844556677',
            ],
            [
                'customer_code' => 'CUST-009',
                'name' => 'Fajar Nugraha',
                'email' => 'fajar.nugraha@example.com',
                'phone' => '081955667788',
            ],
            [
                'customer_code' => 'CUST-010',
                'name' => 'Putri Ayu',
                'email' => 'putri.ayu@example.com',
                'phone' => '082166778899',
            ],
        ];

        foreach ($customers as $customer) {
            Customer::query()->updateOrCreate(
                ['customer_code' => $customer['customer_code']],
                $customer
            );
        }
    }
}
