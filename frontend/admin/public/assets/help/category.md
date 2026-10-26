# Halaman Kategori Produk

> **Untuk apa:** mengelola kelompok produk bertingkat yang dipakai katalog, menu kategori header, dan beranda website.
> **Izin yang dibutuhkan:** product_category.view untuk melihat; product_category.create, product_category.update, product_category.delete untuk mengubah.
> **Perlu diperhatikan:** kategori Dipublikasikan yang masih berisi produk tidak bisa dijadikan draft, diarsipkan, atau dihapus; pindahkan produknya dulu.

## Gambaran Umum

Kategori mengelompokkan produk dalam struktur induk dan anak, misalnya Sarung Tangan › Sarung Tangan Lateks. Kategori tampil di katalog website, menu kategori pada header, dan bagian kategori di beranda.

URL: https://internal.matexindo.com/category

## Tata Letak Halaman

Panel kiri berisi pohon kategori, panel kanan berisi formulir.

### Pohon kategori

Semua kategori bertingkat, dengan kotak **Cari Kategori**. Ikon pensil membuka kategori di formulir, ikon tempat sampah menghapusnya. Kategori yang belum Dipublikasikan tampil lebih redup.

### Mengubah urutan

Seret pegangan di samping nama kategori untuk mengubah urutannya di antara kategori setingkat. Tidak bisa dipakai selama kotak pencarian terisi. Untuk memindahkan ke induk lain, ubah **Induk kategori** di formulir.

### Kategori baru

Saat sedang mengubah kategori, tombol **Kategori baru** mengosongkan formulir untuk membuat kategori lain.

## Tab Umum

Pengaturan dasar kategori.

### Kunci internal

Kode tetap kategori untuk sistem, wajib dan unik, misalnya sarung-tangan-lateks. Hanya huruf kecil, angka, dan tanda hubung.

### Status

Draft (belum tampil), Dipublikasikan (tampil di website), atau Diarsipkan (disimpan, tidak tampil).

Kategori Dipublikasikan yang masih berisi produk tidak bisa diubah menjadi Draft atau Diarsipkan; pindahkan dulu produknya ke kategori lain.

### Induk kategori

Kategori di atasnya; kosongkan untuk kategori utama. Kategori tidak bisa menjadi induk dirinya sendiri atau dipindahkan ke bawah turunannya.

### Urutan

Angka urutan di antara kategori setingkat; angka kecil tampil lebih dulu di website. Bisa juga diatur dengan menyeret di pohon kategori.

### Unggulan

Kategori unggulan didahulukan di bagian kategori beranda website (6 kategori), sebelum urutan biasa.

## Tab Konten & Bahasa

Nama dan isi kategori, diisi untuk Bahasa Indonesia dan English.

### Slug URL

Bagian alamat halaman kategori di website, wajib per bahasa, misalnya sarung-tangan-lateks. Ditulis manual dengan huruf kecil, angka, dan tanda hubung, dan harus unik.

### Nama kategori

Nama yang tampil di katalog, menu, dan beranda, wajib per bahasa.

### Deskripsi

Teks pengantar di halaman kategori, opsional.

## Tab SEO

Cara halaman kategori tampil di Google dan saat dibagikan, per bahasa. Semua opsional; bila kosong, nama dan deskripsi kategori dipakai.

### Judul SEO

Judul di hasil pencarian Google; idealnya sekitar 60 karakter.

### Deskripsi SEO

Teks di bawah judul pada hasil pencarian Google; idealnya sekitar 155 karakter.

### Canonical URL

Alamat utama halaman bila konten yang sama ada di beberapa alamat. Biarkan kosong kecuali developer meminta.

### Judul dan deskripsi saat dibagikan

Judul dan teks yang tampil saat tautan kategori dibagikan di media sosial atau aplikasi pesan.

## Tab Media

Gambar kategori dari Media.

### Gambar utama

Gambar kategori di katalog dan beranda, sebaiknya rasio 4:3.

### Ikon kategori

Ikon kecil di samping nama kategori pada menu kategori header.

### Gambar berbagi sosial

Gambar saat tautan kategori dibagikan, sebaiknya 1200 × 630 piksel.

## Aturan Penting

- Kunci internal dan slug tiap bahasa tidak boleh sama dengan kategori lain.
- Kedua bahasa wajib dilengkapi sebelum disimpan.
- Kategori yang masih punya kategori anak tidak bisa dihapus; pindahkan atau hapus dulu anaknya.
- Kategori yang masih berisi produk tidak bisa dihapus, dan bila Dipublikasikan tidak bisa dijadikan Draft atau Diarsipkan. Pindahkan produknya lewat halaman Produk.
- Perubahan kategori tercatat di Log Aktivitas.
