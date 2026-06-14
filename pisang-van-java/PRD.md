# Product Requirements Document (PRD)
**Project Name:** Pisang Van Java (F&B Enterprise POS & E-Commerce System)
**Version:** 1.0.0
**Document Status:** Final/Approved

---

## 1. Product Overview
### 1.1 Visi Produk
Menciptakan ekosistem Point-of-Sale (POS) dan *E-Commerce* hibrida yang tangguh, cepat, dan *scalable* untuk operasional F&B "Pisang Van Java". Sistem ini mengeliminasi masalah operasional tradisional dengan menyatukan manajemen pesanan *offline* dan *online* dalam satu *dashboard* tersentralisasi yang tahan terhadap *race conditions* dan *traffic spike*.

### 1.2 Target Pengguna
1. **Pelanggan (Customer):** Memesan makanan secara *online* via *Storefront* (Web App) dengan dukungan pembayaran digital.
2. **Kasir (Cashier):** Memasukkan pesanan langsung di toko secara *real-time* dengan antarmuka POS yang responsif.
3. **Manajer/Pemilik (Admin):** Memantau penjualan, manajemen menu, analisis stok, dan mengelola operasional dapur.

---

## 2. Problem Statement & Objectives
### 2.1 Masalah yang Diselesaikan
* **Inkonsistensi Stok:** Toko F&B dengan pesanan *offline* dan *online* sering kehabisan stok tanpa peringatan karena data tidak terpusat.
* **Double Charging (Race Condition):** Pelanggan sering ter-denda dua kali jika menekan tombol "Bayar" secara berulang.
* **Operasional Lambat:** Mencatat pesanan manual atau menggunakan mesin POS lawas memperlambat pelayanan di *peak hours*.

### 2.2 Tujuan Utama (Objectives)
* Mengintegrasikan manajemen stok secara otomatis antara pembelian *online* (Web) dan *offline* (POS).
* Memberikan keandalan *Checkout* sebesar 99.9% menggunakan sistem *Idempotency* untuk mencegah pesanan ganda.
* Meningkatkan pengalaman pengguna dengan UI modern berbasis *Dark/Light Mode* yang memiliki skor aksesibilitas (W3C) tinggi.

---

## 3. Scope of Work (Ruang Lingkup)
### 3.1 In-Scope (Termasuk)
* *Web Storefront* untuk pelanggan (Katalog, Keranjang, Checkout).
* *Dashboard Point of Sale* (POS) untuk operasional Kasir.
* Integrasi *Payment Gateway* Midtrans (GoPay, VA, QRIS, dll).
* Fitur *Real-Time Inventory / Atomic Stock Decrement*.
* *Dashboard Admin* (Manajemen Produk, Kategori, Topping, Order History).
* *Webhook Reconciliation* untuk update otomatis status pembayaran.

### 3.2 Out-of-Scope (Tidak Termasuk Fase 1)
* *Mobile App Native* (iOS/Android). Aplikasi saat ini berbasis *Responsive Web* (PWA-ready).
* Otomasi Mesin Kasir/Printer Struk Fisik via *Bluetooth* bawaan OS (masih mengandalkan fitur `window.print()` bawaan peramban).

---

## 4. Functional Requirements (Kebutuhan Fungsional)

### 4.1 Modul Pelanggan (Storefront)
* **FR-C1:** Pelanggan dapat melihat katalog menu (*Base* dan *Topping*).
* **FR-C2:** Pelanggan dapat menambahkan item ke Keranjang (*Cart*) yang disimpan di *Local State* (Zustand).
* **FR-C3:** Pelanggan dapat melakukan *Checkout* dan memicu pembuatan Token Midtrans.
* **FR-C4:** Pelanggan dapat melihat riwayat dan melacak status pesanan menggunakan *Order ID*.

### 4.2 Modul Kasir & Admin (Dashboard)
* **FR-A1:** Kasir dapat mengakses UI POS khusus untuk menambahkan pesanan pelanggan *offline* ke dalam sistem dengan cepat.
* **FR-A2:** Admin dapat melakukan *Create, Read, Update, Delete* (CRUD) pada Menu, Varian, dan Ekstra/Topping.
* **FR-A3:** Admin dapat melihat daftar pesanan yang masuk secara berurutan dan mengupdate statusnya (*Pending* -> *Processing* -> *Completed*).
* **FR-A4:** Sistem otomatis mendeteksi pesanan yang kedaluwarsa (*Expired*) dan mengembalikan stok.

### 4.3 Modul Sistem (Core Logic)
* **FR-S1:** Sistem harus mengunci sesi pembayaran dalam sepersekian detik menggunakan *Idempotency Key* untuk mencegah transaksi terduplikasi.
* **FR-S2:** Pengurangan stok harus mematuhi aturan *Atomic Decrement* di tingkat *database*.
* **FR-S3:** Sistem harus mengosongkan *Edge Cache* Next.js saat terjadi pembayaran sukses (*Webhook*) untuk merefleksikan jumlah stok secara *real-time*.

---

## 5. Non-Functional Requirements (Kebutuhan Non-Fungsional)
* **NFR-1 (Performa):** *First Contentful Paint* (FCP) halaman utama harus di bawah 1.5 detik berkat *Server-Side Rendering* (SSR) dan optimasi *Image Next.js*.
* **NFR-2 (Keamanan - Zero Trust):** Seluruh input harus melalui validasi ketat (Zod Schema) di *Client* dan *Server*. Tidak ada *Query Database* telanjang di komponen *Client*.
* **NFR-3 (Keandalan):** Server API dapat memproses webhook asinkron dari Midtrans tanpa nge-*block* *thread* antarmuka UI utama.
* **NFR-4 (UI/UX):** Sistem harus mendukung fungsionalitas penuh di layar *Desktop* (Kasir) maupun *Mobile* (Pelanggan) dengan dukungan transisi *Dark Mode* tanpa *flicker*.

---

## 6. Technical Architecture & Stack
* **Framework Utama:** Next.js (App Router, Server Actions, TypeScript)
* **Styling & UI:** Tailwind CSS, shadcn/ui, Lucide Icons, nuqs (URL state), Zustand (Global State)
* **Database & ORM:** PostgreSQL (di-hosting oleh Supabase) dan Prisma ORM.
* **Payment Gateway:** Midtrans (Snap Token, Notifikasi Webhook).
* **Deployment & CI/CD:** Vercel (Edge Caching, Environment Variables terenkripsi).

---

## 7. Metrik Keberhasilan (Success Metrics)
1. Kecepatan pembuatan pesanan (*Checkout* berhasil) tanpa error < 2 detik.
2. 0% insiden pemotongan saldo ganda berkat *Idempotency*.
3. Sinkronisasi data stok di *Storefront* dan *POS Dashboard* < 1 detik setelah Webhook Midtrans merespon status `settlement`.
