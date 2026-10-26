# Halaman Log Aktivitas

> **Untuk apa:** menelusuri siapa melakukan apa dan kapan pada platform (rekam jejak/audit).
> **Izin yang dibutuhkan:** audit_log.view (hanya membaca; log tidak bisa diubah atau dihapus dari sini).
> **Perlu diperhatikan:** log hanya mencatat perubahan dan peristiwa keamanan, bukan siapa yang sekadar melihat halaman; perlakukan data IP dan identitas secara rahasia.

## Gambaran Umum

Halaman **Log Aktivitas** berfungsi sebagai pusat pemantauan rekam jejak aktivitas yang tercatat pada platform internal MATEX. Halaman ini membantu administrator menelusuri aktivitas pengguna, perubahan data, akses sistem, serta peristiwa keamanan yang direkam oleh sistem.

Log aktivitas dapat digunakan untuk membantu proses pemeriksaan ketika terjadi perubahan data, kendala operasional, atau aktivitas yang memerlukan penelusuran lebih lanjut.

Informasi yang tersedia mencakup waktu kejadian, kode aktivitas, pelaku, objek yang terkait, hasil permintaan, serta detail teknis lainnya sesuai data yang direkam oleh sistem.

- Pengguna hanya melihat log milik perusahaannya sendiri.
- Log hanya mencatat perubahan data dan peristiwa keamanan/akses dari panel admin. Aktivitas sekadar melihat halaman dan kunjungan website publik tidak dicatat.
- Tidak ada penghapusan log otomatis; log disimpan tanpa batas waktu.

## Penyaringan dan Pencarian Log

Halaman Log Aktivitas menyediakan beberapa fitur untuk membantu pengguna menemukan catatan aktivitas yang dibutuhkan.

### Filter Tanggal

Gunakan kolom tanggal untuk menyaring log berdasarkan tanggal atau rentang tanggal yang ingin diperiksa. Format tanggal mengikuti petunjuk pada kolom, yaitu TTTT-BB-HH (tahun-bulan-hari).

**Perhatikan:** tanggal pada log mengikuti UTC, sehingga aktivitas antara pukul 00.00 dan 07.00 WIB tercatat pada tanggal sebelumnya.

Filter ini berguna ketika pengguna ingin menelusuri aktivitas pada waktu tertentu, misalnya untuk memeriksa perubahan data yang terjadi pada hari tertentu.

### Filter Lanjutan

Gunakan tombol filter lanjutan di sebelah kolom pencarian untuk mempersempit hasil berdasarkan kriteria yang tersedia, seperti:

- **Kategori (pilihan):** Perubahan Data, Keamanan, Kontrol Akses, File, Sistem, Bisnis, atau Integrasi.
- **Hasil (pilihan):** Berhasil, Gagal, atau Ditolak. Ditolak berarti diblokir oleh aturan akses, bukan sekadar salah isi.
- **Sumber (pilihan):** Web Admin, Web Publik, API, Sistem, Job, atau Integrasi. Pada praktiknya hampir semua catatan bersumber Web Admin.
- **Modul:** kolom teks bebas yang harus ditulis persis, misalnya admin_account.
- **Aksi:** kolom teks bebas yang harus ditulis persis, misalnya update atau login.
- **Kode Event:** kolom teks bebas yang harus ditulis persis, misalnya admin_account.updated.

Modul, Aksi, dan Kode Event harus diisi persis seperti yang tertera pada tabel; pencarian sebagian kata tidak berlaku pada ketiga kolom ini. Pilihan Sistem, Bisnis, Integrasi (kategori) serta Web Publik, Job, Integrasi (sumber) disiapkan untuk pengembangan mendatang dan saat ini belum menghasilkan catatan, sehingga hasilnya kosong — bukan kerusakan.

### Kolom Pencarian

Kolom pencarian mencari sebagian kata pada kode event, modul, aksi, nama pelaku, nama entitas, rute, ID Request, dan ID Korelasi. ID Request dan ID Korelasi berguna untuk melacak satu rangkaian kejadian.

Pencarian dapat digabungkan dengan filter tanggal dan filter lanjutan. Filter, urutan, dan halaman tersimpan pada alamat URL sehingga hasilnya dapat dibagikan lewat tautan atau dimuat ulang.

## Memahami Tabel Log Aktivitas

Tabel utama menampilkan catatan peristiwa yang berhasil direkam oleh sistem. Informasi yang tersedia meliputi:

- **Waktu:** tanggal dan jam ketika aktivitas tercatat, dalam zona waktu UTC. Tambahkan 7 jam untuk memperoleh waktu WIB; misalnya 08:01 berarti 15:01 WIB.
- **Event:** kode yang mengidentifikasi peristiwa, misalnya admin_account.updated atau auth.login.succeeded.
- **Pelaku:** akun atau identitas yang tercatat melakukan aktivitas. Informasi ini dapat berbeda bergantung pada jenis peristiwa dan konteks permintaan.
- **Entitas:** objek atau data yang berkaitan dengan aktivitas, misalnya akun admin atau data produk.
- **Modul:** bagian sistem yang berkaitan dengan peristiwa tersebut.
- **Kategori:** pengelompokan aktivitas, misalnya data_change, security, atau access_control. Nilai pada tabel tampil dalam kode berbahasa Inggris.
- **Hasil:** success, failure, atau denied, juga dalam kode berbahasa Inggris.
- **Metode:** metode permintaan yang digunakan, seperti GET, POST, PUT, PATCH, atau DELETE (judul kolom pada layar hanya "Metode").
- **Status HTTP:** kode respons yang tercatat, misalnya 200 atau 201.
- **Lihat:** ikon mata pada baris untuk membuka detail. Mengeklik barisnya juga membuka detail. Istilah "Aksi" di sini berbeda dengan filter Aksi; kolom aksi pada log hanya tampil di halaman detail.

Informasi pada tabel membantu administrator melakukan pemeriksaan awal sebelum membuka detail suatu peristiwa.

Perlu diperhatikan bahwa kode event, hasil aktivitas, dan status HTTP merupakan informasi yang berbeda. Sebagai contoh, kode HTTP 200 atau 201 menunjukkan status respons HTTP, sedangkan hasil aktivitas menjelaskan status yang dicatat oleh sistem. Makna akhirnya perlu dibaca sesuai konteks peristiwa terkait.

## Melihat Detail Log Aktivitas

Untuk memeriksa informasi lebih lengkap, klik ikon mata (Lihat) pada baris log yang ingin diperiksa, atau klik barisnya. Alamat detail berbentuk /activity-log/<kode>, berupa kode acak, misalnya /activity-log/k3Mv7PmV.

Sistem akan membuka halaman Detail Log Aktivitas, yang memuat kelompok informasi berikut secara berurutan.

### Header dan Ringkasan

Header menampilkan kode event, waktu, lencana Hasil, dan lencana Integritas. Bagian Ringkasan memuat Modul, Aksi, Kategori, dan Sumber.

### Pelaku & Entitas

Menampilkan informasi mengenai akun atau identitas yang tercatat sebagai pelaku serta objek yang terkait dengan peristiwa tersebut.

### Konteks Request

Memuat ID Request, ID Korelasi, Metode HTTP, Status HTTP, Route, Alamat IP, Durasi (ms), Cakupan Perusahaan (atau "Global"), dan User Agent.

Informasi teknis ini dapat membantu penelusuran kendala atau pemeriksaan aktivitas yang tidak biasa. Data alamat IP dan identitas teknis lainnya perlu diperlakukan sebagai informasi yang aksesnya dibatasi sesuai kebutuhan operasional dan kebijakan privasi.

### Perubahan (Sebelum dan Sesudah)

Untuk peristiwa perubahan data, sistem dapat menampilkan perbandingan:

- **Sebelum:** kondisi data sebelum perubahan.
- **Sesudah:** kondisi data setelah perubahan.
- **Field yang Berubah:** daftar kolom atau atribut yang mengalami perubahan.

Informasi ini membantu administrator memahami bagian data yang berubah tanpa harus membandingkan seluruh data secara manual.

Tidak semua peristiwa memiliki perbandingan. Peristiwa login, logout, sesi tidak valid, dan izin ditolak hanya memiliki Metadata (misalnya alasan penolakan), sedangkan Sebelum dan Sesudah kosong. Pembuatan data baru umumnya hanya memiliki Sesudah, dan penghapusan umumnya hanya Sebelum. Aktivitas sekadar melihat halaman tidak pernah dicatat.

### Verifikasi Integritas Log

Bagian ini selalu tampil pada detail log. Saat catatan dibuat, server memberinya tanda tangan digital (HMAC-SHA256). Saat detail dibuka, sistem menghitung ulang tanda tangan itu dan membandingkannya dengan yang tersimpan.

Lencana hijau "Integritas Terverifikasi" berarti isi catatan tidak berubah sejak ditulis. Lencana merah "Integritas Tidak Valid" berarti catatan perlu diselidiki, atau tanda tangannya tidak tersedia/tidak cocok. Lencana merah dapat muncul palsu bila kunci integritas kosong atau diganti. Pemeriksaan ini juga tidak dapat mendeteksi catatan yang dihapus seluruhnya atau peristiwa yang tidak pernah tercatat.

Metadata dan data sensitif: bagian Metadata berisi keterangan tambahan berbentuk JSON. Kata sandi, token, kunci rahasia, dan sejenisnya disamarkan otomatis menjadi [REDACTED], sedangkan email, nomor telepon, nama, alamat IP, dan User Agent tidak disamarkan sehingga perlu diperlakukan sebagai data rahasia.

## Rencana Pengembangan Tampilan — Humanized Log View

Sebagai rencana pengembangan di masa mendatang, tampilan tabel Log Aktivitas direncanakan untuk dibuat lebih mudah dipahami melalui pendekatan **Humanized Log View**.

Pada tampilan saat ini, pengguna perlu membaca dan menghubungkan beberapa kolom, seperti pelaku, event, entitas, metode HTTP, status, dan waktu, untuk memahami suatu aktivitas secara utuh.

Melalui pendekatan Humanized Log View, informasi tersebut direncanakan untuk disajikan dalam bentuk kalimat deskriptif yang lebih natural dan mudah dibaca.

Contoh simulasi format naratif:

Atta melakukan tindakan tambah produk dengan rincian field:Nama Produk: …Kategori: …Publikasi: draftsukses pada tanggal … pukul …

Atta melakukan tindakan perubahan artikel dengan rincian field:Judul: … Tag: …Publikasi: publishedsukses pada tanggal … pukul …

Kalimat di atas hanya contoh format penyajian, bukan catatan aktivitas aktual MATEX.

Pengembangan ini diharapkan dapat membantu administrator memahami siapa yang melakukan tindakan, tindakan apa yang dilakukan, objek apa yang terpengaruh, serta kapan aktivitas terjadi, tanpa harus mencocokkan informasi dari setiap kolom secara manual.

Tampilan naratif tetap perlu mempertahankan informasi teknis yang relevan agar log dapat digunakan untuk pemeriksaan dan penelusuran masalah. Pendekatan ini merupakan rencana pengembangan, bukan fitur yang dinyatakan sudah tersedia pada versi platform saat ini.

## Praktik Penggunaan Log Aktivitas yang Disarankan

Untuk membantu proses pemantauan dan penelusuran aktivitas, perhatikan hal-hal berikut:

- Gunakan filter tanggal untuk mempersempit waktu kejadian yang ingin diperiksa.
- Manfaatkan filter lanjutan untuk memisahkan aktivitas berdasarkan kategori, hasil, sumber, modul, atau kode event.
- Periksa detail log ketika informasi pada tabel belum cukup menjelaskan suatu peristiwa.
- Gunakan data Sebelum, Sesudah, dan field yang berubah apabila tersedia untuk memahami perubahan data.
- Periksa informasi teknis sesuai kebutuhan dan kewenangan yang dimiliki.
- Jangan langsung menyimpulkan adanya penyalahgunaan hanya berdasarkan satu catatan log; pertimbangkan konteks dan catatan terkait lainnya.

Log Aktivitas merupakan sarana pendukung pemantauan dan audit internal. Kelengkapan serta ketepatan informasi yang ditampilkan bergantung pada jenis aktivitas yang dicatat, konfigurasi sistem, dan data yang tersedia. Oleh karena itu, halaman ini sebaiknya digunakan sebagai bagian dari proses pemeriksaan, bukan sebagai satu-satunya dasar untuk menarik kesimpulan atas suatu kejadian.

**Kendala yang diketahui (diperbaiki pada versi 1.1):** waktu pada Log Aktivitas memakai UTC, berbeda dengan halaman lain yang memakai WIB. Sebagian baris, misalnya product.updated, juga belum menampilkan Status HTTP. Mohon dimaklumi.

## Daftar kode peristiwa log aktivitas

## Peristiwa yang Dicatat

Berikut kode peristiwa (event) yang ditulis oleh server saat ini. Gunakan kode ini pada kolom **Kode Event** di Log Aktivitas (harus ditulis persis). Tanda titik di depan, misalnya .updated, berarti awalannya sama dengan kode sebelumnya.

| Kelompok | Kode peristiwa |
| --- | --- |
| Autentikasi dan sesi | auth.login.succeeded, auth.login.failed, auth.login.denied, auth.logout, auth.session.invalid, auth.account.inactive, auth.access_company_mismatch, auth.access_profile.inactive, auth.permission.denied, auth.password.changed, auth.password.change_failed |
| Akun admin | admin_account.created, .updated, .status_changed, .deleted, .profile_updated (perubahan Profil Saya) |
| Profil akses | admin_access.created, .updated, .permissions_changed, .status_changed, .deleted |
| Hak akses | admin_permission.created, .updated, .status_changed, .deleted |
| Jabatan | chair.created, .updated, .status_changed, .deleted |
| Kantor | office.created, .updated, .publication_changed, .operating_hours_changed, .media_changed, .status_changed, .deleted |
| Produk dan kategori | product.created, product.updated, product_category.created, .updated, .reordered |
| Artikel | article.created, article.updated |
| FAQ | faq.created, .updated, .status_updated, .deleted |
| Halaman website dan kontak | website_page.updated, public_contact.updated |
| Navigasi website | web_navigation.created, .updated, .activated, .deactivated, .deleted, web_navigation_item.created, .updated, .deleted, web_navigation_items.reordered |
| Media | attachment.uploaded, attachment.deleted |

## Yang Tidak Dicatat

- Aktivitas sekadar **melihat** halaman atau data.
- Pengunjung website publik (mereka dicatat di Analitik Publik, bukan di Log Aktivitas).
- Impor katalog produk, penggunaan SEO & Mesin Pencari, bantuan penulisan otomatis, dan pengiriman formulir kontak publik.
- Kata sandi, token, dan kunci rahasia: bila muncul dalam data, nilainya diganti [REDACTED].
