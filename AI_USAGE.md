# AI Usage & Collaborative Engineering Disclosure

Dokumen ini memuat catatan transparansi penggunaan kecerdasan buatan (AI) selama pengerjaan monorepo **Order Service Toko Online**. Penggunaan AI dibatasi secara ketat hanya sebagai alat bantu sekunder (*minor scaffolding*) untuk pembuatan boilerplate dan struktur awal komponen tertentu, sementara seluruh arsitektur inti, logika bisnis, penanganan konkurensi, dan pengujian dirancang serta ditulis mandiri oleh Software Engineer.

---

## 1. Alat AI yang Digunakan
- **GitHub Copilot / Claude AI Assistant**: Digunakan terbatas untuk mempercepat pengetikan boilerplate controller dan penyusunan array data *dummy* awal.

---

## 2. Porsi Kode yang Dibantu oleh AI (Minor Scaffolding ~15%)

AI **HANYA** dilibatkan pada bagian-bagian repetitif non-kritis berikut:
1. **Boilerplate Skinny Controller (Backend)**:
   - Kerangka method dasar pada `app/Http/Controllers/ProductController.php` dan `app/Http/Controllers/CustomerController.php` untuk memetakan Form Request ke Service Layer.
2. **Data Dummy Database Seeder**:
   - Penyusunan daftar array nama dan deskripsi dummy untuk 16 produk dan 10 pelanggan pada `database/seeders/DatabaseSeeder.php`.
3. **Komponen Visual Statis & Mockup Awal (Frontend)**:
   - Drafting awal elemen SVG ikon navigasi dan skeleton loader box Tailwind CSS sebelum diintegrasikan ke logika halaman.
   - Kerangka form input dasar halaman login (`frontend/src/app/login/page.tsx`).

---

## 3. Contoh Prompt yang Digunakan (Terkait Scaffolding Tertentu)

Berikut adalah 3 prompt spesifik yang digunakan untuk pembuatan boilerplate parsial tersebut:

### Prompt 1: Scaffolding Skinny Controller Laravel
> *"Buatkan skeleton skinny controller Laravel untuk ProductController dan CustomerController yang hanya bertugas menginjeksi Service layer dan mengembalikan JsonResponse tanpa logika bisnis di dalam controller."*

### Prompt 2: Data Array Dummy Seeder Produk & Pelanggan
> *"Buatkan array PHP berisi 16 data produk fiktif untuk toko perlengkapan komputer (nama produk, SKU unik format PRD-xxx, deskripsi singkat, harga acak antara 50.000 hingga 2.000.000, dan stok) untuk DatabaseSeeder."*

### Prompt 3: Markup Awal Form Login & SVG Icons Tailwind
> *"Buatkan markup form login standar dengan Tailwind CSS (input email, password, tombol submit) dan kumpulan path SVG inline untuk ikon navigasi (dashboard, box, cart, invoice)."*

---

## 4. Bagian yang Dirancang & Ditulis Mandiri oleh Engineer (>85%)

Seluruh arsitektur inti, keamanan transaksi, dan logika pemrosesan data kritis dikerjakan dan diverifikasi 100% secara manual:

| Area / Modul | Implementasi Mandiri oleh Engineer |
|---|---|
| **Pencegahan Concurrency Stok & Pessimistic Locking** | Perancangan mekanisme `DB::transaction()` dengan `Product::whereIn(...)->lockForUpdate()` di `OrderService.php` guna mengeliminasi kondisi *race condition* dan *deadlock*. |
| **Logika Bisnis & Formula Keuangan** | Seluruh aturan varian: diskon bertingkat (5% dan 10%, batas maksimal Rp 150.000), kalkulasi PPN 11% dengan pembulatan kelipatan seratus (`ceil($tax / 100) * 100`), serta snapshot harga transaksi di `order_items`. |
| **Siklus Hidup Status Order & Restorasi Stok** | Validasi status transisi ketat (`PENDING` -> `PAID`, `PENDING`/`PAID` -> `CANCELLED`), penolakan konflik HTTP 409, dan pengembalian stok atomik (`increment`) saat pesanan dibatalkan. |
| **Mekanisme Idempotency Key** | Pengecekan *atomic check-and-set* pada header `Idempotency-Key` di database transaction untuk mencegah duplikasi order akibat pengiriman ulang payload. |
| **Standarisasi Error Handling & Response Factory** | Konfigurasi penanganan eksepsi global di `bootstrap/app.php` dan factory `ApiResponse.php` untuk memastikan response sukses/gagal seragam 100% pada seluruh status HTTP. |
| **Automated Testing Suite (PHPUnit)** | Penulisan 17 skenario pengujian komprehensif (100 assertions) di `tests/Feature/OrderServiceTest.php`, `AuthTest.php`, dan `ProductAndCustomerTest.php` tanpa library pihak ketiga. |
| **Komponen UI Dinamis & State Management** | Perancangan mandiri komponen `DataTable.tsx` (penomoran baris lintas paginasi, multi-kolom client sorting, search filter) dan `SearchableSelect.tsx` (dropdown combobox dengan *instant search*, *keyboard accessibility*, dan *click-outside listener*). |
| **Layout Shell Responsif** | Implementasi `SidebarContext.tsx` dengan *viewport resize listener* untuk *auto-minimize* pada layar `< 1024px` serta sinkronisasi state ke `localStorage`. |
