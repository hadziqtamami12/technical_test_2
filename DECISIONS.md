# Architectural & Technical Decisions: Order Service Toko Online

Dokumen ini mendokumentasikan keputusan arsitektur utama, mitigasi risiko teknis, analisis konkurensi stok, penyelesaian bug riil, serta rencana skalabilitas masa depan untuk sistem **Order Service Monorepo**.

---

## 1. Pencegahan Concurrency Race Condition & Stok Minus

### a. Mekanisme Kunci
Risiko utama sistem e-commerce berskala enterprise adalah **stok minus** (*overselling*) akibat kondisi balapan (*race condition*) ketika beberapa pelanggan membeli produk dengan sisa stok terbatas secara bersamaan.

Implementasi teknis pencegahan:
- **File Terkait**: [`backend/app/Services/OrderService.php`](file:///c:/projects/techtes/backend/app/Services/OrderService.php)
- **Metode Kunci**: `createOrder(array $payload, ?string $idempotencyKey)` dan `cancelOrder(int $orderId)`
- **Mekanisme**: **Pessimistic Locking (`lockForUpdate()`)** yang dibungkus dalam **Database Transaction (`DB::transaction()`)**.

### b. Alur Eksekusi Database
1. Saat pesanan diproses, sistem mengidentifikasi seluruh `product_id` unik dari item yang diminta.
2. Query penguncian baris dieksekusi:
   ```php
   $products = Product::query()
       ->whereIn('id', $productIds)
       ->lockForUpdate()
       ->get()
       ->keyBy('id');
   ```
3. Database menahan status *exclusive lock* (`FOR UPDATE`) pada baris produk yang terlibat. Transaksi lain yang mencoba membaca atau memperbarui baris produk yang sama akan mengantre (*blocking wait*) hingga transaksi pertama selesai (`COMMIT` atau `ROLLBACK`).
4. **Validasi Ketersediaan Atomik**:
   Sistem mengiterasi seluruh item. Jika ada satu saja produk yang stoknya kurang dari kuantitas yang diminta:
   ```php
   if ($product->stock < $quantity) {
       throw ValidationException::withMessages([
           "items.{$index}.quantity" => [
               "Stok {$product->name} tersisa {$product->stock}, diminta {$quantity}",
           ],
       ]);
   }
   ```
   Pelemparan eksepsi ini membatalkan transaksi secara keseluruhan. Tidak ada satu pun stok produk lain dalam payload yang terpotong.
5. **Pemotongan Atomik**:
   Setelah validasi stok 100% aman, pemotongan stok dilakukan melalui metode atomik:
   ```php
   $product->decrement('stock', (int) $item['quantity']);
   ```
6. **Restorasi Stok saat Pembatalan**:
   Pada `cancelOrder()`, order berstatus `PENDING` atau `PAID` dikunci via `lockForUpdate()`, status diubah menjadi `CANCELLED`, dan seluruh stok item dikembalikan ke tabel produk secara atomik (`increment`) di dalam satu transaksi terpadu.

---

## 2. Arsitektur Lapisan Kode (Layered Clean Architecture) & Strategi Skalabilitas

### a. Pemisahan Tanggung Jawab (Separation of Concerns)
Aplikasi memisahkan tanggung jawab secara tegas menjadi 4 lapisan utama:
1. **Routing & Middleware (`routes/api.php`)**:
   Mengisolasi endpoint publik (`POST /api/login`) dari endpoint privat menggunakan middleware Sanctum `auth:sanctum`. Seluruh request API otomatis divalidasi otentikasinya sebelum menyentuh controller.
2. **Form Request (`app/Http/Requests/`)**:
   Validasi input HTTP ketat (`OrderCreateRequest`, `ProductStoreRequest`, `CustomerStoreRequest`). Controller tidak lagi memvalidasi data manual, memastikan prinsip *Single Responsibility*.
3. **Skinny Controller (`app/Http/Controllers/`)**:
   Controller hanya berfungsi sebagai *orchestrator/dispatcher*: mengekstrak input tervalidasi, membaca header (misalnya `Idempotency-Key`), meneruskan ke service, dan mengembalikan response standar `ApiResponse::success()`.
4. **Fat Service / Business Engine (`app/Services/`)**:
   Tempat logika bisnis, kalkulasi diskon bertingkat, PPN 11%, snapshot harga, transaksi database, dan pessimistic locking diisolasi. Service tidak memiliki dependensi terhadap objek HTTP Request, sehingga mudah diuji (*testable*).
5. **Eloquent Model & Value Snapshot (`app/Models/`)**:
   Mendefinisikan tipe data casts, relasi ORM (`hasMany`, `belongsTo`), serta memastikan snapshot harga dan SKU tersimpan permanen di `order_items` agar tidak berubah jika master produk diperbarui di masa depan.

### b. Strategi Refaktor Saat Aplikasi Membesar
Jika volume transaksi meningkat signifikan (misalnya > 50.000 transaksi/hari):
1. **Penerapan Domain-Driven Design (DDD)**:
   Memecah modul monorepo menjadi *bounded contexts*: `Modules/Identity`, `Modules/Catalog`, `Modules/Order`, `Modules/Billing`.
2. **Repository Pattern & Data Caching**:
   Membuat abstraksi repository untuk katalog produk dengan Redis caching terotomatisasi (*read-through cache*) guna menurunkan beban query database hingga 80%.
3. **CQRS & Read Replicas**:
   Memisahkan koneksi database tulis (*write master*) untuk checkout dan koneksi database baca (*read replicas*) untuk query katalog produk dan riwayat transaksi.
4. **Asynchronous Job Workers & Event-Driven Architecture**:
   Memindahkan proses sekunder (pembuatan faktur PDF, pengiriman notifikasi email/WhatsApp, sinkronisasi inventaris ke warehouse pihak ketiga) ke antrean background worker (RabbitMQ / Redis Queue) menggunakan Laravel Events & Listeners (`OrderCreatedEvent`, `OrderCancelledEvent`).

---

## 3. Dokumentasi Bug Riil & Metodologi Penemuan

### a. Bug 1: Duplicate Key Collision pada Concurrency Idempotency Request
- **Gejala**: Ketika dua request checkout dikirimkan dalam milidetik yang sama menggunakan header `Idempotency-Key` yang sama (mensimulasikan *double-click* dari pengguna dengan latensi jaringan tidak stabil), request kedua gagal dengan `QueryException: SQLSTATE[23000]: Integrity constraint violation: 19 UNIQUE constraint failed: orders.idempotency_key`.
- **Metode Penemuan**: Ditemukan saat menjalankan automated test concurrency skenario pengiriman ganda `Idempotency-Key`.
- **Akar Masalah**: Pengecekan idempotency pertama dilakukan di luar transaksi (`SELECT ... WHERE idempotency_key = ?`). Saat kedua request masuk bersamaan, pengecekan awal pada kedua thread menghasilkan `null` karena belum ada transaksi yang di-commit. Akibatnya kedua thread mencoba melakukan `INSERT` ke database.
- **Solusi**:
  1. Menambahkan pengecekan kedua di dalam transaksi menggunakan `Order::query()->where('idempotency_key', ...)->lockForUpdate()->first()`.
  2. Membungkus blok transaksi dengan blok `catch (QueryException $e)` yang menangkap duplikasi index unik idempotency key dan mengembalikan instance order yang berhasil dibuat oleh thread pertama tanpa melempar HTTP 500.

### b. Bug 2: Next.js 16 Static Prerendering Boundary Failure pada Client Navigation
- **Gejala**: Build frontend gagal pada tahap `Generating static pages (0/10)` dengan pesan error: `usePathname() should be wrapped in a suspense boundary at page "/_not-found"`.
- **Metode Penemuan**: Ditemukan saat mengeksekusi `npm run build` pada antarmuka Next.js App Router (Turbopack).
- **Akar Masalah**: Komponen navigasi client-side yang memanggil hook dinamis (`usePathname`) dieksekusi selama static site generation tanpa pembungkus `<Suspense>`.
- **Solusi**: Membungkus rute dinamis dan hierarki navigasi utama di dalam `<Suspense fallback={null}>` pada `layout.tsx` dan `AppLayout.tsx`.

---

## 4. Bagian yang Masih Perlu Diimprovisasi (Weak Points) & Roadmap

Meskipun sistem telah memenuhi spesifikasi enterprise, terdapat area teknis yang dapat ditingkatkan pada rilis berikutnya:

1. **Distributed Lock (Redis Redlock)**
   - *Kondisi Saat Ini*: Menggunakan Database Pessimistic Locking (`lockForUpdate()`). Sangat efektif untuk arsitektur database relasional tunggal.
   - *Roadmap*: Jika database beralih ke arsitektur multi-master / multi-region, penguncian baris database dapat menimbulkan latensi tinggi. Diperlukan distributed locking berbasis memory seperti Redis Redlock sebelum menyentuh layer database.
2. **Penyimpanan Idempotency Dedicated dengan TTL**
   - *Kondisi Saat Ini*: Idempotency key disimpan pada kolom `idempotency_key` di tabel `orders`.
   - *Roadmap*: Memisahkan penyimpanan idempotency key ke tabel khusus atau Redis Key-Value Store dengan *Time-To-Live* (TTL 24 jam) dan *garbage collection* otomatis agar ukuran tabel order tetap optimal.
3. **Webhook Payment Gateway**
   - *Kondisi Saat Ini*: Pembayaran dipicu via endpoint `PATCH /api/orders/{id}/pay`.
   - *Roadmap*: Mengimplementasikan webhook handler dengan verifikasi signature kriptografis (HMAC-SHA256) untuk integrasi langsung dengan payment gateway pihak ketiga (Midtrans/Xendit/Stripe).
4. **Rate Limiting & Anti-Brute Force**
   - *Kondisi Saat Ini*: Belum ada batasan frekuensi request per menit per IP untuk endpoint checkout.
   - *Roadmap*: Menerapkan middleware rate limiter (e.g. `throttle:60,1` untuk checkout) untuk mencegah serangan DoS yang menahan lock database.

