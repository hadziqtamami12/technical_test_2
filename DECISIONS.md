# Technical Decisions

Catatan teknis dan evaluasi arsitektur selama pengerjaan assignment ini.

### a. Mencegah Stok Minus saat Dua Order Masuk Bersamaan
**File terkait:** `backend/app/Services/OrderService.php` (`createOrder`)

Untuk mencegah *race condition* (misalnya sisa stok 1, tapi ada dua user checkout bersamaan), saya membungkus seluruh alur order dalam `DB::transaction()` dan memanfaatkan **Pessimistic Locking** via `lockForUpdate()`.

Saat order diproses:
1. Query produk tidak langsung dibaca biasa, melainkan dikunci:  
   `Product::whereIn('id', $productIds)->lockForUpdate()->get();`
2. Database akan menahan (*exclusive row lock*) baris produk tersebut. Jika ada transaksi kedua yang mencoba membaca atau mengubah produk yang sama, transaksi kedua harus mengantre sampai transaksi pertama selesai (`COMMIT` atau `ROLLBACK`).
3. Setelah row terkunci, sistem mengecek stok: jika stok kurang dari permintaan, sistem melempar `ValidationException` sehingga seluruh transaksi batal bersih tanpa ada item lain yang sempat terpotong.
4. Jika stok cukup, baru dipotong secara atomik lewat `$product->decrement('stock', $qty)`.

### b. Alasan Struktur Folder dan Rencana Jika Aplikasi Membesar
**Struktur saat ini:** *Layered Architecture* (Route -> Request -> Controller -> Service -> Model)

- **Kenapa begini?**  
  Agar controller tetap tipis (*skinny controller*) dan fokus menangani HTTP response saja. Logika bisnis, kalkulasi diskon, PPN, dan transaksi database diisolasi di `app/Services/OrderService.php`. Hal ini membuat kode mudah di-unit test tanpa harus selalu melakukan HTTP mock yang berat.

- **Apa yang diubah jika aplikasi membesar (traffic/fitur bertambah tinggi)?**
  1. **Domain-Driven Modularization:** Memecah folder berdasarkan domain bisnis (misal: `Modules/Order`, `Modules/Catalog`, `Modules/Billing`) ketimbang menumpuk semua service di satu folder `app/Services`.
  2. **Distributed Lock (Redis):** Jika nanti menggunakan cluster database atau multi-instance service, database row-level lock bisa membebani database utama. Saya akan memindahkan lock ke in-memory lock (Redis Redlock) sebelum query menyentuh MySQL/Postgres.
  3. **Event-Driven / Async Queue:** Proses sekunder seperti kirim notifikasi WhatsApp/email, pembuatan invoice PDF, dan analitik akan dipindah ke Laravel Queue/Job worker agar checkout response tetap di bawah 100ms.

---

### c. Bug/Masalah yang Ditemukan dan Solusinya

Saat menguji idempotency checkout dengan request serentak (simulasi double-click user saat koneksi lambat), saya menemukan bug **Integrity Constraint Violation (Duplicate Key pada `idempotency_key`)**.

- **Cara nemuin:** Saat bikin skenario test race-condition dua request POST dengan `Idempotency-Key` sama di waktu yang nyaris barengan.
- **Penyebab:** Pengecekan idempotency awalnya saya letakkan di awal service sebelum `DB::transaction()`. Karena kedua request masuk di milidetik yang sama, keduanya sama-sama melihat bahwa idempotency key belum ada di DB. Akhirnya kedua thread sama-sama lanjut ke proses `insert`, dan request kedua meledak dengan SQL error 500 karena kolom `idempotency_key` di DB berstatus UNIQUE.
- **Solusi:** Pengecekan idempotency dipindahkan ke dalam transaksi dengan row locking (`Order::where('idempotency_key', ...)->lockForUpdate()->first()`), plus menambahkan penanganan `QueryException` khusus jika terjadi collision unik di level database agar dikembalikan sebagai order yang sudah ada, bukan HTTP 500.

### d. Bagian yang Belum Selesai / Masih Lemah & Langkah Selanjutnya

1. **Storage Idempotency Key:**  
   Saat ini idempotency key menempel langsung di tabel `orders`. Ini kurang ideal jika aplikasi sudah berjalan lama karena tabel order jadi lebih berat.  
   *Langkah selanjutnya:* Pindahkan tracking idempotency ke Redis cache dengan TTL (misal expired dalam 24 jam).

2. **Payment Gateway Webhook:**  
   Endpoint update status bayar saat ini masih simulasi langsung via patch endpoint admin (`/api/orders/{id}/pay`).  
   *Langkah selanjutnya:* Implementasikan webhook listener sungguhan dengan validasi signature HMAC (misal Midtrans/Xendit) untuk handling status pembayaran secara asynchronous dan aman.

3. **Rate Limiting Checkout:**  
   Belum ada throttler ketat per customer ID pada endpoint checkout untuk menahan bot/spam.  
   *Langkah selanjutnya:* Pasang middleware `throttle:order-checkout` (misal 5 request per menit per user ID).