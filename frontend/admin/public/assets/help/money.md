# Halaman Dasbor Uang

> **Untuk apa:** melihat berapa uang yang benar-benar masuk dalam satu periode, berapa yang dipotong kanal, berapa HPP barang yang terjual, dan siapa masih harus membayar siapa.
> **Izin yang dibutuhkan:** money.view untuk melihat; money.manage untuk mencatat pembayaran dan menghitung ulang buku.
> **Perlu diperhatikan:** angkanya datang dari laporan keuangan yang diimpor di Penjualan. Belum ada laporan, belum ada angka.

## Gambaran Umum

Menu **Bisnis → Dasbor Uang**. Pilih periode (tanggal cair) dan, untuk staf platform, pihak yang ingin dilihat. Akun mitra otomatis hanya melihat miliknya.

### Kartu ringkasan

Pesanan cair, Pendapatan (harga menurut kanal), Potongan kanal, Penyesuaian (iklan dan potongan di luar pesanan), **Dana cair** (yang benar-benar masuk), HPP terjual (dari HPP & Harga, lewat Peta SKU), dan **Laba kotor** = dana cair dikurangi HPP.

### Per toko dan per produk

Dua tabel yang membagi angka yang sama per toko dan per produk. Produk yang belum dipetakan di Peta SKU ditandai; HPP-nya belum terhitung.

### Hak tiap pihak

Untuk tiap pihak yang punya aturan bagi hasil: hak penjualannya, biaya yang masuk ke MIA (komisi, biaya produksi), dan bersihnya untuk periode itu.

## Buku per pihak

Setiap pesanan yang cair menghasilkan baris buku menurut aturan bagi hasil: hak mitra, komisi platform, biaya produksi. Baris tidak pernah diubah; kalau laporan kanal berubah, sistem menambah baris "Koreksi". Saldo adalah jumlah semua baris: positif berarti pihak itu masih harus menerima, negatif berarti masih harus membayar.

### Catat pembayaran

Uang berpindah di luar sistem (transfer bank). Setelah terjadi, catat di sini: siapa membayar siapa, tanggal, jumlah, catatan. Saldo kedua pihak bergerak ke nol.

### Hitung ulang buku

Dipakai setelah aturan bagi hasil atau Peta SKU diubah. Sistem menghitung ulang semua pesanan yang cair dan hanya menambah baris selisihnya; kalau tidak ada yang berubah, tidak ada baris baru.
