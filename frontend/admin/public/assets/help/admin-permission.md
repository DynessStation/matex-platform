# Halaman Hak Akses

> **Untuk apa:** melihat dan mengatur daftar izin tunggal (misalnya product.create) yang menjadi bahan penyusun Profil Akses.
> **Izin yang dibutuhkan:** admin_permission.view, .create, .update, .delete.
> **Perlu diperhatikan:** kunci izin tidak bisa diubah setelah dibuat; membuat izin baru di sini tidak otomatis melindungi fitur apa pun; halaman ini cukup dikelola oleh pengelola sistem.

## Gambaran Umum

Halaman **Hak Akses** digunakan untuk mengelola daftar izin spesifik (permissions) yang tersedia pada platform internal MATEX.

Setiap hak akses mewakili izin untuk melakukan tindakan tertentu pada modul atau fitur sistem. Hak akses tersebut kemudian dapat dihubungkan dengan profil akses melalui halaman Profil Akses, sehingga kewenangan setiap akun admin dapat disesuaikan dengan tanggung jawabnya.

Contoh kunci hak akses antara lain admin_access.create dan product.create. Kunci tersebut merepresentasikan izin untuk melakukan tindakan tertentu pada modul terkait.

Dengan pengelolaan hak akses yang terstruktur, administrator dapat menentukan izin yang tersedia untuk setiap profil dan menjaga agar pembagian kewenangan di dalam sistem tetap sesuai kebutuhan operasional.

## Menampilkan dan Mencari Data Hak Akses

Halaman ini menyediakan tabel daftar hak akses yang telah terdaftar, dilengkapi fitur untuk memudahkan pencarian dan pengelolaan data.

- **Tampilkan:** digunakan untuk mengatur jumlah baris data yang ditampilkan pada setiap halaman tabel, dengan pilihan mulai dari 15 hingga 100 item.
- **Pencarian:** digunakan untuk mencari hak akses berdasarkan kunci, nama, grup, atau deskripsi. Halaman ini berlaku global untuk seluruh perusahaan.

Fitur ini membantu administrator menemukan izin tertentu dengan lebih cepat, terutama ketika jumlah hak akses semakin banyak.

## Memahami Tabel Daftar Hak Akses

Tabel utama menampilkan informasi setiap hak akses yang terdaftar dalam sistem, meliputi:

- **Kunci Hak Akses:** kode unik yang digunakan untuk mengidentifikasi izin tertentu, misalnya admin_access.create atau product.create.
- **Nama Hak Akses:** nama atau label yang menjelaskan fungsi izin agar lebih mudah dikenali.
- **Grup:** kategori modul atau kelompok fitur yang menaungi izin tersebut, misalnya Admin Access, Catalog, atau Website Content.
- **Jumlah Profil Akses:** jumlah profil akses yang tertaut dengan izin tersebut, termasuk profil yang nonaktif. Deskripsi izin tidak tampil di tabel.
- **Status:** menunjukkan apakah hak akses berstatus aktif atau tidak aktif.
- **Dibuat:** menunjukkan waktu pembuatan hak akses di dalam sistem.

Informasi tersebut membantu administrator mengetahui fungsi suatu izin, modul yang terkait, serta profil akses yang menggunakan izin tersebut.

## Menambahkan Hak Akses Baru

Penambahan hak akses dilakukan oleh pengguna yang memiliki kewenangan untuk mengelola konfigurasi izin sistem.

Langkah-langkahnya adalah sebagai berikut:

1. Klik tombol **+ Tambah Hak Akses** di bagian kanan atas halaman.
2. Isi Kunci Hak Akses dengan pola modul.aksi, hanya huruf kecil, angka, dan garis bawah, minimal dua bagian yang dipisah titik, maksimal 100 karakter (contoh: product.view atau web_navigation.publish). Kunci tidak dapat diubah setelah disimpan, jadi periksa ejaannya.
3. Isi **Nama Hak Akses** dengan nama yang menjelaskan fungsi izin tersebut.
4. Isi Grup dengan nama kelompok modul. Grup berupa kolom teks bebas (opsional, maksimal 100 karakter), bukan pilihan. Gunakan ejaan yang sama persis dengan grup yang sudah ada agar tidak terbentuk grup ganda; bila dikosongkan, izin masuk ke grup "Other".
5. Masukkan **Deskripsi** singkat mengenai fungsi dan tujuan izin tersebut.
6. Periksa kembali data yang dimasukkan, kemudian klik tombol **Buat Hak Akses** untuk menyimpan.

Gunakan kunci hak akses yang jelas, konsisten, dan mudah dikenali. Sebelum membuat izin baru, periksa terlebih dahulu apakah izin dengan fungsi yang sama sudah tersedia agar tidak terjadi duplikasi atau kebingungan dalam pengelolaan.

Penambahan hak akses juga perlu mempertimbangkan dukungan implementasi pada sistem. Pemeriksaan izin dipasang di kode server pada setiap fitur, sehingga hak akses baru yang dibuat dari halaman ini tidak berfungsi untuk apa pun sampai kode memakainya, dan tidak menambah menu atau fitur baru.

## Mengelola Hak Akses yang Sudah Ada

Pada kolom **Aksi** di sisi kanan tabel, klik ikon titik tiga (⋮) untuk membuka pilihan tindakan yang tersedia.

### Edit

Digunakan untuk memperbarui informasi hak akses, seperti nama, grup, atau deskripsi, sesuai pilihan yang tersedia pada formulir.

Kunci hak akses tidak dapat diubah setelah dibuat (kolom kunci terkunci pada formulir Edit). Bila kunci salah, buat hak akses baru dan nonaktifkan yang lama. Yang dapat diubah hanya Nama, Grup, dan Deskripsi.

### Nonaktifkan

Digunakan untuk menonaktifkan hak akses yang sudah tidak diperlukan atau tidak lagi digunakan sesuai kebutuhan sistem.

Izin yang dinonaktifkan langsung dianggap tidak dimiliki oleh semua profil: fitur yang dilindunginya ditolak bagi seluruh pengguna selain Akses Sistem Penuh. Periksa profil yang menggunakannya sebelum menonaktifkan.

### Aktifkan

Menu Aktifkan tampil pada izin yang nonaktif dan mengembalikan izin tersebut setelah konfirmasi.

### Hapus

Hak akses tidak dapat langsung dihapus. Hak akses harus dinonaktifkan terlebih dahulu sebelum proses penghapusan dapat dilakukan.

Penghapusan juga ditolak selama izin masih terpasang pada profil mana pun ("Hak akses admin masih digunakan oleh satu atau beberapa profil akses"). Penghapusan bersifat menyembunyikan data dari daftar dan tidak dapat dibatalkan dari panel admin.

Sebelum menghapus suatu izin, pastikan izin tersebut tidak lagi diperlukan oleh konfigurasi profil akses maupun bagian sistem yang terkait.

## Hubungan Hak Akses dengan Profil Akses

Hak akses merupakan komponen dasar dalam pengaturan kewenangan platform internal MATEX. Hubungan keduanya dapat dipahami sebagai berikut:

- **Hak Akses:** mendefinisikan izin spesifik yang tersedia, misalnya izin untuk membuat produk atau mengelola akun admin.
- **Grup Hak Akses:** mengelompokkan izin berdasarkan modul atau fungsi agar pengelolaannya lebih terstruktur.
- **Profil Akses:** menggabungkan sejumlah hak akses menjadi satu kelompok kewenangan.
- **Akun Admin:** menggunakan profil akses untuk memperoleh kewenangan sesuai konfigurasi yang berlaku.

Daftar grup dan hak akses yang dikelola pada halaman ini menjadi pilihan ketika administrator membuat atau mengedit profil akses.

Untuk mengatur hak akses yang diberikan kepada suatu profil, pengguna dapat membuka halaman **Profil Akses** dan menyesuaikan izin yang dibutuhkan.

## Rencana Pengembangan Tampilan — Humanized View

Sebagai rencana pengembangan di masa mendatang, tampilan tabel Hak Akses direncanakan untuk dibuat lebih intuitif dan mudah dipahami melalui pendekatan Humanized View.

Tujuannya adalah membantu administrator memahami struktur izin berdasarkan modul, tanpa harus membaca daftar panjang yang disajikan dalam format tabel datar (flat list).

Rencana pengembangan tersebut mencakup:

### Pengelompokan Berdasarkan Modul (Grouping)

Hak akses direncanakan untuk dikelompokkan secara visual berdasarkan modul atau kategori terkait, misalnya Catalog, Website Content, dan Admin Access.

Pengelompokan ini diharapkan memudahkan administrator menemukan izin yang berkaitan dengan fungsi tertentu.

### Tampilan Daftar Terstruktur (List View)

Di dalam setiap kelompok modul, hak akses direncanakan untuk disajikan dalam bentuk daftar yang lebih terstruktur, dengan label dan indikator visual yang mudah dikenali.

Pendekatan ini diharapkan membantu administrator memahami cakupan izin per modul secara lebih cepat dan mengurangi kesulitan ketika mengelola daftar hak akses yang semakin banyak.

Kedua hal tersebut merupakan rencana pengembangan tampilan, bukan fitur yang dinyatakan sudah tersedia pada versi platform saat ini.

Catatan: pengelompokan per grup sebenarnya sudah tersedia pada formulir Profil Akses (panel Grup Hak Akses); rencana ini menyangkut tampilan pada halaman Hak Akses ini.

## Praktik Pengelolaan Hak Akses yang Disarankan

Untuk menjaga konsistensi konfigurasi dan keamanan sistem, perhatikan hal-hal berikut:

- Gunakan kunci hak akses yang jelas dan konsisten dengan struktur sistem.
- Berikan nama dan deskripsi yang menjelaskan fungsi izin secara spesifik.
- Kelompokkan izin berdasarkan modul atau fungsi yang sesuai.
- Periksa profil akses yang menggunakan izin sebelum melakukan perubahan atau penonaktifan.
- Nonaktifkan hak akses sebelum menghapusnya.
- Pastikan perubahan konfigurasi diselaraskan dengan implementasi pemeriksaan izin pada sistem.

Pengelolaan hak akses yang baik membantu menjaga pembagian kewenangan tetap terstruktur, memudahkan pemeliharaan konfigurasi, serta mendukung keamanan platform internal MATEX.

- Deskripsi hak akses pada tabel basis data dibatasi 255 karakter walaupun formulir menerima hingga 500; tulis deskripsi singkat.

**Kendala yang diketahui (diperbaiki pada versi 1.1):** daftar hak akses belum sepenuhnya rapi. Terdapat dua set izin kategori produk (product_category.* pada grup Catalog dan category_product.* pada grup Produk), izin uji contoh.view yang nonaktif, serta nama izin yang bercampur Bahasa Indonesia dan Inggris. Jangan menghapus atau mengubah izin tersebut sebelum ada arahan developer.

## Daftar kode hak akses

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
