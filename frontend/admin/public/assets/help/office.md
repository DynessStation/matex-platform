# Halaman Kantor

> **Untuk apa:** mengelola data kantor (alamat, peta, kontak, jam operasional, foto) yang juga tampil di halaman kontak website.
> **Izin yang dibutuhkan:** office.view, .create, .update, .delete.
> **Perlu diperhatikan:** kantor tampil di website hanya bila Aktif dan Publik; peta perlu layanan Google Maps yang berfungsi.

## Gambaran Umum

Halaman **Kantor** digunakan untuk mengelola data kantor MATEX, mencakup identitas kantor, lokasi pada peta, kontak, jam operasional, galeri foto, serta pengaturan publikasi. Data kantor yang ditandai publik dapat ditampilkan pada halaman kontak website https://matexindo.com.

Data alamat, koordinat, tautan peta, dan jam operasional dikelola hanya pada halaman ini agar menjadi satu sumber data. Halaman **Pengaturan Kontak** tidak menyimpan alamat dan peta secara terpisah.

URL: https://internal.matexindo.com/office

## Menampilkan dan Mencari Data Kantor

Pengguna dapat mencari data melalui kolom **Cari** berdasarkan kode, nama, alamat, kota, atau provinsi. Jumlah baris per halaman dapat diatur melalui pilihan **Tampilkan** (15, 25, 50, atau 100 item), dan kolom **Kode**, **Kantor**, **Kota**, **Admin**, **Media**, dan **Dibuat** dapat diurutkan dengan mengeklik judul kolom.

## Memahami Tabel Daftar Kantor

- **Kode:** kode singkat kantor, misalnya KP-BGR.
- **Kantor:** nama kantor.
- **Kota:** kota lokasi kantor.
- **Admin:** jumlah akun admin yang terkait dengan kantor tersebut.
- **Media:** jumlah foto pada galeri kantor.
- **Visibilitas: Publik** apabila ditampilkan pada website, atau **Internal** apabila hanya digunakan di dalam sistem.
- **Status: Aktif** atau **Nonaktif**.
- **Dibuat:** tanggal data dibuat.
- **Aksi:** menu tindakan untuk mengubah, mengaktifkan, menonaktifkan, atau menghapus data.

## Menambahkan Kantor Baru

Klik tombol **+ Tambah Kantor**. Sistem menampilkan formulir **Buat Kantor** yang terdiri atas enam tab, yaitu **Umum**, **Lokasi**, **Kontak**, **Jam Operasional**, **Media**, dan **Publikasi**. Isi setiap tab sesuai kebutuhan, kemudian klik **Buat Kantor** untuk menyimpan.

### Tab Umum

Berisi identitas dasar kantor.

- **Kode** (wajib): maksimal 50 karakter, hanya huruf, angka, tanda hubung, dan garis bawah. Sistem menyimpan kode dalam huruf kapital.
- **Nama Kantor** (wajib): maksimal 255 karakter, misalnya Kantor Pusat.
- **Deskripsi** (opsional): penjelasan singkat mengenai kantor.
2. Tab Lokasi

Digunakan untuk menentukan posisi kantor pada peta. Pengguna dapat mencari lokasi melalui kolom pencarian, mengeklik titik pada peta, atau menggeser penanda. Kolom **Alamat**, **Kota**, **Provinsi**, **Kode Pos**, **Latitude**, dan **Longitude** terisi otomatis dan tidak dapat diketik manual.

Latitude dan longitude harus terisi bersamaan. Apabila peta gagal dimuat, sistem menampilkan pesan bahwa peta tidak dapat dimuat.

Tersedia pula pilihan **Aktifkan geofence absensi** beserta **Radius Absensi** dalam satuan meter. Pada versi 1.0.10 pengaturan ini hanya tersimpan sebagai data dan belum digunakan oleh modul absensi.

### Tab Kontak

Seluruh kolom bersifat opsional: **Email**, **Telepon**, **URL Website**, dan **URL Google Business**. Alamat email harus berformat valid, dan URL harus diawali http atau https.

### Tab Jam Operasional

Terdapat tujuh baris, Senin sampai Minggu. Setiap hari memiliki pilihan **Buka** atau **Tutup** (bawaan: Tutup). Saat hari dibuka, sistem menyiapkan satu rentang 08:00–17:00 yang dapat diubah.

Tombol **Tambah Rentang Waktu** digunakan apabila dalam satu hari terdapat lebih dari satu rentang, misalnya jeda istirahat siang. Rentang yang tidak diperlukan dapat dihapus dengan **Hapus rentang waktu**. Jam buka dan jam tutup tidak boleh sama.

### Tab Media

Tab ini hanya tampil bagi pengguna yang memiliki akses ke Media Library. Klik **Pilih Media** untuk memilih foto kantor dari Media Library (format JPEG, PNG, atau WEBP; maksimal 20 foto).

- Foto pertama otomatis menjadi **Sampul**, dan dapat diganti dengan **Jadikan Sampul**.
- **Keterangan** dapat diisi untuk setiap foto (maksimal 255 karakter).
- Kotak **Publik** menentukan apakah foto boleh ditampilkan kepada publik.
- Urutan foto dapat diatur dengan tombol geser naik dan turun, dan foto dapat dihapus dari galeri dengan **Hapus media**.
6. Tab Publikasi

Aktifkan **Tampilkan kantor ini secara publik** agar kantor tampil pada website. Setelah aktif, tersedia **Slug Publik** (dibuat otomatis dari nama kantor apabila dikosongkan) dan **Urutan** tampil. **Google Place ID** dan **URL Google Maps** terisi otomatis dari pemilih lokasi.

**Contoh simulasi (bukan data aktual MATEX)**

Kode: KP-BGR | Nama Kantor: Kantor Pusat

Jam operasional: Senin–Jumat, 08:00–12:00 dan 13:00–17:00; Sabtu–Minggu: Tutup

Publikasi: tampil secara publik, slug kantor-pusat, urutan 1

## Mengelola Kantor yang Sudah Ada

- **Edit:** membuka formulir **Edit Kantor** dengan seluruh tab yang sama. Simpan dengan **Perbarui Kantor**.
- **Nonaktifkan / Aktifkan:** menghentikan atau memulihkan penggunaan kantor. Kantor yang nonaktif tidak ditampilkan pada website publik.
- **Hapus:** hanya tersedia untuk kantor berstatus **Nonaktif**.

## Ketentuan Penting dalam Pengelolaan Kantor

- Kode atau nama kantor tidak boleh sama dengan kantor lain yang masih terdaftar.
- Slug publik harus unik. Apabila sudah digunakan, sistem menolak penyimpanan.
- Kantor harus dinonaktifkan terlebih dahulu sebelum dihapus, dan tidak dapat dihapus selama masih digunakan oleh akun admin.
- Penghapusan kantor juga menghapus jam operasional dan daftar media yang terkait dengan kantor tersebut.
- Kantor yang tampil pada website publik harus berstatus **Aktif** dan bervisibilitas **Publik**.
- Apabila peta tidak dapat dimuat, penentuan lokasi tidak dapat dilakukan karena kolom lokasi bersifat otomatis. Hubungi pengembang untuk memeriksa konfigurasi layanan peta.

## Hubungan Kantor dengan Halaman Lain

Data kantor digunakan oleh akun admin (penentuan kantor pengguna) dan oleh halaman kontak pada website publik. Perubahan pada alamat, jam operasional, atau koordinat akan tercermin pada halaman kontak setelah data disimpan dan kantor berstatus aktif serta publik.

## Praktik Pengelolaan Kantor yang Disarankan

- Gunakan kode kantor yang singkat dan konsisten.
- Pastikan lokasi pada peta sesuai dengan alamat kantor sebelum disimpan.
- Perbarui jam operasional apabila terjadi perubahan, termasuk hari libur yang bersifat tetap.
- Gunakan foto kantor yang jelas dan sudah tersedia pada Media Library.
- Aktifkan visibilitas publik hanya untuk kantor yang memang akan diinformasikan kepada pengunjung.
