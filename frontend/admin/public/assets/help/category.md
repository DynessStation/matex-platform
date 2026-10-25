# Halaman Kategori Produk

> **Untuk apa:** mengelola kelompok produk yang dipakai pada katalog dan filter website.
> **Izin yang dibutuhkan:** product_category.view, .create, .update, .delete.
> **Perlu diperhatikan:** penghapusan belum memeriksa apakah kategori masih dipakai produk; pastikan dahulu tidak ada produk yang bergantung.

## Gambaran Umum

Halaman **Kategori Produk** digunakan untuk mengelompokkan produk dalam struktur bertingkat (induk dan anak). Kategori ditampilkan pada katalog website dan menjadi dasar dropdown **Kategori** pada header.

Bagian ini menjelaskan cara kerja halaman dan sebuah contoh pengisian. Pengisian data kategori mengikuti pola yang sama untuk setiap kategori.

URL: https://internal.matexindo.com/category

## Tata Letak Halaman

- **Panel kiri (pohon kategori):** menampilkan seluruh kategori bertingkat. Kolom **Cari Kategori** membantu menemukan kategori, dan setiap kategori dilengkapi ikon pensil (ubah) serta ikon hapus. Kategori yang belum berstatus Dipublikasikan tampil lebih redup.
- **Panel kanan (formulir):** digunakan untuk menambah kategori baru atau mengubah kategori yang dipilih. Pada mode ubah, tombol **Kategori baru** muncul untuk kembali ke mode tambah.

Urutan kategori pada tingkat yang sama dapat diubah dengan menyeret pegangan di samping nama kategori. Fitur ini tidak dapat digunakan selama kolom pencarian terisi. Untuk memindahkan kategori ke induk lain, ubah isian **Induk kategori** pada formulir.

## Mengisi Formulir Kategori

Formulir terdiri atas empat tab:

| Tab | Isian utama |
| --- | --- |
| Umum | Kunci internal (wajib), Status (Draft, Dipublikasikan, Diarsipkan), Induk kategori, Urutan, dan penanda Unggulan. |
| Konten & Bahasa | Slug URL, Nama kategori (wajib), dan Deskripsi, untuk Bahasa Indonesia dan English. |
| SEO | Judul SEO, Canonical URL, Deskripsi SEO, serta judul dan deskripsi saat dibagikan (opsional). |
| Media | Gambar utama (rasio 4:3), Ikon kategori, dan Gambar berbagi sosial (1200 × 630 px). |

**Contoh simulasi (bukan data aktual MATEX)**

Kunci internal: sarung-tangan-lateks | Status: Dipublikasikan | Induk kategori: (kosong / kategori utama)

Nama kategori (ID): Sarung Tangan Lateks | Slug (ID): sarung-tangan-lateks

Nama kategori (EN): Latex Gloves | Slug (EN): latex-gloves

## Ketentuan Penting

- Kunci internal tidak boleh sama dengan kategori lain. Slug ditulis manual dengan huruf kecil, angka, dan tanda hubung.
- Kategori tidak dapat menjadi induk bagi dirinya sendiri atau dipindahkan ke bawah turunannya sendiri.
- Kategori yang masih memiliki kategori anak tidak dapat dihapus. Pindahkan atau hapus kategori anak terlebih dahulu.
- Sistem belum memeriksa apakah kategori masih digunakan oleh produk saat dihapus. Pastikan produk yang terkait sudah dipindahkan ke kategori lain sebelum menghapus.
- Kedua bahasa wajib dilengkapi sebelum disimpan.
