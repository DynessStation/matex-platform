# Halaman Entitas & Toko

> **Untuk apa:** mencatat pihak-pihak dalam bisnis (platform, brand sendiri, mitra B2B), toko mereka di tiap kanal, dan siapa mendapat apa dari tiap penjualan.
> **Izin yang dibutuhkan:** business.view untuk melihat; business.manage untuk menambah dan mengubah.
> **Perlu diperhatikan:** akun yang diikat ke satu entitas (akun mitra) hanya melihat entitas, toko, aturan, dan produk miliknya sendiri.

## Gambaran Umum

Menu **Bisnis → Entitas & Toko** punya tiga tab: Entitas, Toko, dan Bagi hasil. Perusahaan ini sendiri selalu ada sebagai entitas berjenis Platform dan tidak bisa dihapus atau dinonaktifkan.

## Tab Entitas

Satu baris satu pihak. Isi nama, kode (dibuat otomatis dari nama kalau kosong), jenis, dan kontaknya. Bagian catatan dan pilihan "Tampilkan nama toko di website" terbuka saat baris diedit.

### Jenis

Platform adalah perusahaan ini. Brand sendiri adalah merek milik perusahaan yang punya toko sendiri. Mitra B2B adalah pihak luar yang menitipkan produk atau memesan produksi.

### Status

Entitas nonaktif tidak ditawarkan lagi di form produk dan akun. Hanya entitas nonaktif yang masih tanpa toko, produk, dan akun yang bisa dihapus.

## Tab Toko

Tiap entitas punya daftar tokonya: kanal, nama toko, tautan, ID penjual dari Seller Center, dan catatan. ID penjual dipakai saat laporan penjualan diimpor supaya baris laporan langsung menemukan tokonya.

## Tab Bagi hasil

Satu kasus satu aturan bertanggal, per entitas atau khusus satu toko. Aturan untuk satu toko mengalahkan aturan seluruh entitas. Dua aturan untuk lingkup yang sama tidak boleh bertumpuk tanggalnya.

### Komponen

Tiga komponen yang lazim: Komisi platform, Tagihan produksi, dan Biaya lain. Tiap komponen bisa berupa persen dari harga pembeli atau dana diterima, nominal rupiah per item, atau HPP ditambah persen. Komponen yang nilainya kosong tidak dipakai. Sisa setelah semua komponen adalah hak entitas.

### Mengubah kesepakatan

Jangan menimpa aturan lama. Beri tanggal "Sampai" pada aturan lama, lalu buat aturan baru mulai hari berikutnya, supaya hitungan lama tetap bisa ditelusuri.

## Akun mitra

Di formulir Akun Admin ada pilihan **Entitas mitra**. Akun yang diisi entitasnya hanya melihat data entitas itu, boleh memperbarui kontak dan tokonya, tetapi tidak bisa mengubah jenis entitas atau aturan bagi hasil. Produk yang dibuatnya otomatis tercatat dijual oleh entitas itu.
