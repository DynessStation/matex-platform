# Halaman HPP & Harga

> **Untuk apa:** menghitung HPP dari bahan, harga jual per tingkat, dan laba per kanal penjualan.
> **Izin yang dibutuhkan:** cost.view untuk melihat; cost.manage untuk mengubah dan mengimpor; price.apply untuk menerapkan harga ke website.
> **Perlu diperhatikan:** data di sini internal dan tidak pernah tampil di website. Harga website hanya berubah lewat tombol Terapkan harga.

## Gambaran Umum

Modal dan harga satu produk diisi di form produk, tab Harga & Kanal. Halaman ini untuk melihat semua produk sekaligus dan mengatur yang berlaku umum: Daftar Harga, Bahan, Tarif & Kanal, Kalkulator, dan Impor Excel.

## Tab Daftar Harga

Daftar item beserta HPP, target margin, Net MIA, Affiliate, harga jual hitungan, harga website sekarang, dan statusnya. Klik nama item untuk mengubah tarif dan resepnya.

### Status harga

Belum ada produk, Belum ada HPP, Ikut hitungan, Harga manual, atau Perlu ditinjau. Harga website tidak berubah sendiri: kalau bahan atau tarif berubah, statusnya menjadi Perlu ditinjau.

### Buat produk draf

Item tanpa produk bisa dicentang dan dijadikan produk draf. SKU dibuat otomatis dan bisa diubah di form produk.

### Terapkan harga

Centang produk, lalu tekan Terapkan harga. Harga konsumen dan grosir, Rupiah dan Dollar, diganti sesuai hitungan, dan perubahan tercatat di Log Aktivitas. Item tanpa produk di katalog tidak bisa diterapkan.

## Resep

Tiap baris berisi bahan dan jumlahnya. Kolom Rumus boleh diisi supaya jumlah mengikuti ukuran item, misalnya `(2*L + 5*T) / 100`. Hanya L, P, T, angka, dan tanda + - \* / ( ) yang berlaku. Harga khusus dipakai kalau baris itu tidak mengikuti harga bahan. Menyimpan resep menambah versi baru, jadi versi lama tetap tercatat.

## Tab Bahan

Harga bahan bertanggal. Saat mengedit bahan, Lihat dampak menunjukkan perubahan HPP tiap item sebelum harganya disimpan.

## Tab Tarif & Kanal

Tarif umum dipakai item yang tidak punya tarif sendiri. Biaya per kanal diisi dari Seller Center masing-masing. Saat tarif berubah, beri tanggal Sampai pada baris lama dan tambah baris baru.

## Tab Kalkulator

Pilih produk atau isi HPP sendiri, lalu isi harga, jumlah, diskon, voucher, iklan, dan ongkir. Hasilnya uang diterima, laba, dan margin di tiap kanal. Target margin menghasilkan harga minimum. Hasilnya estimasi dan tidak mengubah harga apa pun.

## Tab Impor Excel

Baca file dulu untuk melihat laporan. Data baru tersimpan setelah Simpan ke sistem ditekan, dan harga website tidak ikut berubah. File yang sama diimpor lagi tidak menambah versi resep.
