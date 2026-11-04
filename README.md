# Order Service - Toko Online Enterprise

Monorepo fullstack enterprise untuk sistem manajemen pemesanan toko online berkinerja tinggi, dilengkapi penanganan konkurensi stok berbasis pessimistic locking, deduplikasi request berbasis Idempotency Key, arsitektur backend berlapis (Clean Layered Architecture), PHPUnit feature testing, dan dashboard interaktif Next.js App Router (TypeScript).

---

## 🚀 Panduan Instalasi Cepat (Maksimal 5 Perintah CLI)

Pastikan lingkungan Anda telah terpasang **PHP 8.3+**, **Composer**, dan **Node.js 18+**.

```bash
# 1. Setup Backend: Instal dependensi & inisialisasi environment
cd backend && composer install && cp .env.example .env && php artisan key:generate

# 2. Eksekusi database migration & seeder data awal
php artisan migrate:fresh --seed

# 3. Jalankan Backend API Server (Port 8000)
php artisan serve --port=8000

# 4. Di terminal baru, setup Frontend: Instal dependensi
cd ../frontend && npm install

# 5. Jalankan Frontend Server (Port 3000)
npm run dev
```

Akses antarmuka melalui browser di: `http://localhost:3000`

---

## 🔐 Kredensial Akun Seeder & Multi-Role User

Gunakan kredensial berikut untuk masuk ke dashboard melalui halaman `/login`:

| Role | Email | Password | Hak Akses |
|---|---|---|---|
| **Admin** | `admin@tokoonline.com` | `Password123!` | Akses Penuh Sistem & Operasional |
| **Manager** | `manager@tokoonline.com` | `Password123!` | Manajerial Finansial & Inventaris |
| **Staff** | `staff@tokoonline.com` | `Password123!` | Operasional Pesanan & Kasir |

*Catatan: Skema multi-role user diatur melalui database migration `2026_11_04_000001_add_role_to_users_table.php` dengan helper method `isAdmin()`, `isManager()`, `isStaff()`, dan `hasRole()` pada model Eloquent `User`.*

Data seeder juga menyediakan **16 produk** dengan variasi stok/harga dan **10 pelanggan**.

---

## 🧪 Eksekusi Automated Testing (PHPUnit Murni)

Pengujian backend menggunakan PHPUnit murni (tanpa Pest) dengan SQLite in-memory database:

```bash
cd backend
php artisan test
```

atau menggunakan binary phpunit:

```bash
cd backend
./vendor/bin/phpunit
```

### Skenario Uji yang Dicakup:
1. **Otentikasi & Proteksi Endpoint (HTTP 401)**: Memastikan endpoint terproteksi (`/api/orders`, `/api/products`, `/api/customers`, `/api/me`) menolak request tanpa token Sanctum yang valid.
2. **Pembuatan Order Berhasil (HTTP 201)**: Memverifikasi pemotongan stok atomik, penyimpanan snapshot item (`product_code_snapshot`, `price_snapshot`, nama), kalkulasi subtotal, dan nomor invoice (`INV-YYYYMMDD-XXXX`).
3. **Rollback Stok Tidak Cukup (HTTP 422)**: Memastikan transaksi dibatalkan 100% dan stok di database tidak berkurang ketika kuantitas melebihi stok yang tersedia.
4. **Pembatalan Order & Restorasi Stok**: Memverifikasi `PATCH /api/orders/{id}/cancel` mengembalikan status menjadi `CANCELLED` dan menambah kembali stok seluruh item ke inventaris secara atomik.
5. **Transisi Status Tidak Valid (HTTP 409 Conflict)**: Mencegah operasi terlarang, seperti membayar order yang sudah dibatalkan atau membatalkan order yang telah `CANCELLED`.
6. **Validasi Aturan Bisnis**:
   - **Varian A (Diskon Bertingkat)**: Subtotal >= Rp 500.000 diskon 5%, >= Rp 1.000.000 diskon 10%, maksimal diskon Rp 150.000.
   - **Varian B (Batas Pembelian)**: Maksimal 5 unit per produk per order dan maksimal 3 order berstatus `PENDING` per pelanggan (HTTP 422).
   - **Varian C (PPN 11%)**: Kalkulasi PPN 11% dari subtotal dengan pembulatan ke atas ke kelipatan Rp 100 (`ceil($tax / 100) * 100`).
7. **Verifikasi Idempotency Key**: Memverifikasi pengiriman ulang payload dengan `Idempotency-Key` yang sama tidak menghasilkan duplikasi record order atau pemotongan stok ganda.

---

## 📐 Penjelasan Teknis Alur `POST /api/orders`

Alur pemrosesan pesanan dirancang mengikuti prinsip Layered Clean Architecture dan concurrency safety:

```
[Client] (Request + Bearer Token + Idempotency-Key)
   │
   ▼
1. [Route & Middleware]
   routes/api.php -> 'auth:sanctum'
   │
   ▼
2. [Form Request]
   app/Http/Requests/OrderCreateRequest.php
   - Validasi struktur nested array: customer_id, items.*.product_id, items.*.quantity >= 1
   │
   ▼
3. [Controller Dispatcher]
   app/Http/Controllers/OrderController.php::store()
   - Mengambil header 'Idempotency-Key' dan mendelegasikan ke Service Layer (Skinny Controller)
   │
   ▼
4. [Service Layer & Business Engine]
   app/Services/OrderService.php::createOrder()
   │
   ├─► a. Atomic Check Idempotency Key:
   │      Jika key telah sukses diproses, kembalikan invoice order yang sudah ada tanpa duplikasi.
   │
   ├─► b. Validasi Batas Pembelian (Business Boundary):
   │      - Periksa jumlah order aktif pelanggan (maks. 3 berstatus PENDING).
   │      - Validasi batas kuantitas per item (maks. 5 unit).
   │
   ├─► c. DB::transaction() & Pessimistic Locking:
   │      Eksekusi: Product::whereIn('id', $productIds)->lockForUpdate()->get()
   │      Database menahan exclusive lock pada baris data produk terkait hingga transaksi selesai.
   │      Hal ini mencegah race condition jika beberapa pengguna checkout produk yang sama secara simultan.
   │
   ├─► d. Validasi Ketersediaan Stok:
   │      Jika stok < requested quantity:
   │      Rollback penuh transaksi dan lemparkan ValidationException:
   │      errors: {"items.{index}.quantity": ["Stok {nama} tersisa {stok}, diminta {qty}"]}
   │
   ├─► e. Kalkulasi Finansial:
   │      - Subtotal akumulasi dari harga produk * kuantitas
   │      - Diskon bertingkat (5% >= 500rb, 10% >= 1jt, cap 150rb)
   │      - PPN 11% dibulatkan ke atas kelipatan 100: ceil(tax / 100) * 100
   │      - Grand Total = Subtotal - Diskon + PPN
   │
   ├─► f. Mutasi Atomik & Snapshot:
   │      - Generate order_number otomatis format INV-YYYYMMDD-XXXX
   │      - Kurangi stok produk secara atomik (Product::decrement)
   │      - Simpan header Order dan OrderItem snapshot (nama, SKU, harga saat transaksi)
   │
   ▼
5. [Commit & Standardized JSON Response]
   DB transaction commits. Mengembalikan response seragam:
   {
     "success": true,
     "message": "Order berhasil dibuat.",
     "data": { ... },
     "meta": {}
   }
```

---

## 📁 Struktur Monorepo

```
├── backend/
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/       # Skinny Controllers (Auth, Product, Customer, Order)
│   │   │   ├── Requests/          # Form Requests Validasi Ketat
│   │   │   └── Responses/         # Standard ApiResponse Factory
│   │   ├── Models/                # Eloquent Models (User, Product, Customer, Order, OrderItem)
│   │   └── Services/              # Fat Services (AuthService, ProductService, CustomerService, OrderService)
│   ├── bootstrap/
│   │   └── app.php                # Global API Exception Handler (401, 404, 409, 422, 500)
│   ├── database/
│   │   ├── migrations/            # Skema tabel database relasional
│   │   └── seeders/               # Seeder admin, 16 produk, dan 10 customer
│   ├── routes/
│   │   └── api.php                # Route grouping terproteksi Sanctum
│   └── tests/
│       └── Feature/               # PHPUnit Automated Test Suites
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/         # Halaman Dashboard Analitik (Landing page default)
│   │   │   ├── login/             # Halaman login administrator (SaaS light theme)
│   │   │   ├── orders/            # Tabel riwayat pesanan (filter status & tanggal)
│   │   │   │   ├── create/        # Form pembuatan pesanan dinamis & live diskon/PPN
│   │   │   │   └── [id]/          # Detail faktur invoice & aksi lifecycle pesanan
│   │   │   └── products/          # Katalog produk dengan debounced search
│   │   ├── components/
│   │   │   └── layout/            # Layout shell (Sidebar collapsible/expandable, TopMenu navigasi, AppLayout)
│   │   ├── context/               # AuthContext, SidebarContext & Session Guard
│   │   ├── services/              # Axios Client dengan token interceptor
│   │   └── types/                 # TypeScript strict definitions
└── README.md
```

