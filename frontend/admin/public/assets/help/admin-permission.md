# Halaman Hak Akses

> **Untuk apa:** melihat dan mengatur daftar izin tunggal (misalnya product.create) yang menjadi bahan penyusun Profil Akses.
> **Izin yang dibutuhkan:** admin_permission.view untuk melihat; admin_permission.create, admin_permission.update, admin_permission.delete untuk mengubah.
> **Perlu diperhatikan:** kunci izin tidak bisa diubah setelah dibuat; izin baru dari halaman ini tidak melindungi fitur apa pun sampai kode memakainya.

## Gambaran Umum

Hak akses adalah izin untuk satu tindakan pada satu modul, ditulis dengan pola modul.aksi, misalnya product.create (membuat produk). Hak akses digabung menjadi **Profil Akses**, lalu profil dipasang pada **Akun Admin**.

Daftar ini berlaku untuk semua perusahaan dan sebaiknya dikelola pengelola sistem saja. Pemeriksaan izin dipasang di kode server setiap fitur, jadi membuat izin baru di sini tidak menambah menu atau fitur.

Cara memakai tabel dijelaskan di Panduan umum bagian Tabel Daftar.

URL: https://internal.matexindo.com/admin-permission

## Grup Hak Akses

Panel kiri berisi grup; angka di sampingnya jumlah hak akses di grup itu. Klik grup untuk melihat hak aksesnya di panel kanan. Grup menentukan pengelompokan izin di formulir Profil Akses.

Isi **Nama Grup Hak Akses** lalu **Tambah dan Simpan** untuk grup baru. Ikon pensil mengganti nama grup, dan nama itu ikut berganti di semua hak aksesnya. Grup yang sudah kosong bisa dihapus lewat ikon tempat sampah. Hak akses tanpa grup tampil di "Other".

## Formulir Hak Akses

Formulir ada di atas daftar hak akses dan berlaku untuk grup yang sedang dibuka. Ikon pensil pada baris hak akses membuka baris itu di formulir yang sama.

### Nama hak akses

Nama yang mudah dipahami, wajib, misalnya "Buat produk". Nama inilah yang tampil di formulir Profil Akses.

### Kunci hak akses

Kode yang diperiksa server. Bagian awalnya mengikuti grup (misalnya product.), sisanya diketik: huruf kecil, angka, dan garis bawah (misalnya create). Di bawah isian ada daftar kunci yang sudah ada.

Kunci harus unik dan tidak bisa diubah setelah disimpan; bila salah, buat hak akses baru lalu nonaktifkan yang lama.

### Deskripsi

Penjelasan singkat apa yang diizinkan, opsional. Tampil di bawah nama izin pada formulir Profil Akses.

### Status

Hak akses baru dimulai Tidak Aktif. Tidak Aktif berarti izin dianggap tidak dimiliki semua profil: fitur yang dilindunginya langsung ditolak bagi semua akun selain Akses Sistem Penuh. Mengaktifkan mengembalikannya.

## Daftar dan Pencarian

Kotak **Cari hak akses** di kanan atas mencari di kunci, nama, dan deskripsi semua grup; grup tanpa hasil disembunyikan dan angka grup menjadi jumlah hasil. Kotak **Cari grup** menyaring daftar grup.

Pencarian, grup yang dibuka, dan hak akses yang diedit tersimpan di alamat halaman (misalnya ?searchgroup=office&searchpermission=creat), jadi tampilannya bisa dibagikan.

**Jumlah Profil** adalah jumlah profil akses yang memakai izin ini. Periksa angka ini sebelum menonaktifkan.

## Menghapus

Hanya hak akses Tidak Aktif dengan Jumlah Profil 0 yang bisa dihapus: baris seperti itu punya kotak centang dan ikon tempat sampah. **Pilih semua** lalu **Hapus yang dipilih** menghapus beberapa sekaligus. Tidak bisa dibatalkan dari panel.

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
