# Halaman Jabatan

> **Untuk apa:** mengelola daftar jabatan/posisi yang dipilih pada akun admin.
> **Izin yang dibutuhkan:** chair.view untuk melihat; chair.create, chair.update, chair.delete untuk mengubah.
> **Perlu diperhatikan:** jabatan hanya label organisasi, bukan hak akses; jabatan yang masih dipakai akun tidak dapat dihapus.

## Gambaran Umum

Jabatan adalah data referensi yang dipilih saat membuat atau mengubah akun admin, misalnya IT Support atau Marketing Executive. Jabatan hanya menjelaskan kedudukan seseorang di organisasi; menu dan tindakan yang boleh dilakukan diatur lewat **Profil Akses** dan **Hak Akses**.

Halaman ini dibuka dari **Administrasi › Jabatan**. Cara memakai tabel (cari, urutkan, muat ulang, menu aksi) dijelaskan di Panduan umum bagian Tabel Daftar.

URL: https://internal.matexindo.com/chair

## Daftar Jabatan

Tabel menampilkan semua jabatan perusahaan Anda yang belum dihapus. Kotak **Cari** mencari di nama dan deskripsi; kolom Jabatan / Posisi, Admin, dan Dibuat dapat diurutkan.

### Jabatan / Posisi

Nama jabatan seperti yang tampil saat memilih jabatan di formulir Akun Admin.

### Deskripsi

Keterangan singkat tentang tanggung jawab jabatan; kosong bila tidak diisi.

### Admin

Jumlah akun admin (aktif maupun nonaktif) yang memakai jabatan ini. Periksa angka ini sebelum menonaktifkan atau menghapus jabatan.

### Status

Aktif berarti jabatan bisa dipilih di formulir Akun Admin. Nonaktif berarti jabatan disimpan tetapi tidak ditawarkan lagi untuk akun baru.

## Formulir Jabatan

Formulir dibuka dari tombol **+ Tambah Jabatan / Posisi** atau menu aksi **Edit**. Simpan dengan tombol di bawah formulir; jabatan baru langsung berstatus Aktif.

### Nama jabatan / posisi

Nama jabatan yang wajib diisi, paling banyak 255 karakter, misalnya IT Support.

Nama tidak boleh sama dengan jabatan lain di perusahaan Anda, tanpa membedakan huruf besar dan kecil ("IT Support" dan "it support" dianggap sama). Bila sudah dipakai, muncul pesan bahwa nama jabatan / posisi sudah digunakan.

### Deskripsi

Penjelasan singkat tugas atau fungsi jabatan, opsional. Membantu admin lain memilih jabatan yang tepat.

## Mengubah Status dan Menghapus

Tindakan ini ada di menu tiga titik pada baris jabatan dan hanya tampil bila akun Anda memiliki izinnya.

### Edit

Membuka formulir untuk mengubah nama atau deskripsi jabatan. Perubahan nama langsung terlihat di semua akun yang memakai jabatan ini.

### Nonaktifkan dan aktifkan

Nonaktifkan menghentikan jabatan dipilih untuk akun tanpa menghapus datanya; Aktifkan mengembalikannya. Sistem meminta konfirmasi lebih dulu.

Menonaktifkan jabatan yang masih dipakai akun tetap diperbolehkan; akun tersebut tetap menyimpan jabatannya.

### Hapus

Menghapus jabatan dari daftar. Hanya tersedia untuk jabatan Nonaktif yang sudah tidak dipakai akun mana pun.

Bila masih dipakai, pindahkan dulu akun terkait ke jabatan lain melalui halaman Akun Admin.

## Aturan Penting

- Jabatan harus dinonaktifkan dulu sebelum bisa dihapus, dan tidak boleh dipakai akun mana pun.
- Gunakan nama yang konsisten dan hindari jabatan ganda dengan arti sama.
- Setiap penambahan, perubahan, perubahan status, dan penghapusan jabatan tercatat di Log Aktivitas.
