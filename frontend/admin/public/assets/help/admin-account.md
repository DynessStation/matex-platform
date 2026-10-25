# Halaman Akun Admin

> **Untuk apa:** membuat dan mengelola akun pengguna yang dapat masuk ke platform internal.
> **Izin yang dibutuhkan:** admin_account.view, .create, .update, .delete.
> **Perlu diperhatikan:** berikan Akses Sistem Penuh hanya jika benar-benar perlu; akun harus dinonaktifkan sebelum dihapus; kata sandi tidak bisa diubah dari halaman ini.

## Gambaran Umum

Halaman **Akun Admin** digunakan untuk mengelola daftar pengguna yang memiliki akun pada platform internal MATEX. Melalui halaman ini, pengguna yang memiliki kewenangan dapat melihat informasi akun, menambahkan akun admin baru, memperbarui data akun, serta menonaktifkan akun yang tidak lagi memerlukan akses ke sistem.

Pengelolaan akun perlu dilakukan secara hati-hati karena setiap akun dapat memiliki profil akses dan kewenangan yang berbeda. Pemberian akses harus disesuaikan dengan tanggung jawab masing-masing pengguna agar keamanan sistem dan data perusahaan tetap terjaga.

## Menampilkan dan Mencari Data Admin

Pada halaman ini, tersedia tabel daftar akun admin beserta fitur untuk mempermudah pencarian dan pengelolaan data.

- **Tampilkan:** digunakan untuk mengatur jumlah data yang ditampilkan pada setiap halaman tabel. Pilihan yang tersedia mulai dari 15 hingga 100 item per halaman.
- **Pencarian:** digunakan untuk menemukan akun berdasarkan nama, alias, email (utama maupun kedua), telepon (utama maupun kedua), atau UUID akun.

Pengguna dapat memanfaatkan fitur pencarian ketika jumlah akun semakin banyak, sehingga akun yang ingin diperiksa atau dikelola dapat ditemukan dengan lebih cepat.

## Memahami Tabel Daftar Admin

Tabel daftar admin menyajikan informasi utama setiap akun yang telah terdaftar, meliputi:

- **Foto, Nama, dan Alias:** foto profil, nama lengkap, dan alias akun (tiga kolom terpisah).
- **Email dan Telepon:** hanya email utama dan telepon utama yang tampil pada tabel; data kedua hanya terlihat pada formulir.
- **Kantor serta Jabatan / Posisi:** kantor penempatan dan jabatan pengguna. Tabel tidak memiliki kolom Perusahaan.
- **Profil Akses:** nama profil akses yang dipakai akun, misalnya Super Admin atau Marketing apabila tersedia.
- **Status:** Aktif atau Nonaktif (akun yang sudah dihapus tidak tampil).
- **Dibuat:** tanggal pembuatan akun di dalam sistem.

Informasi tersebut membantu pengelola mengidentifikasi pemilik akun, memahami penempatan kerjanya, serta memeriksa status dan tingkat akses yang dimiliki.

- Tabel hanya menampilkan akun pada perusahaan dan kantor yang sama dengan Anda; admin kantor lain tidak akan terlihat. Ini bukan kesalahan.
- Kolom yang dapat diurutkan hanya Nama, Alias, dan Dibuat.

## Menambahkan Akun Admin Baru

Pada versi platform saat ini, pembuatan akun admin dilakukan **berdasarkan permintaan kepada admin yang memiliki akses penuh**. Fitur ini tidak ditujukan sebagai registrasi mandiri oleh seluruh pengguna.

Untuk mengajukan pembuatan akun, pihak yang membutuhkan akses perlu menyampaikan permintaan kepada admin berwenang. Setelah permintaan disetujui dan akun dibuat, data pengguna dapat dikelola melalui halaman Akun Admin.

Proses pembuatan akun melalui formulir dilakukan dengan langkah-langkah berikut oleh admin yang berwenang:

1. Klik tombol **+ Tambah Akun Admin** di bagian kanan atas halaman.
2. Sistem akan menampilkan formulir **Buat Akun Admin**.
3. Isi data akun sesuai kebutuhan dan informasi yang benar.

Data yang perlu diisi meliputi:

  1. Foto Profil

Unggah atau pilih foto profil berformat JPEG, PNG, atau WebP (maksimal 8 MB). Gambar otomatis dipotong dan dikonversi menjadi WebP berukuran 512 × 512 piksel.

  2. Informasi Personal

Masukkan nama lengkap dan alias pengguna sesuai identitas yang digunakan dalam lingkungan kerja.

  3. Informasi Kontak

Lengkapi alamat email utama sebagai data wajib, serta email kedua apabila diperlukan. Masukkan pula nomor telepon utama dan nomor telepon kedua jika tersedia.

  4. Penempatan dan Jabatan

Pilih perusahaan atau instansi, kantor, jabatan atau posisi, serta profil akses yang sesuai dengan tanggung jawab pengguna.

  5. Pengaturan Keamanan

Atur opsi **Akses Sistem Penuh** hanya apabila benar-benar diperlukan dan telah disetujui oleh pihak yang berwenang.

Masukkan kata sandi dan konfirmasi kata sandi. Ketentuannya: 8–64 karakter, tanpa spasi, dan memuat minimal satu angka atau simbol (kata sandi yang hanya berisi huruf ditolak). Indikator Lemah/Sedang/Kuat membantu menilai kata sandi. Kata sandi hanya diisi saat akun dibuat, disimpan dalam bentuk ter-hash, dan tidak pernah ditampilkan kembali.

4. Periksa kembali seluruh data yang telah diisi.
5. Klik tombol **Buat Akun Admin** untuk menyimpan data.

Setelah proses berhasil, pastikan akun muncul pada daftar admin dan informasi yang tersimpan sudah sesuai.

- **Nama:** wajib, maksimal 50 karakter; hanya huruf, spasi, titik, koma, apostrof, dan tanda hubung.
- **Alias:** wajib, maksimal 15 karakter, hanya huruf dan angka; tidak boleh sama dengan alias lain.
- **Email utama:** wajib dan berformat benar; **email kedua** baru dapat diisi setelah email utama valid. Email tidak boleh sama dengan akun lain.
- **Telepon utama:** wajib. Pilih kode negara (bawaan 62), lalu ketik nomor tanpa angka 0 di depan; **telepon kedua** opsional. Nomor tidak boleh sama dengan akun lain.
- **Perusahaan, Kantor, Jabatan / Posisi, dan Profil Akses:** semuanya wajib. Pilih Perusahaan lebih dulu; pilihan lainnya baru tersedia dan hanya menampilkan data milik perusahaan itu yang berstatus aktif.
- Akun baru langsung berstatus **Aktif**. Anda hanya dapat membuat akun pada perusahaan Anda sendiri, dan hanya akun Akses Sistem Penuh yang dapat memberikan Akses Sistem Penuh.

## Mengelola Akun yang Sudah Ada

Pada kolom **Aksi** di sisi kanan tabel, klik ikon titik tiga (⋮) untuk menampilkan tindakan yang tersedia bagi akun terkait.

### Edit

Digunakan untuk memperbarui data akun yang sudah terdaftar, sesuai kewenangan pengguna yang sedang masuk. Periksa kembali perubahan sebelum menyimpan agar informasi identitas, kontak, penempatan kerja, dan profil akses tetap sesuai.

### Nonaktifkan

Digunakan untuk menonaktifkan akun yang tidak lagi memerlukan akses ke sistem. Sistem meminta konfirmasi terlebih dahulu. Anda tidak dapat menonaktifkan akun Anda sendiri. Sebelum melakukan tindakan ini, pastikan akun memang tidak diperlukan untuk kegiatan operasional.

Penonaktifan akun perlu dibedakan dari penghapusan. Akun nonaktif tidak dapat dipakai masuk, tetapi datanya tetap tersimpan dan dapat diaktifkan kembali. Penghapusan menyembunyikan akun dari daftar dan tidak dapat dibatalkan dari panel admin; Anda juga tidak dapat menghapus akun Anda sendiri.

### Aktifkan

Menu Aktifkan tampil pada akun yang nonaktif untuk mengembalikan akses akun setelah konfirmasi.

### Hapus

Menu Hapus hanya tampil pada akun yang sudah nonaktif dan memerlukan konfirmasi.

## Ketentuan Penting dalam Pengelolaan Akun

### Minimal satu akun Akses Sistem Penuh yang aktif harus tetap tersedia

Sistem menjaga agar di setiap perusahaan selalu ada minimal satu akun aktif bertanda Akses Sistem Penuh. Aturan ini ditegakkan saat akun tersebut dinonaktifkan atau penandanya dicabut melalui Edit. Bila dilanggar, muncul pesan "Minimal satu akun akses penuh yang aktif harus tetap tersedia di perusahaan".

Perhatikan bahwa yang dilindungi adalah penanda Akses Sistem Penuh pada akun, bukan nama profil seperti "Super Admin". Akun tanpa penanda itu tidak dilindungi walaupun profilnya bernama Super Admin.

### Akun tidak dapat langsung dihapus

Akun admin tidak dapat dihapus sebelum dinonaktifkan terlebih dahulu. Dengan demikian, proses pengelolaan akun harus mengikuti urutan dan ketentuan yang berlaku pada sistem.

Sebelum menonaktifkan akun, pastikan tidak ada kebutuhan operasional yang masih bergantung pada akun tersebut.

### Pembuatan akun berdasarkan permintaan

Pada versi platform saat ini, pembuatan akun baru dilakukan melalui permintaan kepada admin yang memiliki akses penuh. Kebijakan ini membantu membatasi pendaftaran akun yang tidak berwenang dan memastikan setiap akun memiliki tujuan penggunaan yang jelas.

### Pengembangan registrasi pada masa mendatang

Apabila kebutuhan bisnis dan kesiapan keamanan memungkinkan, platform dapat dikembangkan dengan modul registrasi akun yang dilengkapi mekanisme otorisasi dan aktivasi terpusat.

Rencana tersebut merupakan kemungkinan pengembangan di masa mendatang, bukan fitur yang sudah tersedia pada versi platform saat ini.

- Akun yang bukan Akses Sistem Penuh tidak boleh mengubah, mengubah status, atau menghapus akun Akses Sistem Penuh.
- Akun yang bukan Akses Sistem Penuh hanya dapat mengelola akun pada kantornya sendiri.
- Foto profil harus berasal dari unggahan yang aktif pada lingkup perusahaan dan kantor yang sama.
- Pembuatan, perubahan, perubahan status, dan penghapusan akun tercatat pada Log Aktivitas (modul admin_account).
- Halaman ini tidak menyediakan pengaturan ulang kata sandi untuk akun lain; kebutuhan tersebut diarahkan ke developer.

## Praktik Pengelolaan Akun yang Disarankan

Untuk menjaga keamanan dan keteraturan administrasi, perhatikan hal-hal berikut:

- Berikan akun hanya kepada pengguna yang benar-benar membutuhkan akses.
- Sesuaikan profil akses dengan tanggung jawab masing-masing pengguna.
- Hindari memberikan akses sistem penuh jika akses yang lebih terbatas sudah mencukupi.
- Pastikan selalu ada akun Akses Sistem Penuh yang aktif dan dipegang oleh pihak berwenang.
- Nonaktifkan akun yang sudah tidak diperlukan setelah memastikan tidak mengganggu operasional.
- Periksa kembali perubahan data dan status akun setelah proses pengelolaan selesai.

Pengelolaan akun yang baik membantu menjaga keamanan platform internal MATEX, membatasi akses yang tidak diperlukan, serta memastikan administrasi sistem tetap dapat dijalankan secara berkelanjutan.

**Kendala yang diketahui (diperbaiki pada versi 1.1):** saat ini hanya akun dengan Akses Sistem Penuh yang dapat membuat, mengubah, dan menghapus akun admin, karena izin admin_account.create, admin_account.update, dan admin_account.delete belum tersedia di sistem. Pada formulir, beberapa kode negara tampil ganda atau tanpa tanda + (misalnya 387 dan 267), dan batas ukuran foto 8 MB belum tertulis di layar. Mohon dimaklumi.
