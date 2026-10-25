# Halaman Produk

> **Untuk apa:** mengelola katalog produk: data, spesifikasi, harga, gambar, tautan marketplace, dan SEO.
> **Izin yang dibutuhkan:** product.view, .create, .update, .delete.
> **Perlu diperhatikan:** harga konsumen tampil di website, harga grosir bersifat internal; produk yang dihapus hanya diarsipkan.

## Gambaran Umum

Halaman **Produk** digunakan untuk mengelola data produk MATEX yang tampil pada katalog website publik, mencakup identitas produk, konten dua bahasa, spesifikasi, harga, tautan marketplace, media, dan SEO.

Bagian ini menjelaskan struktur halaman dan memberikan satu contoh pengisian sebagai simulasi. Seluruh produk diisi dengan pola yang sama.

URL: https://internal.matexindo.com/product

## Menampilkan dan Mencari Data Produk

Daftar produk menampilkan kolom **Gambar**, **Nama**, **SKU**, **Harga**, **Stok**, dan **Status**. Kolom **Harga** menampilkan nominal apabila produk diatur untuk menampilkan harga, atau teks **Hubungi kami** apabila tidak. Gunakan kolom **Cari** untuk mencari berdasarkan kunci internal, SKU, atau nama produk. Tindakan **Edit**, **Delete**, dan **View** tersedia pada kolom **Aksi**.

## Menambahkan Produk Baru

Klik **Tambah Produk**. Formulir terdiri atas lima tab, dan disimpan dengan tombol **Simpan Produk**.

| Tab | Isian utama |
| --- | --- |
| Umum | Kunci internal, SKU, bentuk produk, status, satuan, kategori (minimal satu), berat dan dimensi, minimum pesanan, status dan jumlah stok, serta penanda unggulan. |
| Konten & Bahasa | Slug URL, nama produk, ringkasan, deskripsi lengkap, dan daftar spesifikasi untuk Bahasa Indonesia dan English. |
| Harga & Kanal | Tampilan harga publik, harga Rupiah dan Dollar, serta tautan pembelian pada marketplace. |
| Media | Gambar utama, gambar berbagi sosial, dan galeri (maksimal 10 gambar atau video). |
| SEO | Judul dan deskripsi SEO serta judul dan deskripsi saat dibagikan untuk setiap bahasa. |

### Kategori dan Status

Pilih minimal satu kategori produk. Status produk adalah **Draft**, **Dipublikasikan**, atau **Diarsipkan**; hanya produk **Dipublikasikan** yang tampil pada website.

### Harga Publik

Pilihan **Tampilan harga publik** adalah **Tampilkan harga**, **Hubungi kami**, atau **Sembunyikan**. Apabila memilih **Tampilkan harga**, harga konsumen yang aktif dan tampil untuk Rupiah (IDR) dan Dollar (USD) wajib diisi.

### Tautan Marketplace

Gunakan **Tambah kanal** untuk memilih platform (misalnya Shopee atau Tokopedia) dan mengisi tautan langsung ke halaman produk (diawali http:// atau https://). Satu tautan dapat ditandai sebagai **Rekomendasi utama**. Tautan menjadi tujuan tombol pembelian pada halaman produk.

### Media

Gambar utama dan gambar berbagi sosial harus berupa gambar. Galeri dapat memuat gambar maupun video (MP4, WebM, OGG). Unggah berkas melalui menu **Media** terlebih dahulu apabila belum tersedia.

**Contoh simulasi (bukan data aktual MATEX)**

Kunci internal: sarung-tangan-lateks-m | SKU: MTX-GLV-M-001 | Status: Draft

Kategori: Sarung Tangan Lateks | Nama (ID): Sarung Tangan Lateks Ukuran M

Tampilan harga publik: Hubungi kami | Kanal: Shopee (tautan produk), ditandai Rekomendasi utama

## Ketentuan Penting

- Kunci internal dan SKU tidak boleh sama dengan produk lain.
- Kedua bahasa wajib dilengkapi, dan minimal satu kategori harus dipilih.
- Menghapus produk akan mengarsipkannya sehingga tidak lagi tampil pada website.
- Pilihan **Aktifkan commerce internal** dipersiapkan untuk tahap pengembangan berikutnya dan tidak digunakan pada versi 1.0.10.
- Informasi harga, stok, dan klaim produk harus akurat dan sesuai kebijakan MATEX sebelum dipublikasikan.
