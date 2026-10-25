# Halaman Pengaturan Kontak

> **Untuk apa:** mengatur kanal kontak (WhatsApp, email, dll.) dan topik formulir kontak beserta email penerimanya.
> **Izin yang dibutuhkan:** public_contact.view, .update.
> **Perlu diperhatikan:** belum ada halaman admin untuk membaca pesan masuk — pesan datang lewat email penerima; pastikan email penerima aktif.

## Gambaran Umum

Halaman **Pengaturan Kontak** digunakan untuk mengelola informasi kontak yang ditampilkan kepada pengunjung website, serta pilihan topik pada formulir kontak publik beserta alamat email penerimanya. Seluruh pengaturan pada halaman ini disimpan sekaligus melalui satu tombol simpan.

URL: https://internal.matexindo.com/public-contact

## Kanal Kontak

Bagian **Kanal Kontak** berisi nomor, email, dan tautan yang tampil pada website publik. Klik **Tambah Kanal** untuk menambahkan kanal baru. Setiap kanal ditampilkan dalam kartu bernomor dengan isian berikut:

- **Nama internal** (wajib): pembeda kanal bagi sistem dan tidak tampil kepada pengunjung. Gunakan huruf kecil, angka, dan tanda hubung, misalnya whatsapp-sales. Nama tidak boleh sama dengan kanal lain.
- **Jenis** (wajib): WhatsApp, Email, Telepon, Media sosial, Website, atau Lainnya.
- **Nilai** (wajib): isi kanal, misalnya nomor atau alamat email. Untuk WhatsApp, nomor ditulis dengan awalan tanda plus dan kode negara, misalnya +62…
- **Tautan:** untuk jenis WhatsApp, Email, dan Telepon, tautan dibuat otomatis dari nilai kanal. Untuk jenis lain, isi alamat tautan secara manual dengan awalan http, https, mailto, atau tel.
- **Urutan:** menentukan urutan tampil.
- **Utama:** menandai kanal utama untuk jenis kontak tersebut.
- **Publik:** menentukan apakah kanal ditampilkan kepada pengunjung (bawaan aktif).
- **Label dan Keterangan** dalam Bahasa Indonesia dan English. Kedua label wajib diisi.

Jumlah kanal maksimal 30. Kanal yang dihapus dari daftar akan disembunyikan dari website setelah pengaturan disimpan.

## Topik Pesan

Bagian **Topik Pesan** menentukan pilihan topik pada formulir kontak website dan alamat email yang menerima notifikasi untuk topik tersebut. Klik **Tambah Topik** untuk menambahkan topik. Isian setiap topik:

- **Nama internal** (wajib) dengan aturan penulisan yang sama seperti kanal, misalnya general-inquiry.
- **Email Penerima** (wajib): alamat email yang menerima pesan untuk topik ini.
- **Urutan** dan **Aktif:** menentukan urutan dan apakah topik tampil sebagai pilihan pada formulir publik.
- **Topik** dalam Bahasa Indonesia dan English (keduanya wajib).

Minimal satu topik harus tersedia agar formulir kontak publik dapat dikirim. Topik yang dihapus dari daftar tidak dihapus permanen, tetapi dinonaktifkan. Topik bawaan yang tersedia saat ini adalah Informasi Produk, Penawaran & Pembelian, Kemitraan & Kerja Sama, dan Lainnya.

## Alamat dan Peta

Bagian ini hanya berisi informasi bahwa alamat, koordinat, tautan peta, dan jam operasional dikelola dari halaman **Kantor**. Gunakan tombol **Kelola Kantor** untuk berpindah ke halaman tersebut.

## Menyimpan Pengaturan

1. Periksa seluruh kanal dan topik, terutama kolom yang wajib diisi.
2. Klik **Simpan Pengaturan Kontak**.
3. Apabila terdapat isian yang belum lengkap atau nama internal yang sama, sistem menandai kolom dengan warna merah dan menampilkan pesan peringatan. Perbaiki kolom tersebut kemudian simpan kembali.

## Pembuatan Teks Otomatis

Pada kolom keterangan tersedia tombol bantuan penulisan, yaitu **Isi ini otomatis** untuk membuat draf keterangan Bahasa Indonesia dan **Translate from Indonesian** untuk menerjemahkan keterangan ke Bahasa Inggris. Fitur ini bergantung pada konfigurasi layanan di server; apabila belum aktif, sistem menampilkan pesan bahwa fitur belum aktif. Hasil bantuan penulisan harus selalu diperiksa kembali sebelum disimpan.

## Alur Pesan dari Pengunjung

Pengunjung website mengirim pesan melalui formulir kontak dengan memilih topik, mengisi nama, email atau telepon, dan pesan, serta menyetujui ketentuan. Pesan disimpan oleh sistem dan notifikasi dikirim melalui email ke alamat penerima sesuai topik yang dipilih. Sistem membatasi pengiriman berulang dalam waktu singkat untuk mengurangi penyalahgunaan.

Catatan**:** pada versi 1.0.10 belum tersedia halaman admin untuk melihat dan mengelola pesan masuk. Pesan diterima melalui email penerima yang diatur pada topik. Pengguna perlu memastikan alamat email penerima aktif dan dipantau secara berkala.

## Praktik Pengelolaan Kontak yang Disarankan

- Gunakan nomor dan alamat email resmi yang aktif dan dipantau.
- Lengkapi label dalam Bahasa Indonesia dan English agar tampil benar pada kedua bahasa website.
- Periksa tautan WhatsApp dan email pada website setelah perubahan disimpan.
- Gunakan satu alamat penerima per topik yang jelas penanggung jawabnya.
