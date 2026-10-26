# Halaman Pengaturan Kontak

> **Untuk apa:** mengatur kanal kontak (WhatsApp, email, dan lainnya) dan topik formulir kontak beserta email penerimanya.
> **Izin yang dibutuhkan:** public_contact.view untuk melihat; public_contact.update untuk mengubah.
> **Perlu diperhatikan:** belum ada halaman admin untuk membaca pesan masuk; pesan datang lewat email penerima, jadi pastikan email itu aktif.

## Gambaran Umum

Halaman ini mengatur informasi kontak di halaman kontak website dan pilihan topik di formulir kontak. Semua pengaturan disimpan sekaligus dengan **Simpan Pengaturan Kontak**. Alamat, peta, dan jam operasional diatur di halaman Kantor.

URL: https://internal.matexindo.com/public-contact

## Kanal Kontak

Nomor, email, dan tautan yang tampil di website. Klik **Tambah Kanal** untuk menambah kanal (paling banyak 30). Kanal yang dihapus dari daftar disembunyikan dari website setelah pengaturan disimpan.

### Nama internal

Kode pembeda kanal untuk sistem, wajib dan unik, misalnya whatsapp-sales. Hanya huruf kecil, angka, dan tanda hubung; tidak tampil ke pengunjung.

### Jenis

WhatsApp, Email, Telepon, Media sosial, Website, atau Lainnya, wajib. Jenis menentukan ikon dan cara tautan dibuat.

### Nilai

Isi kanal yang ditampilkan, wajib, misalnya nomor atau alamat email. Nomor WhatsApp ditulis dengan tanda plus dan kode negara, misalnya +6281234567890.

### Tautan

Untuk WhatsApp, Email, dan Telepon dibuat otomatis dari nilai. Untuk jenis lain, isi alamat yang diawali http, https, mailto, atau tel.

### Urutan

Angka urutan tampil kanal di website; angka kecil tampil lebih dulu.

### Utama

Menandai kanal utama untuk jenisnya, misalnya nomor WhatsApp yang dipakai tombol chat utama.

### Publik

Bila dimatikan, kanal tetap tersimpan tetapi tidak tampil di website.

### Label dan keterangan

Nama kanal dan penjelasan singkat untuk pengunjung, dalam Bahasa Indonesia dan English. Kedua label wajib; tombol bantuan menulis bisa membuat draf keterangan atau terjemahannya.

## Topik Pesan

Pilihan topik di formulir kontak website dan email yang menerima pesan untuk tiap topik. Klik **Tambah Topik** untuk menambah. Minimal satu topik harus aktif agar formulir bisa dikirim; topik yang dihapus dari daftar hanya dinonaktifkan.

### Nama internal

Kode pembeda topik untuk sistem, wajib dan unik, misalnya general-inquiry, dengan aturan penulisan yang sama seperti kanal.

### Email penerima

Alamat email yang menerima pesan untuk topik ini, wajib. Pastikan alamatnya aktif dan dipantau.

### Urutan dan aktif

Urutan pilihan topik di formulir, dan apakah topik ditawarkan ke pengunjung.

### Topik

Teks topik yang dipilih pengunjung, wajib dalam Bahasa Indonesia dan English, misalnya Informasi Produk.

## Alur Pesan dari Pengunjung

Pengunjung memilih topik, mengisi nama, email atau telepon, dan pesan, lalu menyetujui ketentuan. Pesan disimpan sistem dengan nomor MSG-<nomor> dan dikirim ke email penerima topiknya. Pengiriman berulang dalam waktu singkat dibatasi untuk mencegah penyalahgunaan.

Jumlah pesan hari ini tampil di Dasbor. Isi pesan dan balasannya diurus lewat email; bila pengiriman email gagal, pesan tetap tersimpan di sistem.

## Aturan Penting

- Bila ada isian yang belum lengkap atau nama internal yang sama, kolomnya ditandai merah dan penyimpanan dibatalkan.
- Lengkapi label kedua bahasa agar tampil benar di website Bahasa Indonesia dan English.
- Periksa tautan WhatsApp dan email di website setelah menyimpan.
- Perubahan pengaturan kontak tercatat di Log Aktivitas.
