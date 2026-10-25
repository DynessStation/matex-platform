# Halaman Jabatan

> **Untuk apa:** mengelola daftar jabatan/posisi yang dipilih pada akun admin.
> **Izin yang dibutuhkan:** chair.view, .create, .update, .delete.
> **Perlu diperhatikan:** jabatan hanya label organisasi, bukan hak akses; jabatan yang masih dipakai akun tidak dapat dihapus.

## Gambaran Umum

Halaman **Jabatan** digunakan untuk mengelola daftar jabatan atau posisi yang dapat dipilih pada akun administrator. Data jabatan berfungsi sebagai data referensi, sehingga setiap akun admin dapat dikaitkan dengan jabatannya di dalam organisasi MATEX.

Jabatan hanya menjelaskan kedudukan seseorang dalam organisasi. Jabatan tidak menentukan menu atau tindakan yang boleh dilakukan pengguna; kewenangan tersebut diatur melalui Profil Akses dan Hak Akses.

Halaman ini dapat diakses melalui menu **Administrasi › Jabatan** atau alamat berikut:

URL: https://internal.matexindo.com/chair

## Menampilkan dan Mencari Data Jabatan

Daftar jabatan ditampilkan dalam bentuk tabel. Pengguna dapat memanfaatkan fitur berikut untuk menemukan data yang dibutuhkan.

### Kolom Pencarian

Ketik kata kunci pada kolom **Cari** untuk mencari jabatan berdasarkan nama atau deskripsi.

### Jumlah Data per Halaman

Pilihan **Tampilkan** digunakan untuk mengatur jumlah baris per halaman, yaitu 15, 25, 50, atau 100 item.

### Pengurutan Kolom

Klik judul kolom yang dapat diurutkan, yaitu **Jabatan / Posisi**, **Admin**, dan **Dibuat**, untuk mengurutkan data secara menaik atau menurun.

## Memahami Tabel Daftar Jabatan

Tabel daftar jabatan menampilkan informasi berikut:

- **Jabatan / Posisi:** nama jabatan.
- **Deskripsi:** keterangan mengenai tanggung jawab atau fungsi jabatan.
- **Admin:** jumlah akun admin yang saat ini menggunakan jabatan tersebut.
- **Status: Aktif** atau **Nonaktif**.
- **Dibuat:** tanggal data jabatan dibuat.
- **Aksi:** menu tindakan yang dapat dilakukan pada baris tersebut.

Kolom **Admin** membantu pengguna mengetahui seberapa luas dampak suatu perubahan sebelum jabatan dinonaktifkan atau dihapus.

## Menambahkan Jabatan Baru

Langkah-langkahnya adalah sebagai berikut:

1. Klik tombol **+ Tambah Jabatan / Posisi** pada bagian atas halaman.
2. Sistem menampilkan formulir **Buat Jabatan / Posisi**.
3. Isi **Nama Jabatan / Posisi** (wajib, maksimal 255 karakter), misalnya IT Support.
4. Isi **Deskripsi** (opsional) dengan penjelasan singkat mengenai tanggung jawab atau fungsi jabatan.
5. Klik tombol **Buat Jabatan / Posisi** untuk menyimpan data.

Jabatan yang baru dibuat otomatis berstatus **Aktif**. Nama jabatan tidak boleh sama dengan jabatan lain yang masih terdaftar, tanpa membedakan huruf besar dan huruf kecil. Apabila nama sudah digunakan, sistem menampilkan pesan bahwa nama jabatan / posisi sudah digunakan.

**Contoh simulasi (bukan data aktual MATEX)**

Nama Jabatan / Posisi: Marketing Executive

Deskripsi: Bertanggung jawab atas pengelolaan konten pemasaran dan informasi produk pada website.

## Mengelola Jabatan yang Sudah Ada

Tindakan pada jabatan yang sudah tersedia dilakukan melalui kolom **Aksi** pada baris yang bersangkutan. Menu yang tampil mengikuti hak akses pengguna dan status jabatan.

### Edit

Membuka formulir **Edit Jabatan / Posisi** untuk mengubah nama atau deskripsi. Simpan dengan tombol **Perbarui Jabatan / Posisi**.

### Nonaktifkan dan Aktifkan

**Nonaktifkan** digunakan untuk menghentikan penggunaan jabatan tanpa menghapus datanya, sedangkan **Aktifkan** mengembalikan jabatan yang sebelumnya nonaktif. Sistem meminta konfirmasi sebelum tindakan dijalankan.

### Hapus

Menghapus jabatan dari daftar. Pilihan ini hanya tersedia untuk jabatan yang berstatus **Nonaktif**. Setelah dihapus, jabatan tidak lagi tampil pada daftar.

## Ketentuan Penghapusan dan Penonaktifan Jabatan

- Jabatan harus dinonaktifkan terlebih dahulu sebelum dapat dihapus.
- Jabatan yang masih digunakan oleh satu atau beberapa akun admin tidak dapat dihapus. Pindahkan terlebih dahulu akun terkait ke jabatan lain melalui halaman **Akun Admin**.
- Menonaktifkan jabatan yang masih digunakan akun admin tetap diperbolehkan oleh sistem. Pengguna perlu memastikan bahwa penonaktifan tersebut memang dimaksudkan.
- Setiap penambahan, perubahan, perubahan status, dan penghapusan jabatan tercatat pada halaman **Log Aktivitas**.

## Praktik Pengelolaan Jabatan yang Disarankan

- Gunakan nama jabatan yang konsisten dan mudah dipahami, serta hindari penulisan ganda untuk jabatan yang sama.
- Tuliskan deskripsi singkat agar fungsi jabatan jelas bagi pengguna lain.
- Periksa kolom **Admin** sebelum menonaktifkan atau menghapus jabatan.
- Jangan menyamakan jabatan dengan hak akses; atur kewenangan melalui Profil Akses.

Catatan**:** keberadaan menu dan tombol pada halaman ini mengikuti hak akses akun. Pengguna yang tidak memiliki izin membuat, mengubah, atau menghapus jabatan tidak akan melihat tombol terkait.
