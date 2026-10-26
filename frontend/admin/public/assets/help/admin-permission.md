# Halaman Hak Akses

> **Untuk apa:** melihat dan mengatur daftar izin tunggal (misalnya product.create) yang menjadi bahan penyusun Profil Akses.
> **Izin yang dibutuhkan:** admin_permission.view untuk melihat; admin_permission.create, admin_permission.update, admin_permission.delete untuk mengubah.
> **Perlu diperhatikan:** kunci izin tidak bisa diubah setelah dibuat; izin baru dari halaman ini tidak melindungi fitur apa pun sampai kode memakainya.

## Gambaran Umum

Hak akses adalah izin untuk satu tindakan pada satu modul, ditulis dengan pola modul.aksi, misalnya product.create (membuat produk). Hak akses digabung menjadi **Profil Akses**, lalu profil dipasang pada **Akun Admin**.

Daftar ini berlaku untuk semua perusahaan dan sebaiknya dikelola pengelola sistem saja. Pemeriksaan izin dipasang di kode server setiap fitur, jadi membuat izin baru di sini tidak menambah menu atau fitur.

Cara memakai tabel dijelaskan di Panduan umum bagian Tabel Daftar.

URL: https://internal.matexindo.com/admin-permission

## Daftar Hak Akses

Kotak **Cari** mencari di kunci, nama, grup, dan deskripsi. Deskripsi izin tidak tampil di tabel; buka Edit untuk membacanya.

### Kunci hak akses

Kode unik izin dengan pola modul.aksi, misalnya admin_access.create. Kode inilah yang diperiksa server.

### Grup

Kelompok modul izin, misalnya Catalog atau Website Content. Grup menentukan pengelompokan izin di formulir Profil Akses.

### Profil akses

Jumlah profil akses (aktif maupun nonaktif) yang memakai izin ini. Periksa angka ini sebelum menonaktifkan atau menghapus izin.

### Status

Izin Nonaktif dianggap tidak dimiliki semua profil: fitur yang dilindunginya langsung ditolak bagi semua akun selain Akses Sistem Penuh.

## Formulir Hak Akses

Formulir dibuka dari tombol **+ Tambah Hak Akses** atau menu aksi **Edit**.

### Kunci hak akses

Kode izin dengan pola modul.aksi: hanya huruf kecil, angka, dan garis bawah, minimal dua bagian dipisah titik, paling banyak 100 karakter (contoh: product.view, web_navigation.publish).

Kunci harus unik dan tidak bisa diubah setelah disimpan; bila salah, buat izin baru lalu nonaktifkan yang lama.

### Nama hak akses

Nama yang mudah dipahami untuk izin ini, wajib, misalnya "Buat produk". Nama inilah yang tampil di formulir Profil Akses.

### Grup

Nama kelompok modul, opsional, teks bebas paling banyak 100 karakter. Tulis persis sama dengan grup yang sudah ada (misalnya Catalog) agar tidak terbentuk grup ganda; bila kosong, izin masuk grup "Other".

### Deskripsi

Penjelasan singkat apa yang diizinkan, opsional. Tampil di bawah nama izin pada formulir Profil Akses sehingga membantu admin memilih izin yang tepat.

## Mengubah Status dan Menghapus

Tindakan ini ada di menu tiga titik pada baris izin.

### Edit

Mengubah nama, grup, atau deskripsi. Kolom kunci terkunci.

### Nonaktifkan dan aktifkan

Nonaktifkan langsung mencabut izin dari semua profil yang memakainya (kecuali akun Akses Sistem Penuh); Aktifkan mengembalikannya. Sistem meminta konfirmasi.

### Hapus

Menghapus izin dari daftar; tidak bisa dibatalkan dari panel. Hanya untuk izin Nonaktif yang sudah tidak terpasang di profil mana pun ("Hak akses admin masih digunakan oleh satu atau beberapa profil akses").

## Aturan Penting

- Periksa dulu apakah izin dengan fungsi yang sama sudah ada sebelum membuat izin baru.
- Izin baru baru berguna setelah developer memakainya di kode server.
- Perubahan hak akses tercatat di Log Aktivitas.

## Cara Membaca Kode

Setiap hak akses memakai pola modul.aksi. Aksi yang umum: view (melihat), create (membuat), update (mengubah, termasuk mengaktifkan/menonaktifkan), delete (menghapus atau mengarsipkan), dan publish (menayangkan). Daftar berikut disusun dari pemeriksaan izin pada kode aplikasi versi 1.0.10.

## Tabel Kode Hak Akses

| Kode | Modul | Fungsi |
| --- | --- | --- |
| dashboard.view | Dasbor | Melihat Dasbor, Analitik Publik, dan SEO & Mesin Pencari |
| admin_account.view | Akun Admin | Melihat daftar dan detail akun admin |
| admin_account.create | Akun Admin | Membuat akun admin |
| admin_account.update | Akun Admin | Mengedit, mengaktifkan, dan menonaktifkan akun |
| admin_account.delete | Akun Admin | Menghapus akun admin (yang nonaktif) |
| admin_access.view | Profil Akses | Melihat profil akses dan pilihan izin |
| admin_access.create | Profil Akses | Membuat profil akses |
| admin_access.update | Profil Akses | Mengedit, mengaktifkan, dan menonaktifkan profil |
| admin_access.delete | Profil Akses | Menghapus profil akses |
| admin_permission.view | Hak Akses | Melihat daftar hak akses |
| admin_permission.create | Hak Akses | Membuat hak akses baru |
| admin_permission.update | Hak Akses | Mengedit, mengaktifkan, dan menonaktifkan hak akses |
| admin_permission.delete | Hak Akses | Menghapus hak akses |
| audit_log.view | Log Aktivitas | Melihat log aktivitas |
| chair.view | Jabatan | Melihat jabatan |
| chair.create | Jabatan | Membuat jabatan |
| chair.update | Jabatan | Mengedit atau mengubah status jabatan |
| chair.delete | Jabatan | Menghapus jabatan |
| office.view | Kantor | Melihat kantor |
| office.create | Kantor | Membuat kantor |
| office.update | Kantor | Mengedit atau mengubah status kantor |
| office.delete | Kantor | Menghapus kantor |
| attachment.view | Media | Melihat berkas media (prasyarat untuk create dan delete) |
| attachment.create | Media | Mengunggah media (membutuhkan attachment.view) |
| attachment.delete | Media | Menghapus media (membutuhkan attachment.view) |
| web_navigation.view | Navigasi | Melihat navigasi dan item menu |
| web_navigation.create | Navigasi | Membuat item navigasi |
| web_navigation.update | Navigasi | Mengubah navigasi, terjemahan, dan urutan |
| web_navigation.delete | Navigasi | Menghapus item navigasi |
| web_navigation.publish | Navigasi | Mengaktifkan atau menonaktifkan navigasi |
| website_page.view | Halaman Website | Melihat konten halaman tetap, SEO, media, dan setelan publikasi |
| website_page.update | Halaman Website | Mengubah konten halaman tetap, SEO, media, dan publikasi |
| faq.view | FAQ | Melihat FAQ |
| faq.create | FAQ | Membuat FAQ dua bahasa |
| faq.update | FAQ | Mengubah FAQ |
| faq.delete | FAQ | Menghapus FAQ |
| public_contact.view | Pengaturan Kontak | Melihat kanal kontak dan topik pesan |
| public_contact.update | Pengaturan Kontak | Mengubah kanal kontak dan topik pesan |
| article.view | Artikel | Melihat artikel |
| article.create | Artikel | Membuat artikel |
| article.update | Artikel | Mengubah artikel |
| article.delete | Artikel | Mengarsipkan artikel |
| product_category.view | Kategori Produk | Melihat kategori produk |
| product_category.create | Kategori Produk | Membuat kategori |
| product_category.update | Kategori Produk | Mengubah kategori |
| product_category.delete | Kategori Produk | Mengarsipkan kategori |
| product.view | Produk | Melihat katalog produk |
| product.create | Produk | Membuat produk |
| product.update | Produk | Mengubah produk |
| product.delete | Produk | Mengarsipkan produk |

Catatan**:** hak akses lama cms_page.* sudah dihapus dan digantikan website_page.*. Hak akses yang hanya muncul di antarmuka sebagai sisa template (misalnya order.* atau coupon.*) tidak dipakai oleh server dan tidak perlu dipasang pada profil.

Catatan**:** hanya attachment.create dan attachment.delete yang mensyaratkan attachment.view. Pada modul lain, memasang create tanpa view diterima sistem tetapi menu biasanya tidak muncul tanpa view, sehingga pasangkan keduanya.

**Kondisi data per 18 Oktober 2026:** tabel di atas adalah daftar yang dipakai kode aplikasi. Halaman Hak Akses saat ini berisi 52 izin: admin_account.create, .update, dan .delete belum terdaftar, sedangkan category_product.* (4 izin) dan contoh.view masih terdaftar walaupun tidak tercantum di tabel. Perapian data ini masuk PR versi 1.1.
