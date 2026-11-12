# Halaman Penjualan

> **Untuk apa:** memasukkan penjualan tiap toko dari file Seller Center, supaya panel tahu apa yang terjual dan berapa uang yang benar-benar masuk.
> **Izin yang dibutuhkan:** sales.view untuk melihat; sales.import untuk mengimpor file dan memetakan SKU.
> **Perlu diperhatikan:** file tidak disimpan di server; nama, nomor HP, dan alamat pembeli tidak pernah disimpan.

## Gambaran Umum

Menu **Bisnis → Penjualan** punya empat tab: Impor, Pesanan, Dana cair, dan Peta SKU. Sampai API marketplace tersambung, tim mengunduh dua file dari Seller Center tiap toko lalu mengunggahnya di sini.

## Tab Impor

Pilih toko, pilih file, tekan **Baca file**. Sistem mengenali jenis filenya sendiri dan menampilkan laporan: periode, berapa baris baru, berapa yang sudah ada, dan SKU yang belum dipetakan. Belum ada yang tersimpan sampai **Simpan ke sistem** ditekan.

### File pesanan

Dari Seller Center TikTok Shop: Pesanan → Ekspor (CSV atau Excel). Satu baris per SKU per pesanan. Nomor pesanan dipakai sebagai kunci: file yang sama dua kali tidak menggandakan, dan ekspor yang lebih baru memperbarui statusnya.

### File laporan keuangan

Dari Keuangan → Laporan → Unduh (Excel). Inilah dana yang cair: per pesanan, plus baris penyesuaian yang bukan pesanan, misalnya pembayaran iklan. Rincian biayanya (komisi, ongkir, pajak) ikut tersimpan dan bisa dilihat di tab Dana cair.

### Riwayat impor

Di bawah form ada daftar unggahan terakhir: kapan, toko mana, file apa, dan hasilnya.

## Tab Pesanan

Pesanan dari semua toko yang boleh dilihat akun ini, terbaru di atas. Saring per toko, periode, atau cari nomor pesanan dan nama produk. Klik satu baris untuk melihat SKU-nya, harga, dan diskonnya. Kolom Dana cair terisi setelah laporan keuangan toko itu diimpor.

## Tab Dana cair

Uang yang benar-benar masuk menurut kanal. Ringkasan di atas: pendapatan, biaya, penyesuaian, dan dana cair untuk saringan yang dipilih. Klik satu baris untuk rincian biayanya.

## Tab Peta SKU

Setiap SKU toko yang pernah muncul di file ada di sini dengan nama dan variannya. Pilih produk kita sekali; semua pesanan, lama maupun baru, langsung mengikuti. Centang "Hanya yang belum dipetakan" untuk mengerjakan yang tersisa.
