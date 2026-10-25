# Halaman FAQ

> **Untuk apa:** mengelola daftar tanya-jawab di halaman FAQ website.
> **Izin yang dibutuhkan:** faq.view, .create, .update, .delete.
> **Perlu diperhatikan:** setiap FAQ wajib dua bahasa; FAQ yang dihapus langsung hilang dari website.

## Gambaran Umum

Halaman **FAQ** digunakan untuk mengelola daftar pertanyaan dan jawaban yang ditampilkan pada halaman FAQ website publik. Setiap FAQ disusun dalam dua bahasa, yaitu Bahasa Indonesia dan English.

URL: https://internal.matexindo.com/faq

## Menampilkan dan Mencari Data FAQ

Gunakan kolom **Cari** untuk mencari berdasarkan teks pertanyaan atau nama internal FAQ, dan pilihan **Tampilkan** untuk mengatur jumlah baris per halaman (15, 25, 50, atau 100). Mengeklik baris pada tabel membuka halaman edit FAQ tersebut.

## Memahami Tabel Daftar FAQ

- **Pertanyaan:** teks pertanyaan.
- **Nama internal FAQ:** pembeda FAQ bagi sistem.
- **Bahasa:** menunjukkan kelengkapan, yaitu Indonesia + English apabila kedua bahasa lengkap.
- **Urutan:** urutan tampil pada website.
- **Dibuat Pada:** tanggal data dibuat.
- **Tampil di website:** sakelar untuk menampilkan atau menyembunyikan FAQ.

## Menambahkan FAQ Baru

1. Klik tombol **+ Tambah FAQ**.
2. Isi **Nama internal FAQ** dengan huruf kecil, angka, dan tanda hubung, misalnya pengiriman-produk. Nama ini tidak tampil kepada pengunjung dan tidak boleh sama dengan FAQ lain.
3. Isi **Urutan** dengan angka 0 atau lebih; angka lebih kecil tampil lebih awal.
4. Pada kartu **Bahasa Indonesia**, isi **Pertanyaan** (maksimal 500 karakter) dan **Jawaban**.
5. Pada kartu **English**, isi pertanyaan dan jawaban dalam Bahasa Inggris.
6. Pastikan pilihan **Aktif** sesuai kebutuhan, lalu klik **Simpan FAQ**.

Kedua bahasa wajib dilengkapi. Tersedia pula tombol bantuan penulisan seperti **Isi jawaban otomatis** dan **Terjemahkan jawaban Indonesia**. Draf yang dihasilkan perlu diperiksa kembali sebelum disimpan.

**Contoh simulasi (bukan data aktual MATEX)**

Nama internal: pemesanan-produk | Urutan: 1

Pertanyaan (ID): Bagaimana cara memesan produk MATEX?

Jawaban (ID): Pengunjung dapat menghubungi kami melalui halaman Kontak atau membeli melalui tautan marketplace pada halaman produk.

## Mengelola FAQ yang Sudah Ada

- **Edit:** mengubah isi FAQ, urutan, atau status. Simpan dengan **Perbarui FAQ**.
- **Sakelar Tampil / Disembunyikan:** menampilkan atau menyembunyikan FAQ pada website. Sistem meminta konfirmasi sebelum status berubah.
- **Hapus:** menghapus FAQ dari daftar. Penghapusan dapat dilakukan satu per satu atau massal dengan mencentang beberapa baris.

## Ketentuan Penting dalam Pengelolaan FAQ

- FAQ hanya tampil pada website apabila berstatus aktif dan memiliki isi pada bahasa yang sedang dibuka pengunjung.
- Nama internal FAQ tidak dapat digunakan ulang. Sistem menampilkan pesan bahwa kunci FAQ sudah digunakan.
- FAQ yang dihapus tidak lagi tampil pada website. Berbeda dengan Jabatan dan Kantor, FAQ tidak perlu dinonaktifkan terlebih dahulu.
- Judul, ringkasan, SEO, dan status publikasi halaman FAQ diatur pada **Pengaturan halaman & SEO** (tombol pada halaman ini). Daftar pertanyaan dan jawaban tetap dikelola melalui menu FAQ.

Catatan**:** pengelompokan FAQ berdasarkan kategori telah disiapkan pada struktur data, tetapi belum tersedia pengelolaannya melalui halaman admin pada versi 1.0.10.

## Praktik Pengelolaan FAQ yang Disarankan

- Tuliskan pertanyaan sebagaimana yang biasa diajukan pengunjung.
- Gunakan jawaban yang singkat, jelas, dan konsisten dengan informasi produk pada website.
- Tinjau FAQ secara berkala dan sembunyikan FAQ yang sudah tidak berlaku.
- Pastikan terjemahan English memiliki makna yang setara dengan versi Indonesia.
