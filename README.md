# Toko Online - Order Service Monorepo

Monorepo sederhana yang memisahkan backend API (Laravel 12) dan dashboard client (Next.js 15).

## Quickstart

PHP 8.3+, Composer, dan Node.js 18+ sudah terpasang.

# 1. Clone & masuk ke repo
git clone <url-repo-anda> && cd <nama-repo>

# 2. Setup env backend & install dependencies
cd backend && composer install && cp .env.example .env && php artisan key:generate

# 3. Jalankan migrasi & data seeder
php artisan migrate:fresh --seed

# 4. Jalankan backend server (terminal 1)
php artisan serve

# 5. Install dependencies frontend (buka terminal 2 dari root)
cd frontend && npm install && cp .env.example .env.local

# 6. Jalankan frontend dev server
npm run dev