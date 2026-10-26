# Halaman Profil Akses

> **Untuk apa:** menyusun paket izin (peran) yang dipasang pada akun admin.
> **Izin yang dibutuhkan:** admin_access.view untuk melihat; admin_access.create, admin_access.update, admin_access.delete untuk mengubah.
> **Perlu diperhatikan:** menonaktifkan profil langsung mencabut akses semua akun yang memakainya; tinjau izin sebelum memakai Pilih Semua.

## Gambaran Umum

Profil akses adalah kumpulan hak akses, misalnya "Marketing" yang boleh mengelola produk dan artikel. Profil yang aktif dapat dipilih saat membuat atau mengubah akun di halaman **Akun Admin**; daftar izin yang bisa dipilih diatur di halaman **Hak Akses**.

Cara memakai tabel dijelaskan di Panduan umum bagian Tabel Daftar.

URL: https://internal.matexindo.com/admin-access

## Daftar Profil Akses

Kotak **Cari** mencari di nama dan deskripsi profil.

### Hak akses

Jumlah izin aktif di profil. Izin yang dinonaktifkan di halaman Hak Akses tidak dihitung, jadi angkanya bisa lebih kecil dari yang pernah dicentang. Angka ini bukan ukuran tingkat keamanan.

### Admin

Jumlah akun (aktif maupun nonaktif) yang memakai profil ini. Periksa angka ini sebelum mengubah izin atau menonaktifkan profil.

### Status

Aktif berarti profil bisa dipilih dan berlaku. Nonaktif berarti semua akun pemakainya (kecuali Akses Sistem Penuh) langsung tidak bisa menjalankan fitur apa pun.

## Formulir Profil Akses

Formulir dibuka dari tombol **+ Tambah Profil Akses** atau menu aksi **Edit**. Perubahan izin berlaku bagi akun pemakai mulai permintaan berikutnya, tanpa perlu login ulang.

### Nama akses

Nama profil, wajib, paling banyak 255 karakter, dan unik di perusahaan Anda (huruf besar dan kecil dianggap sama), misalnya Marketing.

### Deskripsi

Penjelasan singkat fungsi profil, opsional, paling banyak 500 karakter. Membantu admin lain memilih profil yang tepat untuk akun.

### Hak akses

Daftar izin yang diberikan profil ini, dikelompokkan per grup. Panel kiri berisi grup (dengan kotak cari dan jumlah terpilih), panel kanan berisi izin grup yang dibuka beserta nama, kunci, dan deskripsinya.

Penghitung "X dari Y dipilih" menunjukkan total izin yang dicentang. Pasangkan izin view dengan create, update, atau delete modul yang sama agar menunya tampil. Mencentang attachment.create atau attachment.delete otomatis menyertakan attachment.view dan menguncinya.

Profil boleh disimpan tanpa izin, tetapi akun dengan profil kosong tidak bisa menjalankan fitur apa pun.

### Pilih semua

Ada dua kotak Pilih Semua: di atas untuk seluruh izin, di panel kanan untuk izin grup yang sedang dibuka. Keduanya bisa memberi kewenangan lebih luas dari kebutuhan, jadi tinjau hasilnya sebelum menyimpan.

## Mengubah Status dan Menghapus

Tindakan ini ada di menu tiga titik pada baris profil.

### Edit

Membuka formulir untuk mengubah nama, deskripsi, atau izin profil. Periksa dampaknya pada akun pemakai sebelum menyimpan, terutama bila izin dikurangi.

### Nonaktifkan dan aktifkan

Nonaktifkan menghentikan profil; semua akun pemakainya (kecuali Akses Sistem Penuh) langsung ditolak dengan pesan "Your access profile is not active" sampai profil diaktifkan lagi atau akun dipindahkan. Anda tidak bisa menonaktifkan profil yang sedang Anda pakai.

### Hapus

Menghapus profil dari daftar. Hanya untuk profil Nonaktif yang tidak lagi dipakai akun mana pun; pindahkan dulu akun terkait ke profil lain lewat Akun Admin.

## Aturan Penting

- Berikan izin sesuai tugas pengguna saja.
- Profil harus dinonaktifkan dan tidak dipakai akun sebelum dapat dihapus.
- Perubahan profil akses tercatat di Log Aktivitas.
