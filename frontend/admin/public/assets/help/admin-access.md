# Halaman Profil Akses

> **Untuk apa:** membuat paket izin (peran) yang kemudian dipasang pada akun admin.
> **Izin yang dibutuhkan:** admin_access.view, .create, .update, .delete.
> **Perlu diperhatikan:** menonaktifkan profil langsung mencabut akses semua akun yang memakainya; tinjau izin sebelum memilih Pilih Semua.

## Gambaran Umum

Halaman **Profil Akses** digunakan untuk mengelola kelompok peran beserta hak akses yang diberikan kepada pengguna pada platform internal MATEX.

Profil akses berfungsi sebagai kumpulan izin yang menentukan tindakan dan modul apa saja yang dapat diakses oleh akun admin. Dengan adanya profil akses, pemberian kewenangan dapat disesuaikan dengan tanggung jawab masing-masing pengguna tanpa harus mengatur seluruh izin secara terpisah pada setiap akun.

Contoh profil akses antara lain **Super Admin** dan **Marketing**, dengan susunan hak akses yang disesuaikan berdasarkan kebutuhan operasional.

Profil akses berkaitan langsung dengan halaman Akun Admin. Profil yang berstatus aktif akan tersedia sebagai pilihan ketika admin yang berwenang membuat atau mengedit akun admin.

## Menampilkan dan Mencari Data Profil Akses

Halaman ini menyediakan tabel daftar profil akses yang telah dibuat beserta fitur untuk mempermudah pencarian data.

- **Tampilkan:** digunakan untuk mengatur jumlah baris data yang ditampilkan pada setiap halaman tabel, dengan pilihan mulai dari 15 hingga 100 item.
- **Pencarian:** digunakan untuk menemukan profil akses berdasarkan nama atau deskripsi.

Fitur ini membantu pengguna menemukan profil tertentu dengan lebih cepat, terutama ketika jumlah profil akses bertambah.

## Memahami Tabel Daftar Profil Akses

Tabel utama menampilkan informasi mengenai setiap profil akses yang tersedia di dalam sistem, meliputi:

- **Nama Akses dan Deskripsi:** nama profil beserta penjelasan singkatnya (dua kolom terpisah).
- **Hak Akses:** jumlah izin yang aktif pada profil tersebut. Izin yang sudah dinonaktifkan tidak dihitung, sehingga angka ini dapat lebih kecil dari jumlah izin yang pernah dicentang.
- **Admin:** jumlah akun admin (aktif maupun nonaktif) yang menggunakan profil akses terkait.
- **Status:** menunjukkan apakah profil akses berstatus aktif atau tidak aktif.
- **Dibuat:** menunjukkan waktu pembuatan profil akses di dalam sistem.

Informasi tersebut membantu pengelola memahami cakupan kewenangan setiap profil, mengetahui profil yang sedang digunakan, serta mengevaluasi apakah konfigurasi akses masih sesuai dengan kebutuhan operasional.

Jumlah hak akses menunjukkan banyaknya izin yang terhubung dengan profil, bukan tingkat keamanan atau luas kewenangan secara otomatis. Untuk mengetahui tindakan yang benar-benar diizinkan, pengelola perlu memeriksa daftar izin yang terhubung pada profil tersebut.

## Menambahkan Profil Akses Baru

Pembuatan profil akses dilakukan oleh pengguna yang memiliki kewenangan untuk mengelola profil.

Langkah-langkahnya adalah sebagai berikut:

1. Klik tombol **+ Tambah Profil Akses** di bagian kanan atas halaman.
2. Sistem akan menampilkan formulir pembuatan profil akses.
3. Isi **Nama Akses** dengan nama yang mudah dikenali dan sesuai tujuan penggunaannya.
4. Isi **Deskripsi** dengan keterangan singkat mengenai fungsi atau tanggung jawab yang diwakili oleh profil tersebut.
5. Pada bagian **Hak Akses**, pilih grup atau modul yang relevan, kemudian tentukan izin yang akan diberikan.
6. Periksa kembali seluruh izin yang dipilih, lalu klik tombol **Buat Profil Akses** untuk menyimpan data.

Bagian Hak Akses pada formulir terdiri atas penghitung "X dari Y dipilih", kotak Pilih Semua untuk seluruh daftar, panel kiri "Grup Hak Akses" (dengan kolom Cari grup dan penanda jumlah terpilih), serta panel kanan yang memuat izin pada grup terpilih lengkap dengan nama, kunci, dan deskripsinya. Nama grup berasal dari data sistem, misalnya Web Navigation, Website Content, dan Catalog.

Terdapat dua opsi Pilih Semua: satu untuk seluruh daftar dan satu khusus untuk grup yang sedang dibuka. Gunakan dengan hati-hati karena dapat memberikan kewenangan yang lebih luas daripada yang dibutuhkan.

Sebelum menyimpan profil, pastikan setiap izin yang dipilih relevan dengan fungsi profil tersebut. Sebagai contoh, profil untuk kebutuhan pemasaran sebaiknya hanya memperoleh izin yang diperlukan untuk menjalankan tugas pemasaran dan pengelolaan konten yang menjadi tanggung jawabnya.

- **Nama Akses:** wajib, maksimal 255 karakter, dan tidak boleh sama dengan profil lain pada perusahaan (huruf besar/kecil dianggap sama). **Deskripsi:** opsional, maksimal 500 karakter.
- **Ketergantungan izin:** mencentang attachment.create atau attachment.delete otomatis menyertakan attachment.view, dan kotak attachment.view terkunci selama izin turunannya aktif. Modul lain tidak memiliki aturan serupa; pasangkan view bersama create/update/delete agar menu muncul.
- Profil boleh disimpan tanpa izin sama sekali, tetapi akun dengan profil kosong tidak dapat menjalankan fitur apa pun.

## Mengelola Profil Akses yang Sudah Ada

Pada kolom **Aksi** di sisi kanan tabel, klik ikon titik tiga (⋮) untuk membuka pilihan tindakan yang tersedia.

- **Edit:** membuka formulir Edit Profil Akses; simpan dengan tombol Perbarui Profil Akses. Perubahan izin berlaku pada akun yang memakainya mulai permintaan berikutnya.
- **Aktifkan / Nonaktifkan:** mengembalikan atau menghentikan penggunaan profil, dengan konfirmasi.
- **Hapus:** hanya tersedia untuk profil nonaktif yang tidak lagi dipakai akun mana pun.

## Ketentuan Penghapusan dan Penonaktifan Profil Akses

Profil akses tidak dapat langsung dihapus. Profil harus dinonaktifkan terlebih dahulu, dan penghapusan hanya dapat dilakukan apabila tidak ada akun admin yang masih menggunakan profil tersebut.

Sistem telah menerapkan **validasi dua lapis** untuk membatasi penghapusan profil akses yang belum memenuhi ketentuan.

Secara umum, ketentuan tersebut mencakup:

1. Status profil: profil harus dinonaktifkan sebelum dapat dihapus.
2. Penggunaan profil: profil tidak boleh sedang digunakan oleh akun admin mana pun ketika proses penghapusan dilakukan.

Jika masih terdapat akun admin yang menggunakan profil tersebut, penghapusan tidak dapat dilanjutkan. Pengelola perlu meninjau akun terkait dan, apabila sesuai dengan kebutuhan operasional, memindahkannya ke profil aktif lain yang memiliki kewenangan yang tepat sebelum melanjutkan proses.

Penonaktifan profil berdampak besar: semua akun yang memakai profil tersebut (kecuali akun Akses Sistem Penuh) langsung tidak dapat menjalankan fitur apa pun, karena setiap permintaan ditolak dengan pesan "Your access profile is not active", sampai profil diaktifkan kembali atau akun dipindahkan ke profil aktif lain. Anda juga tidak diperbolehkan menonaktifkan profil yang sedang Anda pakai sendiri.

## Hubungan Profil Akses dengan Akun Admin

Profil akses dan akun admin memiliki hubungan langsung dalam pengaturan kewenangan sistem.

- **Profil Akses** berfungsi sebagai kumpulan hak akses yang telah ditentukan.
- **Akun Admin** menggunakan profil akses untuk memperoleh kewenangan sesuai konfigurasi yang berlaku.
- **Profil Aktif** tersedia sebagai pilihan profil ketika admin berwenang membuat atau mengedit akun admin melalui halaman Akun Admin.

Dengan mekanisme ini, pengelola dapat menyesuaikan kewenangan pengguna melalui pengaturan profil akses tanpa harus menyusun ulang seluruh izin untuk setiap akun secara individual.

Apabila suatu profil diubah, dampaknya terhadap akun yang menggunakannya perlu diperiksa sebelum perubahan diterapkan, terutama jika perubahan tersebut mengurangi atau menambah kewenangan yang berkaitan dengan pekerjaan pengguna.

## Pengaturan Grup dan Daftar Hak Akses

Daftar grup hak akses serta izin yang tersedia untuk dipilih pada profil dikelola melalui halaman **Hak Akses**.

Halaman tersebut digunakan untuk mengatur struktur grup izin dan daftar hak akses yang nantinya menjadi pilihan pada formulir Profil Akses.

Panduan penggunaan halaman Hak Akses akan dibahas pada bagian tersendiri dalam manual ini.

Tautan halaman Hak Akses: https://internal.matexindo.com/admin-permission

## Praktik Pengelolaan Profil Akses yang Disarankan

Untuk menjaga keamanan dan keteraturan pengelolaan kewenangan, perhatikan hal-hal berikut:

- Gunakan nama dan deskripsi profil yang jelas agar fungsi setiap profil mudah dipahami.
- Berikan izin sesuai kebutuhan tugas dan tanggung jawab pengguna.
- Hindari menggunakan opsi **Pilih Semua** tanpa meninjau izin yang akan diberikan.
- Periksa akun admin yang menggunakan profil sebelum mengubah atau menonaktifkannya.
- Pastikan profil yang akan dihapus sudah tidak digunakan oleh akun admin mana pun.
- Tinjau kembali dampak perubahan profil terhadap akses pengguna sebelum menyimpan perubahan.

Pengelolaan profil akses yang baik membantu MATEX menerapkan pembagian kewenangan secara lebih terstruktur, mengurangi pemberian izin yang tidak diperlukan, serta menjaga keberlangsungan operasional platform internal.
