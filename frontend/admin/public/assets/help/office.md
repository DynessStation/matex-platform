# Halaman Kantor

> **Untuk apa:** mengelola data kantor (alamat, peta, kontak, jam operasional, foto) yang juga tampil di halaman kontak website.
> **Izin yang dibutuhkan:** office.view untuk melihat; office.create, office.update, office.delete untuk mengubah.
> **Perlu diperhatikan:** kantor tampil di website hanya bila Aktif dan Publik; pemilih lokasi membutuhkan Google Maps yang berfungsi.

## Gambaran Umum

Kantor dipakai di dua tempat: sebagai penempatan akun admin, dan sebagai daftar kantor di halaman kontak website matexindo.com. Alamat, peta, dan jam operasional hanya diatur di sini; halaman Pengaturan Kontak tidak menyimpannya terpisah.

Formulir terdiri atas enam tab: Umum, Lokasi, Kontak, Jam Operasional, Media, dan Publikasi. Cara memakai tabel dijelaskan di Panduan umum bagian Tabel Daftar.

URL: https://internal.matexindo.com/office

## Daftar Kantor

Kotak **Cari** mencari di kode, nama, alamat, kota, dan provinsi. Kolom Kode, Kantor, Kota, Admin, Media, dan Dibuat dapat diurutkan.

### Admin

Jumlah akun admin yang ditempatkan di kantor ini. Kantor yang masih dipakai akun tidak bisa dihapus.

### Media

Jumlah foto di galeri kantor.

### Visibilitas

Publik berarti kantor ditampilkan di halaman kontak website (bila juga Aktif); Internal berarti hanya dipakai di panel admin.

## Tab Umum

Identitas dasar kantor.

### Kode

Kode singkat kantor, wajib, paling banyak 50 karakter: huruf, angka, tanda hubung, dan garis bawah, misalnya KP-BGR. Disimpan dalam huruf kapital dan harus unik.

### Nama kantor

Nama kantor yang wajib, paling banyak 255 karakter, misalnya Kantor Pusat. Harus unik di perusahaan Anda dan menjadi dasar slug publik bila slug dikosongkan.

### Deskripsi

Penjelasan singkat tentang kantor, opsional.

## Tab Lokasi

Posisi kantor di peta. Cari alamat di kotak pencarian peta, klik titik di peta, atau geser penanda.

### Alamat

Alamat, kota, provinsi, dan kode pos terisi otomatis dari titik yang dipilih di peta dan tidak bisa diketik manual. Pastikan titiknya benar sebelum menyimpan.

Bila peta gagal dimuat, lokasi tidak bisa diatur; hubungi developer untuk memeriksa layanan Google Maps.

### Latitude dan longitude

Koordinat titik kantor, terisi otomatis dari peta dan selalu tersimpan berpasangan.

### Geofence absensi

Pilihan untuk menandai area absensi di sekitar kantor. Saat ini hanya tersimpan sebagai data; belum dipakai modul absensi.

Bila diaktifkan, lokasi kantor dan radius absensi wajib diisi.

### Radius absensi

Jarak dari titik kantor dalam meter (bilangan bulat lebih dari 0) untuk geofence absensi.

## Tab Kontak

Semua kolom opsional dan tampil di halaman kontak website untuk kantor publik.

### Email

Alamat email kantor; harus berformat email yang valid.

### Telepon

Nomor telepon kantor yang ditampilkan ke pengunjung.

### URL website

Alamat website kantor, diawali http:// atau https://.

### URL Google Business

Tautan profil Google Business kantor, diawali http:// atau https://.

## Tab Jam Operasional

Tujuh baris, Senin sampai Minggu, masing-masing **Buka** atau **Tutup** (bawaan Tutup). Saat hari dibuka, sistem menyiapkan rentang 08:00–17:00 yang bisa diubah.

### Rentang waktu

Satu hari boleh punya beberapa rentang, misalnya 08:00–12:00 dan 13:00–17:00 untuk jeda istirahat. Tambah dengan **Tambah Rentang Waktu**, hapus dengan ikon hapus rentang. Jam buka dan tutup tidak boleh sama.

## Tab Media

Galeri foto kantor dari Media. Tab ini hanya tampil bagi akun yang punya izin melihat Media. Klik **Pilih Media** untuk memilih foto (JPEG, PNG, atau WebP; paling banyak 20 foto).

### Sampul

Foto pertama otomatis menjadi sampul yang tampil paling depan; ganti dengan **Jadikan Sampul** pada foto lain.

### Keterangan

Teks singkat untuk tiap foto, paling banyak 255 karakter, dipakai sebagai keterangan foto di website.

### Publik

Menentukan apakah foto boleh ditampilkan di website. Foto yang tidak publik tetap tersimpan di galeri panel.

### Urutan foto

Tombol naik dan turun mengatur urutan tampil foto; ikon hapus mengeluarkan foto dari galeri tanpa menghapus berkasnya dari Media.

## Tab Publikasi

Pengaturan tampil kantor di website.

### Tampilkan kantor ini secara publik

Aktifkan agar kantor tampil di halaman kontak website. Kantor juga harus berstatus Aktif.

### Slug publik

Bagian alamat halaman kantor di website, misalnya kantor-pusat. Bila dikosongkan, dibuat otomatis dari nama kantor. Harus unik.

### Urutan

Angka urutan tampil kantor di website; angka kecil tampil lebih dulu.

### Google Place ID dan URL Google Maps

Terisi otomatis dari pemilih lokasi dan dipakai untuk tombol peta di website.

## Mengubah Status dan Menghapus

Tindakan ini ada di menu tiga titik pada baris kantor.

### Edit

Membuka formulir dengan enam tab yang sama.

### Nonaktifkan dan aktifkan

Nonaktifkan menyembunyikan kantor dari website dan pilihan penempatan baru; Aktifkan mengembalikannya.

### Hapus

Hanya untuk kantor Nonaktif yang tidak lagi dipakai akun admin. Jam operasional dan daftar foto kantor ikut terhapus (berkas fotonya tetap di Media).

## Aturan Penting

- Kode dan nama kantor harus unik; slug publik juga harus unik.
- Kantor tampil di website hanya bila Aktif dan Publik.
- Perubahan alamat, jam, atau foto langsung terlihat di halaman kontak website setelah disimpan.
- Perubahan kantor tercatat di Log Aktivitas.
