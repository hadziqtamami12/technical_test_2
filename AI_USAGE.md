# AI Usage & Collaborative Engineering Disclosure

Dokumen ini memuat transparansi penggunaan kecerdasan buatan (AI) dalam siklus perancangan, pengembangan, dan pengujian monorepo **Order Service Toko Online Enterprise**, sesuai standar tata kelola perangkat lunak profesional.

---

## 1. Daftar Tools AI yang Digunakan
1. **Google DeepMind Antigravity / Claude 3.7 Sonnet**: Digunakan sebagai *Pair Programming Agent* untuk *code scaffolding*, verifikasi sintaksis, pembuatan test case suite awal, dan pengoptimalan skema database.
2. **TypeScript / PHP Language Server Protocol (LSP)**: Untuk verifikasi tipe data ketat, inspeksi static typing, dan linting otomatis.

---

## 2. Prompt Utama yang Digunakan (Verbatim)

Berikut adalah 4 prompt utama yang digunakan selama siklus pengembangan sistem:

### Prompt 1: Arsitektur Database & Service Layer Concurrency
> "Anda adalah Principal Software Engineer yang bertugas membangun monorepo fullstack: 'Order Service untuk Toko Online' sesuai spesifikasi teknis enterprise.
> Arsitektur Backend: Layered Clean Architecture (Routes -> Form Requests -> Controllers -> Services -> Eloquent Models/DB Transactions). Controller harus ramping (skinny controller, fat service).
> Penanganan Concurrency Stok: Wajib menggunakan Database Transaction dengan Pessimistic Locking (lockForUpdate()) saat memvalidasi dan memotong stok agar bebas dari kondisi race condition.
> Idempotency Key: Implementasikan middleware/service idempotency menggunakan header Idempotency-Key (cache/database table) dengan atomic check-and-set untuk POST /api/orders.
> Error Formatting & Standardization: Format response sukses dan gagal HARUS seragam 100% mengikuti standar:
> - Sukses: { 'success': true, 'message': 'OK', 'data': {...}, 'meta': {...} }
> - Gagal: { 'success': false, 'message': '...', 'errors': {...} } dengan status code tepat (200, 201, 400, 401, 404, 409, 422)."

### Prompt 2: Aturan Bisnis Varian & Automated Testing PHPUnit
> "Terapkan aturan varian bisnis pada OrderService:
> - Varian A (Diskon Bertingkat): Subtotal >= Rp 500.000 diskon 5%, >= Rp 1.000.000 diskon 10%, maksimal diskon Rp 150.000.
> - Varian B (Batas Pembelian): Maksimal 5 unit per produk dalam satu order, dan satu pelanggan maksimal memiliki 3 order berstatus PENDING bersamaan (tolak HTTP 422).
> - Varian C (PPN 11%): Hitung PPN 11% dari subtotal, bulatkan ke atas ke kelipatan Rp 100 (ceil($tax / 100) * 100).
> Testing: Gunakan PHPUnit murni (bukan Pest, tanpa test AI/komentar AI). Semua assertion harus clean, menguji skenario sukses, kegagalan validasi, rollback transaksi, boundary rules, dan proteksi otentikasi."

### Prompt 3: SaaS Enterprise Light Theme Frontend & Dashboard
> "Refactor UI antarmuka frontend Next.js (frontend/) dengan panduan desain SaaS Enterprise Light Theme, layout sidebar tetap, dan penambahan halaman Dashboard analitik.
> Prinsip Desain: Background utama soft light off-white (bg-slate-50), Card pure solid white (bg-white) border border-slate-200 shadow-sm, tipografi text-slate-900 / text-slate-600. DILARANG menggunakan styling neon/AI/cyberpunk.
> Dashboard memuat 4 baris metrik angka, grafik tren penjualan harian yang proporsional, distribusi status order, produk terlaris, dan transaksi terakhir."

### Prompt 4: DataTable, Searchable Select, & Kontrol Navigasi
> "Pakai datatable untuk table, ada pagination, sorting, ordering, number, dan untuk select dropdown pakai yang ada searchnya.
> 'tambah baris' ganti dengan 'tambah' saja, 'order baru' diganti dengan 'buat pesanan baru', 'keluar sesi' diganti dengan 'logout', frontend responsive di semua resolusi dengan auto minimize pada resolusi kecil."

---

## 3. Rincian Bagian yang Ditulis & Dimodifikasi Mandiri oleh Engineer

Meskipun AI dimanfaatkan untuk mempercepat pembuatan boilerplate, seluruh kode inti telah melalui inspeksi, modifikasi manual, dan verifikasi mendalam oleh Senior Engineer:

| Modul / Komponen | Kontribusi Mandiri Engineer |
|---|---|
| **Logika Concurrency & Locking** (`OrderService.php`) | Mendesain urutan penempatan `lockForUpdate()` di dalam transaksi sebelum pengecekan stok, serta penanganan `QueryException` untuk menjamin konsistensi ACID database dan mencegah *deadlock*. |
| **Formula Kalkulasi Keuangan** (`OrderService.php`) | Menulis kalkulasi presisi float, pembulatan kelipatan seratus (`ceil($tax / 100) * 100`), dan batas maksimum diskon Rp 150.000 dengan snapshot harga ke `order_items`. |
| **Standarisasi Response & Exception Handling** (`bootstrap/app.php` & `ApiResponse.php`) | Mengonfigurasi penangkapan global eksepsi Laravel (`ValidationException`, `AuthenticationException`, `ConflictHttpException`, `ModelNotFoundException`) agar mengembalikan format JSON seragam 100%. |
| **PHPUnit Test Scenarios** (`tests/Feature/OrderServiceTest.php`) | Menyusun 17 skenario pengujian fungsional terisolasi mencakup *race condition*, rollback rollback transaksi, transisi status 409, boundary unit, dan proteksi otentikasi Sanctum. |
| **SearchableSelect & DataTable Components** (`frontend/src/components/ui/`) | Merancang komponen UI interaktif mandiri: perhitungan penomoran baris lintas halaman paginasi `(page - 1) * pageSize + index + 1`, multi-kolom client sorting, *click-outside listener*, dan *keyboard escape handling*. |
| **Responsivitas & Layout Shell** (`SidebarContext.tsx` & `TopMenu.tsx`) | Menulis *window resize listener* otomatis untuk auto-collapse sidebar di layar `< 1024px` dan sinkronisasi preferensi ke `localStorage`. |
| **Dokumentasi Teknis & Keputusan Desain** (`README.md`, `DECISIONS.md`, `AI_USAGE.md`) | Melakukan perincian arsitektural, diagram alur, dan analisis skalabilitas sistem. |
