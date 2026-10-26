# Halaman Akun Admin

> **Untuk apa:** membuat dan mengelola akun yang dapat masuk ke panel admin.
> **Izin yang dibutuhkan:** admin_account.view untuk melihat; admin_account.create, admin_account.update, admin_account.delete untuk mengubah.
> **Perlu diperhatikan:** berikan Akses Sistem Penuh hanya bila benar-benar perlu; akun harus dinonaktifkan sebelum dihapus; kata sandi akun lain tidak bisa diatur ulang dari sini.

## Gambaran Umum

Halaman ini mengelola semua akun panel admin: identitas, kontak, penempatan (kantor, jabatan), dan profil akses yang menentukan menu serta tindakan yang boleh dilakukan.

Akun baru dibuat atas permintaan kepada admin berwenang; belum ada pendaftaran mandiri. Setiap admin mengubah foto, nama, kontak cadangan, dan kata sandinya sendiri lewat **Profil Saya**.

Cara memakai tabel (cari, urutkan, muat ulang, menu aksi) dijelaskan di Panduan umum bagian Tabel Daftar.

URL: https://internal.matexindo.com/admin-account

## Daftar Akun Admin

Tabel menampilkan akun pada perusahaan Anda; admin yang bukan Akses Sistem Penuh hanya melihat akun di kantornya sendiri. Kotak **Cari** mencari di nama, alias, email, telepon (utama maupun kedua), dan UUID akun. Kolom Nama, Alias, dan Dibuat dapat diurutkan.

### Email dan telepon

Tabel hanya menampilkan email dan telepon utama, yang dipakai untuk login. Email yang terlalu panjang dipotong dengan "…"; arahkan kursor untuk melihatnya lengkap. Data kedua hanya terlihat di formulir.

### Profil akses

Nama profil akses yang dipakai akun. Profil akses menentukan menu dan tindakan yang boleh dilakukan; nama seperti "Super Admin" tidak memberi kewenangan khusus selain hak yang ada di profil itu.

### Status

Aktif berarti akun bisa dipakai login. Nonaktif berarti akun disimpan tetapi tidak bisa login sampai diaktifkan lagi. Akun yang dihapus tidak tampil.

## Formulir Akun Admin

Formulir dibuka dari tombol **+ Tambah Akun Admin** atau menu aksi **Edit**. Simpan dengan tombol di bawah formulir; akun baru langsung berstatus Aktif.

### Foto profil

Foto akun, opsional. Pilih atau unggah gambar JPEG, PNG, atau WebP paling besar 8 MB; gambar otomatis dipotong persegi dan diubah menjadi WebP 512 × 512 piksel.

Foto harus berasal dari unggahan yang aktif di perusahaan (dan kantor) yang sama.

### Nama

Nama lengkap pemilik akun, wajib, paling banyak 50 karakter. Hanya huruf, spasi, titik, koma, apostrof, dan tanda hubung.

### Alias

Nama pendek akun, wajib, paling banyak 15 karakter, hanya huruf dan angka tanpa spasi. Alias tampil di Log Aktivitas sebagai pelaku dan tidak boleh sama dengan akun lain.

### Email utama

Alamat email untuk login, wajib dan harus unik di semua akun. Hanya bisa diubah di halaman ini, tidak dari Profil Saya.

### Email kedua

Email cadangan, opsional. Baru bisa diisi setelah email utama valid, dan tidak boleh sama dengan email akun lain.

### Telepon utama

Nomor telepon untuk login, wajib dan harus unik. Pilih kode negara (bawaan 62), lalu ketik nomor tanpa angka 0 di depan, misalnya 81234567890.

### Telepon kedua

Nomor cadangan, opsional. Baru bisa diisi setelah telepon utama valid, dengan aturan yang sama.

### Perusahaan

Perusahaan tempat akun bekerja, wajib dan dipilih paling awal. Anda hanya bisa memilih perusahaan Anda sendiri; pilihan Kantor, Jabatan, dan Profil Akses mengikuti perusahaan ini.

### Kantor

Kantor penempatan akun, wajib. Hanya kantor aktif milik perusahaan terpilih yang ditawarkan. Admin yang bukan Akses Sistem Penuh hanya bisa memakai kantornya sendiri.

### Jabatan / posisi

Jabatan pemilik akun, wajib; hanya label organisasi, tidak memengaruhi hak akses. Daftarnya diatur di halaman Jabatan.

### Profil akses

Kumpulan hak akses yang dipakai akun, wajib. Menentukan menu yang tampil dan tindakan yang boleh dilakukan. Daftarnya diatur di halaman Profil Akses.

### Akses sistem penuh

Penanda yang melewati profil akses dan membuka semua fitur admin tanpa batas, termasuk melihat dan mengelola semua kantor.

Hanya akun yang sendirinya Akses Sistem Penuh yang dapat memberikan atau mencabut penanda ini. Setiap perusahaan harus selalu punya minimal satu akun aktif dengan penanda ini.

### Kata sandi

Kata sandi awal akun, hanya diisi saat membuat akun: 8–64 karakter, tanpa spasi, minimal satu angka atau simbol. Indikator Lemah/Sedang/Kuat membantu menilai kekuatannya.

Kata sandi disimpan ter-hash dan tidak pernah ditampilkan lagi. Pemilik akun bisa menggantinya sendiri lewat Profil Saya.

### Konfirmasi kata sandi

Ulangi kata sandi yang sama persis untuk memastikan tidak salah ketik.

## Mengubah Status dan Menghapus

Tindakan ini ada di menu tiga titik pada baris akun dan hanya tampil bila akun Anda memiliki izinnya.

### Edit

Membuka formulir untuk mengubah data akun. Kata sandi tidak ikut diubah dari formulir edit.

### Nonaktifkan dan aktifkan

Nonaktifkan membuat akun tidak bisa login tanpa menghapus datanya; Aktifkan mengembalikannya. Sistem meminta konfirmasi. Anda tidak bisa menonaktifkan akun Anda sendiri.

### Hapus

Menghapus akun dari daftar; tidak dapat dibatalkan dari panel. Hanya tersedia untuk akun Nonaktif, dan Anda tidak bisa menghapus akun Anda sendiri.

## Aturan Penting

- Setiap perusahaan harus selalu punya minimal satu akun aktif dengan penanda Akses Sistem Penuh. Bila dilanggar saat menonaktifkan atau mencabut penanda, muncul pesan "Minimal satu akun akses penuh yang aktif harus tetap tersedia di perusahaan". Yang dilindungi adalah penandanya, bukan nama profil seperti "Super Admin".
- Akun yang bukan Akses Sistem Penuh tidak boleh mengubah, mengubah status, atau menghapus akun Akses Sistem Penuh, dan hanya dapat mengelola akun di kantornya sendiri.
- Alias, email, dan telepon harus unik di semua akun, termasuk akun yang sudah dihapus.
- Lupa kata sandi akun lain tidak bisa diatur ulang dari halaman ini; hubungi developer.
- Pembuatan, perubahan, perubahan status, dan penghapusan akun tercatat di Log Aktivitas (modul admin_account).
