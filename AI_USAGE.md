# AI Usage

Catatan penggunaan AI assistant dalam pengerjaan proyek.

---

### 1. Tools yang Digunakan
- **Gemini AI**

### 2. Bagian yang Dibantu AI
AI digunakan murni sebagai alat bantu ketik cepat (scaffolding) pada bagian-bagian repetitif dan non-kritis:
- Drafting kerangka method controller dasar (`ProductController`, `CustomerController`).
- Pembuatan array data dummy seeder produk dan customer di `DatabaseSeeder.php`.
- Kerangka markup form Tailwind CSS awal untuk halaman login dan layout form checkout.

### 3. Contoh Prompt yang Digunakan

1. *"Buatkan seeder berisi 15 data dummy perlengkapan komputer lengkap dengan nama produk, SKU format PRD-xxx, harga antara 50rb - 2jt, dan stok acak."*
2. *"Buatkan controller Laravel untuk CustomerController yang mengembalikan resource format JSON standard."*
3. *"Buatkan layout form login Next.js sederhana memakai Tailwind CSS dengan input email, password, dan tombol submit."*

### 4. Bagian yang Ditulis dan Dirancang Sendiri
Seluruh logika inti, arsitektur, dan penanganan edge case dikerjakan secara manual:
- **Logika Konkurensi & Locking:** Perancangan flow `DB::transaction()` dengan `lockForUpdate()` di `OrderService.php` untuk mencegah stok minus dan double checkout.
- **Kalkulasi Finansial:** Rumus diskon bertingkat (5% dan 10% dengan batas cap), pembulatan PPN 11% ke atas kelipatan seratus (`ceil($tax / 100) * 100`), dan snapshot harga di tabel pivot `order_items`.
- **Handling Transisi Status & Restorasi Stok:** Validasi perpindahan state order (`PENDING`, `PAID`, `CANCELLED`) serta pengembalian stok saat pesanan dibatalkan.
- **Automated Testing:** Seluruh skenario pengujian di `tests/Feature/OrderServiceTest.php` dan unit testing logika transaksi.
- **State Management & Komponen Frontend:** Integrasi custom hook form, filter pencarian client-side, dan penanganan response error API di Next.js.