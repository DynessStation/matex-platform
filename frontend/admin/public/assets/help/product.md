# Halaman Produk

> **Untuk apa:** mengelola katalog produk: data, konten dua bahasa, spesifikasi, harga, tautan marketplace, gambar, dan SEO.
> **Izin yang dibutuhkan:** product.view untuk melihat; product.create, product.update, product.delete untuk mengubah.
> **Perlu diperhatikan:** hanya produk Dipublikasikan yang tampil di website; harga grosir tidak pernah tampil ke publik; menghapus produk hanya mengarsipkannya.

## Gambaran Umum

Produk adalah isi katalog website matexindo.com. Formulir terdiri atas lima tab: Umum, Konten & Bahasa, Harga & Kanal, Media, dan SEO; simpan dengan **Simpan Produk** di bawah formulir. Konten wajib diisi untuk Bahasa Indonesia dan English.

Cara memakai tabel dijelaskan di Panduan umum bagian Tabel Daftar.

URL: https://internal.matexindo.com/product

## Daftar Produk

Kotak **Cari** mencari di kunci internal, SKU, dan nama produk. Pencarian, urutan, dan halaman tersimpan di alamat halaman, jadi bisa dibagikan atau dibuka lagi.

### Harga

Nominal harga konsumen bila produk diatur menampilkan harga, atau "Hubungi kami" bila tidak.

### Stok

Status stok produk: tersedia, habis, pre-order, atau dibuat sesuai pesanan.

### Status

Draft (belum tampil), Dipublikasikan (tampil di website), atau Diarsipkan (disimpan, tidak tampil).

Tanpa pilihan urut, daftar menampilkan produk di depan katalog lebih dulu sesuai urutannya, lalu produk lain menurut nama.

## Produk di Depan

Tombol **Produk di depan** di kepala halaman menampilkan produk yang tampil paling depan di katalog website, paling banyak 12, sesuai urutannya. Produk lain menyusul dari yang terbaru. Pilihan urut pengunjung (A-Z, harga) tetap berlaku.

Seret baris atau pakai tombol panah untuk mengubah urutan. Tombol silang mengeluarkan produk dari depan katalog; produk itu tetap ada dan kembali tampil dari yang terbaru. Klik **Simpan urutan** untuk menyimpan, atau **Batal** untuk menutup tanpa menyimpan. Produk Draft atau Diarsipkan diberi tanda karena belum tampil di website.

Produk ditambahkan ke depan katalog dengan mencentang **Tampilkan di depan katalog** di tab Umum formulir produk; produk itu masuk paling akhir.

## Tab Umum

Identitas, kategori, ukuran, dan stok produk.

### Kunci internal

Kode tetap produk untuk sistem, wajib dan unik, misalnya sarung-tangan-lateks-m. Hanya huruf kecil, angka, dan tanda hubung; huruf lain otomatis disesuaikan.

### SKU

Kode stok produk, wajib dan unik, paling banyak 120 karakter, misalnya MTX-GLV-M-001.

### Bentuk produk

Fisik, jasa, atau digital. Menentukan cara produk dijelaskan; bawaannya Fisik.

### Status

Draft untuk produk yang masih disiapkan, Dipublikasikan agar tampil di website, Diarsipkan untuk menyimpan tanpa menampilkan.

### Satuan

Satuan jual, misalnya pcs, box, atau roll; paling banyak 40 karakter.

### Jenis / kelompok produk

Pengelompokan bebas untuk internal, misalnya "Sarung tangan medis"; paling banyak 120 karakter. Berbeda dengan kategori katalog.

### Kategori

Kategori katalog tempat produk tampil di website, wajib minimal satu. Hanya kategori yang tersedia yang bisa dipilih; daftarnya diatur di halaman Kategori Produk.

### Barcode / GTIN

Nomor barcode produk (misalnya EAN-13), opsional, paling banyak 120 karakter.

### Kode manufaktur

Kode produk dari pabrik pembuat, opsional.

### HS code

Kode tarif ekspor-impor (Harmonized System), opsional, paling banyak 50 karakter.

### Asal produk

Negara, provinsi, dan kota/kabupaten asal produk, opsional.

### Berat dan dimensi

Berat dalam gram serta panjang, lebar, dan tinggi dalam milimeter, opsional, tidak boleh negatif.

### Minimum pesanan

Jumlah paling sedikit yang bisa dipesan, minimal 1.

### Lead time

Perkiraan hari yang dibutuhkan sampai pesanan siap, opsional.

### Status stok

Tersedia, Habis, Pre-order, atau Dibuat sesuai pesanan. Tampil di website sebagai informasi ketersediaan.

### Kelola stok

Bila dicentang, jumlah stok dicatat di kolom **Jumlah stok**. Belum ada pengurangan stok otomatis karena website belum menerima pesanan langsung.

### Produk unggulan

Menandai produk unggulan, yang didahulukan di bagian produk beranda website (8 produk) dan dua yang pertama tampil di menu katalog pada header.

### Tampilkan di depan katalog

Bila dicentang, produk tampil paling depan di katalog website. Produk yang baru dicentang masuk paling akhir di antara produk di depan; di bawah kotak tertulis posisinya, misalnya "Posisi 2 dari 5 di depan katalog". Paling banyak 12 produk; bila sudah penuh, keluarkan produk lain dulu lewat **Produk di depan**. Urutannya diubah lewat tombol **Produk di depan** di daftar produk.

Bila tidak dicentang, produk tampil setelah produk di depan, dari yang terbaru.

## Tab Konten & Bahasa

Nama dan isi halaman produk, diisi untuk Bahasa Indonesia dan English (pilih bahasa dengan tombol di atas tab).

### Slug URL

Bagian alamat halaman produk di website, wajib per bahasa, misalnya sarung-tangan-lateks-m menjadi matexindo.com/produk/sarung-tangan-lateks-m. Harus unik.

### Nama produk

Nama produk yang tampil di katalog dan halaman produk, wajib per bahasa, paling banyak 255 karakter.

### Ringkasan

Kalimat singkat di bawah nama produk dan di kartu katalog, opsional.

### Deskripsi lengkap

Isi halaman produk dengan format teks (tebal, daftar, tautan), opsional.

### Spesifikasi

Daftar pasangan **Nama spesifikasi** dan **Nilai**, misalnya Bahan: Lateks alami. Tampil sebagai tabel spesifikasi di halaman produk.

## Tab Harga & Kanal

Harga publik, harga internal, dan tautan pembelian di marketplace.

### Tampilan harga publik

Tampilkan harga (harga konsumen tampil di website), Hubungi kami (pengunjung diarahkan menghubungi MATEX), atau Sembunyikan.

Bila memilih Tampilkan harga, harga konsumen aktif dan publik wajib ada untuk Rupiah (IDR) dan Dollar (USD).

### Untuk siapa?

Konsumen (end user) atau Grosir. Harga grosir selalu internal dan tidak pernah tampil di website.

### Mata uang dan nominal

Rupiah (IDR) atau Dollar (USD), dengan nominal tidak boleh negatif. Tiap mata uang hanya boleh punya satu harga konsumen publik.

### Nama harga

Label harga untuk internal, misalnya "Harga konsumen" atau "Grosir 10 box".

### Minimum dan maksimum pembelian

Rentang jumlah pembelian yang berlaku untuk harga ini, opsional; berguna untuk harga grosir bertingkat.

### Harga pembanding

Harga sebelum diskon yang tampil dicoret di website, opsional.

### Platform

Marketplace tujuan tombol beli, misalnya Shopee atau Tokopedia, wajib per kanal. Tambah kanal dengan **Tambah kanal**.

### Tautan produk

Alamat halaman produk di marketplace, wajib, diawali http:// atau https://.

### Rekomendasi utama

Kanal yang ditonjolkan sebagai tombol beli utama. Hanya satu kanal aktif yang boleh menjadi rekomendasi; bila tidak ada yang dipilih, kanal aktif pertama dipakai.

### Aktif di publik

Kanal yang disembunyikan tetap tersimpan tetapi tidak tampil di website.

### Commerce internal

Disiapkan untuk toko internal MATEX di masa depan; belum dipakai.

## Tab Media

Gambar dan video produk dari Media.

### Gambar utama

Gambar yang tampil di kartu katalog dan paling depan di halaman produk; harus berupa gambar.

### Gambar sosial

Gambar yang tampil saat tautan produk dibagikan di media sosial atau aplikasi pesan; harus berupa gambar.

### Galeri produk

Paling banyak 10 gambar atau video (MP4, WebM, OGG) yang tampil di halaman produk. Unggah berkas lewat Media bila belum ada.

## Tab SEO

Cara produk tampil di Google dan saat dibagikan, per bahasa. Semua kolom opsional; bila kosong, nama dan ringkasan produk dipakai.

### Judul SEO

Judul di hasil pencarian Google, paling banyak 255 karakter; idealnya sekitar 60 karakter.

### Deskripsi SEO

Teks di bawah judul pada hasil pencarian Google, paling banyak 500 karakter; idealnya sekitar 155 karakter.

### Canonical URL

Alamat utama halaman bila konten yang sama ada di beberapa alamat. Biarkan kosong kecuali developer meminta.

### Judul dan deskripsi OG

Judul dan teks yang tampil saat tautan dibagikan di media sosial atau aplikasi pesan.

## Aturan Penting

- Kunci internal, SKU, dan slug tiap bahasa tidak boleh sama dengan produk lain.
- Kedua bahasa wajib dilengkapi dan minimal satu kategori dipilih.
- Menghapus produk mengarsipkannya sehingga tidak tampil di website, dan mengeluarkannya dari depan katalog.
- Paling banyak 12 produk di depan katalog.
- Pastikan harga, stok, dan klaim produk akurat sebelum dipublikasikan.
- Perubahan produk tercatat di Log Aktivitas.
