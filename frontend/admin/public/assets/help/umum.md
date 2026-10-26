# Panduan umum

> **Untuk apa:** berpindah antarhalaman, mencari menu, mengganti bahasa/tema, dan keluar dengan aman.
> **Izin yang dibutuhkan:** menu yang tampil mengikuti hak akses akun Anda.
> **Perlu diperhatikan:** menu yang terlihat belum tentu berarti semua tindakan di dalamnya boleh Anda lakukan.

## Gambaran Umum

Sebagaimana platform berbasis web pada umumnya, Matex Platform memiliki tiga komponen antarmuka utama yang perlu dipahami oleh setiap pengguna, yaitu **Header, Footer, dan Sidebar**. Ketiga komponen ini berfungsi sebagai sarana navigasi, akses cepat ke fitur tertentu, pengaturan preferensi pengguna, serta penyediaan informasi mengenai status aplikasi dan sesi login.

Pemahaman terhadap fungsi masing-masing komponen akan membantu pengguna mengoperasikan platform secara lebih efektif dan mengakses fitur sesuai dengan kebutuhan serta kewenangan yang dimiliki.

## Header

Header merupakan bagian antarmuka yang terletak di bagian atas platform internal. Komponen ini menyediakan akses cepat ke sejumlah fungsi, seperti navigasi ke dasbor, pintasan menu, pencarian, pengaturan tampilan, pemilihan bahasa, serta pengelolaan akun pengguna.

Berikut penjelasan fungsi setiap elemen pada Header.

### Logo MATEX

Logo MATEX yang berada di bagian kiri Header (atau teks MATEX apabila gambar logo tidak tersedia) berfungsi sebagai pintasan menuju halaman Dasbor. Pengguna dapat menekan logo tersebut untuk kembali ke Dasbor dari halaman mana pun.

### Tombol Toggle Sidebar

Tombol ini digunakan untuk menampilkan atau menyembunyikan Sidebar. Fitur tersebut membantu pengguna menyesuaikan ruang kerja, terutama ketika menggunakan perangkat dengan ukuran layar terbatas.

### Tombol Shortcut

Tombol Shortcut menyediakan akses cepat ke beberapa fungsi yang sering digunakan. Pada versi 1.0.10, pintasan yang tersedia meliputi:

- **Tambah Produk:** membuka halaman pembuatan produk baru di https://internal.matexindo.com/product/create.
- **Tambah Artikel:** membuka halaman pembuatan artikel baru di https://internal.matexindo.com/blog/create.
- **Media:** membuka halaman pengelolaan media di https://internal.matexindo.com/media.

Pintasan yang tidak diizinkan untuk akun Anda tidak ditampilkan pada daftar. Pada layar, tombol ini berlabel "Short Cut" (bukan "Pintasan").

### Kolom Pencarian Internal

Kolom pencarian yang tersedia pada Header berfungsi untuk membantu pengguna menemukan menu di dalam platform internal.

Ketik kata kunci pada kolom Cari, maka daftar menu yang cocok langsung muncul. Tidak ada syarat jumlah karakter minimal. Hanya menu yang boleh Anda akses yang ditampilkan; bila tidak ada yang cocok, muncul tulisan "Ups!! Tidak ada hasil yang ditemukan." Pada layar kecil, ikon kaca pembesar membuka kolom pencarian. Sidebar juga memiliki kolom pencarian sendiri untuk menyaring menu.

Pada tahap pengembangan berikutnya, fungsi pencarian direncanakan untuk diperluas agar dapat mencakup berbagai sumber informasi, seperti katalog produk, judul artikel, dan data lain yang tersedia melalui sistem. Hasil pencarian juga direncanakan untuk dikelompokkan berdasarkan jenis atau sumber data agar lebih mudah dipahami.

Integrasi teknologi kecerdasan buatan (Artificial Intelligence atau AI) dapat dipertimbangkan sebagai pengembangan lanjutan apabila memungkinkan secara teknis dan memberikan manfaat nyata bagi pengguna. Rencana tersebut belum menjadi bagian dari fungsi pencarian yang dijamin tersedia pada versi saat ini.

### Tombol Website Publik

Tombol dengan ikon globe berfungsi sebagai pintasan menuju website publik MATEX di https://matexindo.com dan terbuka pada tab baru. Tooltip tombol bertuliskan "Store" (teks tetap yang tidak diterjemahkan).

Melalui tombol ini, pengguna dapat melihat website sebagaimana ditampilkan kepada pengunjung publik, sehingga memudahkan pemeriksaan hasil pengelolaan konten dan informasi yang dipublikasikan.

### Tombol Fullscreen

Tombol ini digunakan untuk beralih ke tampilan layar penuh (fullscreen) apabila didukung oleh browser dan lingkungan perangkat yang digunakan.

Pengguna juga dapat memanfaatkan tombol F11 pada keyboard untuk mengaktifkan atau menonaktifkan mode layar penuh browser pada perangkat yang mendukung fungsi tersebut.

### Pengaturan Bahasa

Fitur pengaturan bahasa memungkinkan pengguna memilih bahasa antarmuka antara Bahasa Indonesia dan Bahasa Inggris. Pada versi 1.0.10, Bahasa Indonesia menjadi pilihan default.

Preferensi bahasa yang dipilih akan disimpan pada browser. Dengan demikian, ketika pengguna memuat ulang halaman atau kembali mengakses platform melalui browser yang sama, sistem dapat menggunakan kembali pilihan bahasa terakhir yang tersimpan.

Catatan: Dasbor, Analitik Publik, serta SEO & Mesin Pencari memakai teks tetap Bahasa Indonesia sehingga tampilannya tidak berubah walaupun bahasa diganti ke English. Hal ini bukan kerusakan.

### Pengaturan Tema

Tombol pengaturan tema digunakan untuk mengubah tampilan antarmuka antara mode terang (light mode) dan mode gelap (dark mode).

Seperti pengaturan bahasa, preferensi tema disimpan pada browser sehingga pilihan terakhir dapat digunakan kembali ketika pengguna mengakses platform melalui browser yang sama.

### Profil Pengguna dan Menu Akun

Pada bagian kanan Header, sistem menampilkan foto profil (atau huruf inisial nama bila belum ada foto), nama pengguna, serta nama Profil Akses akun yang sedang login. Menu akun terbuka saat kursor diarahkan ke bagian ini, atau saat diketuk pada layar kecil.

Apabila ditekan, bagian ini menampilkan menu yang berkaitan dengan pengelolaan akun, antara lain:

- **Profil Saya:** membuka halaman /account untuk mengubah foto, nama, kontak cadangan, dan kata sandi Anda.
- **Keluar:** menampilkan kotak konfirmasi; setelah Anda menyetujui, sesi diakhiri dan Anda dikembalikan ke halaman login. Peristiwa keluar tercatat pada Log Aktivitas.

Sejak versi 1.1, halaman Profil Saya menyimpan foto, nama, kontak cadangan, dan kata sandi lewat sistem. Data lain akun (email dan telepon utama, kantor, jabatan, profil akses) tetap diubah oleh admin berwenang melalui halaman Akun Admin.

## Footer

Footer merupakan bagian antarmuka yang berada di bagian bawah platform internal. Pada versi 1.0.10, Footer menampilkan teks hak cipta dan penghitung waktu sesi login yang tersisa. Versi aplikasi tidak ditampilkan pada Footer.

### Informasi Hak Cipta

Footer menampilkan teks hak cipta, saat ini berbunyi "Copyright 2026 © MATEX". Teks ini berasal dari berkas pengaturan tetap pada aplikasi, sehingga tahunnya tidak berganti otomatis dan perlu diperbarui secara manual oleh developer setiap pergantian tahun.

### Penghitung Waktu Sesi Login

Footer menampilkan penghitung mundur bertuliskan "Sesi berakhir dalam" dengan format jam:menit:detik (HH:mm:ss). Sesi login berlaku 24 jam sejak login dan tidak diperpanjang otomatis walaupun Anda terus bekerja. Penghitung hanya tampil ketika sisa waktu 24 jam atau kurang.

Ketika waktu habis, sistem otomatis mengakhiri sesi dan mengarahkan Anda ke halaman login tanpa peringatan terlebih dahulu; Anda perlu masuk kembali. Hal yang sama terjadi bila server menolak sesi yang tidak valid di tengah pekerjaan. Menutup tab tidak otomatis keluar: sesi tetap berlaku sampai waktunya habis atau Anda menekan Keluar.

Tanda sesi disimpan pada cookie browser bernama access_token yang bersifat HttpOnly, artinya tidak dapat dibaca oleh skrip pada halaman web. Cookie tetap tidak berarti sesi akan terus valid: setelah token kedaluwarsa atau dinyatakan tidak valid oleh server, Anda harus masuk kembali.

### Hal yang Perlu Diperhatikan Ketika Sesi Berakhir

Pengguna disarankan menyimpan perubahan data secara berkala dan memastikan bahwa proses penyimpanan telah berhasil sebelum meninggalkan halaman.

Sistem tidak memiliki fitur simpan draf otomatis. Bila sesi berakhir ketika Anda sedang menambah atau mengedit data, perubahan yang belum berhasil disimpan dapat hilang. Data yang telah berhasil disimpan di server tidak ikut terhapus hanya karena sesi berakhir.

Oleh karena itu, pengguna perlu memeriksa kembali hasil penyimpanan apabila terjadi pengalihan ke halaman login ketika sedang melakukan pengelolaan data.

Sebagai pengembangan lanjutan, mekanisme penyimpanan sementara (draft), pemulihan input, atau pemulihan data sebelum sesi berakhir dapat dipertimbangkan untuk mengurangi risiko kehilangan pekerjaan yang belum disimpan, sesuai dengan kelayakan teknis dan keamanan sistem.

## Sidebar

Sidebar merupakan panel navigasi utama yang digunakan untuk mengakses berbagai modul dan halaman administrasi Matex Platform. Menu di dalamnya dikelompokkan berdasarkan fungsi agar pengguna dapat menemukan fitur yang dibutuhkan dengan lebih mudah.

Susunan menu yang ditampilkan dapat berbeda antara satu pengguna dan pengguna lainnya, bergantung pada profil akses serta hak akses yang diberikan kepada akun tersebut.

Berikut adalah kelompok menu beserta fungsi dan alamat URL masing-masing pada versi 1.0.10.

### Dasbor

Dasbor merupakan halaman utama administrasi yang menyajikan ringkasan informasi dan aktivitas website MATEX.

URL: https://internal.matexindo.com/dashboard

### Analitik Publik

Menu **Analitik Publik** digunakan untuk melihat data aktivitas pengunjung website, termasuk informasi yang tersedia mengenai trafik dan interaksi pengunjung.

URL: https://internal.matexindo.com/public-analytics

### SEO & Mesin Pencari

Menu **SEO & Mesin Pencari** menyediakan akses ke fitur pengelolaan atau pemantauan yang berkaitan dengan SEO dan kebutuhan optimasi website pada mesin pencari.

URL: https://internal.matexindo.com/seo-console

### Administrasi

Kelompok menu **Administrasi** berisi fungsi pengelolaan akun, pengaturan akses, pencatatan aktivitas, dan data pendukung administrasi internal.

| Menu | Fungsi | URL |
| --- | --- | --- |
| Akun Admin | Mengelola akun administrator yang terdaftar pada sistem. | Buka halaman |
| Profil Akses | Mengelola profil akses yang digunakan untuk mengelompokkan kewenangan pengguna. | Buka halaman |
| Hak Akses | Mengatur kewenangan yang berkaitan dengan akses terhadap menu dan tindakan tertentu. | Buka halaman |
| Log Aktivitas | Melihat catatan aktivitas administrator yang direkam oleh sistem. | Buka halaman |
| Jabatan | Mengelola data jabatan yang digunakan sebagai data referensi dalam sistem. | Buka halaman |
| Kantor | Mengelola informasi kantor MATEX yang digunakan untuk kebutuhan administrasi dan publikasi sesuai implementasi sistem. | Buka halama |

### Website

Kelompok menu **Website** digunakan untuk mengelola halaman, navigasi, dan informasi yang ditampilkan pada website publik MATEX.

| Menu | Fungsi | URL |
| --- | --- | --- |
| Navigasi Header Website | Mengelola navigasi Header dan rute utama website publik. | Buka halaman |
| Beranda | Mengelola konten halaman utama website publik. | Buka halaman |
| Tentang MATEX | Mengelola informasi profil dan pengenalan MATEX pada website publik. | Buka halaman |
| Artikel | Mengelola artikel yang dipublikasikan melalui website. | Buka halaman |
| Pengaturan Kontak | Mengelola informasi kontak yang ditampilkan kepada pengunjung. | Buka halaman |
| FAQ | Mengelola pertanyaan dan jawaban yang ditampilkan pada website publik. | Buka halaman |
| Syarat dan Ketentuan | Mengelola konten halaman syarat dan ketentuan website. | Buka halaman |
| Karir (Segera) | Halaman yang disiapkan untuk kebutuhan informasi karier dan rekrutmen pada tahap pengembangan berikutnya. | Buka halaman |

Ketersediaan fungsi pada halaman Karir mengikuti status implementasinya. Keberadaan rute halaman tidak selalu berarti bahwa seluruh fitur pengelolaannya sudah aktif.

### Katalog

Kelompok menu **Katalog** digunakan untuk mengelola data kategori dan produk MATEX yang menjadi bagian dari katalog website publik.

| Menu | Fungsi | URL |
| --- | --- | --- |
| Kategori Produk | Mengelola kategori sebagai pengelompokan produk. | Buka halaman |
| Produk | Mengelola data produk yang ditampilkan pada katalog website publik. | Buka halaman |

### Media

Menu **Media** digunakan untuk mengakses Media Library, yaitu fasilitas pengelolaan media yang mendukung kebutuhan konten website, seperti gambar produk dan materi visual lainnya.

URL: https://internal.matexindo.com/media

## Tabel Daftar

Semua halaman daftar (Akun Admin, Jabatan, Produk, FAQ, dan lainnya) memakai tabel yang sama, jadi cara memakainya sama di setiap halaman.

### Jumlah per halaman

Kotak angka di kiri atas tabel (15, 25, 50, atau 100) mengatur berapa baris yang tampil per halaman. Mengganti angkanya kembali ke halaman 1.

### Cari

Ketik kata kunci di kotak **Cari**; daftar menyaring otomatis setelah Anda berhenti mengetik sebentar. Kolom yang dicari berbeda per halaman, misalnya nama dan email di Akun Admin, nama dan SKU di Produk.

### Muat ulang

Ikon panah melingkar memuat ulang daftar dengan pencarian, urutan, dan halaman yang sama. Setelah dipakai, tombol beristirahat 3 detik.

### Muat ulang dari awal

Ikon di sebelahnya menghapus pencarian, urutan, filter tanggal, dan jumlah per halaman, lalu memuat halaman 1. Juga beristirahat 3 detik setelah dipakai.

### Impor dan unduh

Dua ikon terakhir disiapkan untuk impor dan unduh data, tetapi belum aktif (segera hadir).

### Urutkan kolom

Tombol panah kecil di samping judul kolom mengurutkan daftar menurut kolom itu; tekan lagi untuk membalik urutan. Hanya kolom yang punya tombol ini yang bisa diurutkan.

### Pengaturan tabel

Ikon roda gigi di ujung kanan judul kolom berisi tiga pilihan tampilan yang tersimpan untuk akun Anda di browser ini: **Tampilkan teks penuh** (sel tidak dipotong setelah dua baris), **Sembunyikan tombol urut**, dan **Warna baris selang-seling**.

### Menu aksi

Tombol tiga titik di ujung baris membuka tindakan untuk baris itu, misalnya Edit, Nonaktifkan, atau Hapus. Pilihan yang tampil mengikuti hak akses akun Anda dan status data. Menu terbuka di samping tombol, jadi tombol baris berikutnya tetap bisa diklik langsung.

### Teks terpotong

Isi sel paling banyak dua baris dan hanya pindah baris di antara kata. Teks yang tidak muat diakhiri "…"; arahkan kursor ke teks itu untuk melihat isi lengkapnya.

### Ringkasan di bawah tabel

"Menampilkan x dari y data" membandingkan jumlah hasil pencarian dengan seluruh data, diikuti lama pemuatan terakhir dalam detik. Di kanan ada tombol halaman.

## Tombol Bantu

Beberapa tombol kecil tersedia di semua halaman untuk membantu memakai panel.

### Tanda tanya (?)

Ikon ? di samping judul, kartu, atau kolom isian menampilkan penjelasan singkat. Arahkan kursor untuk melihatnya sebentar, atau klik supaya tetap terbuka sampai Anda mengklik di tempat lain atau menekan Esc. **Selengkapnya** membuka panduan di bagian yang sama.

### Panduan

Ikon ? di Header membuka panel panduan halaman yang sedang dibuka di sisi kanan. Daftar "Di halaman ini" melompat ke bagian yang diklik, dan kotak pilihan di atas membuka panduan halaman lain. Panel tetap terbuka saat Anda bekerja dan pindah halaman; tutup dengan tombol × atau Esc.

### Kembali

Tombol **Kembali** di kepala formulir membuka daftar asalnya dengan pencarian, urutan, dan halaman terakhir yang Anda tinggalkan.

### Pratinjau gambar

Arahkan kursor ke gambar lalu klik ikon mata untuk melihatnya penuh di layar. Kumpulan gambar bisa digeser dengan panah kiri dan kanan. Tutup dengan Esc, klik area gelap, atau tombol ×.

## Ketentuan Tampilan Menu dan Hak Akses Pengguna

Tidak semua pengguna akan melihat susunan Sidebar yang sama. Menu yang ditampilkan dan tindakan yang dapat dilakukan ditentukan berdasarkan profil akses serta hak akses yang diberikan kepada akun pengguna.

Sebagai contoh, seorang pengguna dapat memiliki akses ke empat menu utama saja, sedangkan pengguna lainnya dapat mengakses lebih banyak modul administrasi. Pada modul Produk, pengguna tertentu mungkin hanya diperbolehkan melihat daftar produk tanpa memiliki kewenangan untuk menambah, mengedit, atau menghapus data.

Perbedaan tersebut merupakan bagian dari pengaturan kewenangan pengguna, bukan berarti platform mengalami kesalahan tampilan.

Dalam Matex Platform, pengaturan akses melibatkan beberapa komponen yang saling berkaitan:

1. **Akun Admin:** identitas pengguna yang digunakan untuk login ke platform.
2. **Profil Akses:** kelompok atau konfigurasi akses yang diberikan kepada pengguna.
3. **Hak Akses:** ketentuan mengenai menu dan tindakan yang boleh dilakukan berdasarkan konfigurasi akses.
4. **Akses Sistem Penuh (is_all_access):** penanda khusus yang digunakan untuk memberikan kewenangan akses menyeluruh sesuai implementasi sistem.

Akun dengan penanda Akses Sistem Penuh (is_all_access) memiliki peran penting karena melewati seluruh pemeriksaan hak akses. Sistem menjaga agar di setiap perusahaan selalu tersisa minimal satu akun aktif dengan Akses Sistem Penuh; akun terakhir tidak dapat dinonaktifkan atau dicabut penandanya.

Pengaturan profil akses dan hak akses dibahas lebih lanjut pada bagian khusus dalam manual book ini. Pengguna tidak disarankan mengubah konfigurasi tersebut tanpa memahami dampaknya terhadap akses pengguna lain dan keberlangsungan administrasi platform.

Perlu diperhatikan bahwa keberadaan suatu menu pada Sidebar tidak selalu berarti seluruh tindakan di dalamnya dapat dilakukan oleh pengguna. Hak untuk melihat data, menambahkan data, mengubah data, dan menghapus data dapat dibatasi secara terpisah sesuai konfigurasi serta penerapan pengamanan pada sistem.

- **Menu disembunyikan, bukan diabukan.** Menu yang tidak diizinkan tidak tampil sama sekali. Menu induk (Administrasi, Website, Katalog) disembunyikan bila tidak ada satu pun menu di dalamnya yang boleh Anda buka.
- **Dasbor selalu terlihat**, tetapi datanya baru dapat dimuat bila akun memiliki izin dashboard.view. Izin yang sama dibutuhkan oleh menu Analitik Publik serta SEO & Mesin Pencari.
- **Beranda, Tentang MATEX, Syarat & Ketentuan, dan Karir** memakai izin website_page.update; akun yang hanya boleh melihat tetapi tidak boleh mengubah halaman tidak akan melihat menu ini.
- **Perubahan izin** baru terlihat pada Sidebar setelah Anda login ulang atau memuat ulang halaman. Namun server memeriksa izin terbaru pada setiap tindakan, sehingga menu yang masih terlihat dapat menolak tindakan dengan pesan "Anda tidak memiliki hak akses untuk melakukan tindakan ini".
- **Cara memakai Sidebar:** klik panah pada menu induk untuk membuka atau menutup submenu; gunakan kolom pencarian untuk menyaring menu; pada layar sempit (di bawah 992 piksel) Sidebar menutup otomatis setelah Anda memilih menu; tombol tiga garis pada Header menampilkan atau menyembunyikan Sidebar.

Dengan memahami fungsi Header, Footer, dan Sidebar beserta ketentuan hak aksesnya, pengguna diharapkan dapat menavigasi platform internal MATEX secara tepat dan menjalankan tugas sesuai dengan kewenangan yang diberikan.

## Pemecahan masalah umum

## Cara Memakai Tabel Ini

Cari kalimat pesan atau gejala yang Anda lihat pada kolom pertama, lalu baca penyebab dan langkah penanganan di kolom berikutnya. Bila masalah berlanjut, hubungi pihak yang tertera pada bagian "Kepada Siapa Meminta Bantuan".

## Daftar Gejala dan Penanganannya

| Gejala atau pesan | Kemungkinan penyebab | Yang dapat dilakukan |
| --- | --- | --- |
| Muncul "Email/nomor telepon atau kata sandi salah" | Salah ketik; memakai email/telepon kedua (hanya yang **utama** berlaku); kata sandi keliru; atau identitas tidak terdaftar. Pesan sengaja sama agar orang luar tidak bisa menebak akun. | Periksa ejaan dan huruf besar/kecil kata sandi, gunakan ikon mata untuk melihatnya. Pakai email atau telepon **utama**. Bila tetap gagal, hubungi admin berwenang. |
| Muncul "Akun Anda tidak aktif" | Akun dinonaktifkan oleh admin. | Hubungi admin berakses penuh untuk mengaktifkan kembali. |
| Muncul "Profil akses Anda tidak aktif" | Profil Akses yang dipakai akun sedang dinonaktifkan. | Minta admin mengaktifkan kembali profil atau memindahkan akun Anda ke profil aktif. |
| Muncul "Too many login attempts. Please try again later." | Batas 10 percobaan per 15 menit dari satu alamat IP tercapai (percobaan berhasil ikut dihitung; rekan sekantor satu jaringan berbagi kuota). | Berhenti mencoba, tunggu sekitar 15 menit, lalu coba lagi. Akun Anda tidak dikunci. |
| Tombol Lupa Kata Sandi tidak mengirim email | Fitur pemulihan belum aktif pada versi 1.0.10. | Jangan menunggu email. Hubungi developer atau admin berwenang untuk mengatur ulang kata sandi. |
| Tiba-tiba kembali ke halaman login | Sesi 24 jam habis, atau server menolak sesi yang tidak valid. | Masuk kembali, lalu periksa apakah perubahan terakhir Anda sudah tersimpan. |
| Menu yang dibutuhkan tidak ada di Sidebar | Akun tidak memiliki izin untuk menu itu. | Minta admin menambah izin pada Profil Akses Anda, lalu login ulang agar menu diperbarui. |
| Menu tampil, tetapi tindakan ditolak ("Anda tidak memiliki hak akses…") | Izin dicabut setelah Anda login (server selalu memeriksa izin terbaru), atau izin view ada tetapi create/update/delete tidak. | Muat ulang halaman atau login ulang; minta izin yang sesuai. |
| Dasbor atau Analitik menampilkan nol dan muncul banner "Pencatatan pengunjung belum diaktifkan" | Pencatatan pengunjung website belum dinyalakan di server (menunggu pengaturan privasi). | Normal, bukan kerusakan. Developer perlu mengaktifkannya (PUBLIC_ANALYTICS_ENABLED). |
| Muncul "Data belum termuat" dengan tombol Coba lagi | Koneksi ke server bermasalah, atau akun tidak memiliki izin dashboard.view. | Klik **Coba lagi**. Bila berulang, periksa izin Anda atau hubungi developer. |
| SEO & Mesin Pencari menampilkan "Belum terhubung" | Kredensial Google Search Console belum dipasang di server. | Penyiapan dilakukan developer/pengelola server. Admin biasa tidak perlu melakukan apa pun. |
| Data Search Console tidak mencakup 3 hari terakhir | Sistem hanya mengambil data final Google yang tertunda ±3 hari. | Normal. Tunggu beberapa hari. |
| Tombol audit PageSpeed tidak bisa ditekan | API key PageSpeed belum dipasang di server, atau audit sedang berjalan (maksimal 60 detik). | Tunggu audit selesai. Bila catatan meminta API key, hubungi developer. |
| Gagal menyimpan: "…sudah digunakan" | Nama/kode/alias/email/telepon/slug harus unik dan sudah dipakai data lain (huruf besar/kecil dianggap sama). | Ganti dengan nilai lain, atau cari data yang sudah ada dan ubah data itu. |
| Tombol Hapus tidak tersedia, atau penghapusan ditolak | Data harus **Nonaktif** terlebih dahulu, dan tidak boleh masih dipakai data lain (misalnya jabatan/kantor/profil yang dipakai akun, izin yang terpasang di profil). | Nonaktifkan dahulu, lalu pindahkan data yang masih memakainya, kemudian hapus. |
| Gambar tidak bisa diunggah | Format selain JPEG/PNG/WebP, ukuran lebih dari 12 MB, atau lebih dari 5 berkas sekaligus. | Ubah format, kecilkan ukuran, atau unggah bertahap. |
| Media tidak bisa dihapus | Gambar masih dipakai di profil admin, kantor, halaman website, atau artikel. | Lepaskan gambar dari konten tersebut terlebih dahulu. |
| Peta pada halaman Kantor tidak muncul | Layanan Google Maps tidak dapat dimuat (konfigurasi kunci di server). | Hubungi developer; penentuan lokasi tidak dapat dilakukan manual. |
| Perubahan tidak tampil di website publik | Belum disimpan; status masih draf/nonaktif; kantor tidak berstatus Publik; bahasa yang dibuka belum diisi; atau tampilan lama tersimpan di browser. | Pastikan pesan berhasil muncul dan status Aktif/Terbit. Periksa kedua bahasa. Muat ulang paksa dengan Ctrl+F5. |
| Pesan dari formulir kontak tidak sampai ke email | Email penerima pada topik salah atau masuk spam; atau pengiriman email dari server gagal (pesan tetap tersimpan di database). | Cek folder spam, periksa alamat penerima pada **Pengaturan Kontak**, lalu hubungi developer bila perlu. |
| Lencana "Integritas Tidak Valid" pada detail log | Kunci integritas log kosong/berganti saat catatan ditulis, atau isi catatan memang berbeda dari saat dibuat. | Jangan langsung menyimpulkan ada pemalsuan. Laporkan ke developer untuk diselidiki. |
| Filter Log Aktivitas selalu kosong | Isian Modul/Aksi/Kode Event harus persis; beberapa pilihan (Sistem, Bisnis, Integrasi) belum dipakai sistem. | Salin ejaan dari tabel log. Gunakan filter tanggal dan pencarian bebas lebih dulu. |
| Tahun hak cipta di Footer tidak berubah | Teks diambil dari berkas pengaturan tetap, tidak otomatis. | Minta developer memperbarui saat pergantian tahun. |

## Kepada Siapa Meminta Bantuan

| Jenis masalah | Hubungi |
| --- | --- |
| Akun, profil akses, atau izin | Admin berakses penuh pada perusahaan Anda. |
| Isi konten (teks, gambar, produk, artikel) | Penanggung jawab konten MATEX. |
| Pesan galat teknis, peta, email, Google, kecepatan, atau data tidak termuat | Developer/pengelola platform.Hardi: 083899213929 (WA) |

Saat melapor, sertakan: halaman dan alamat URL yang dibuka, tindakan yang dilakukan, **kalimat pesan yang muncul persis**, waktu kejadian, dan tangkapan layar. Jangan pernah menyertakan kata sandi dalam laporan.

## Glosarium

## Istilah dan Artinya

Istilah disusun menurut abjad dengan penjelasan sesederhana mungkin.

| Istilah | Arti sederhana |
| --- | --- |
| Admin | Pengguna yang berhak masuk dan mengelola data di panel internal. |
| Akses Sistem Penuh | Penanda pada akun yang melewati semua pemeriksaan izin; ibarat kunci induk. |
| Alias | Nama panggilan pendek akun (huruf dan angka saja, maksimal 15 karakter). |
| Arsip (diarsipkan) | Data disembunyikan dari daftar, bukan dihapus secara fisik dari penyimpanan. |
| Audit | Pemeriksaan jejak: siapa melakukan apa dan kapan. Hasilnya tampil di Log Aktivitas. |
| Banner | Gambar besar di halaman depan website. |
| Cache | Salinan sementara halaman di browser agar cepat dibuka; bisa membuat tampilan lama masih muncul. |
| Canonical | Penanda alamat resmi suatu halaman agar mesin pencari tidak menganggap halaman ganda. |
| Cookie | Berkas kecil di browser. Pada platform ini menyimpan tanda sesi login dan tidak dapat dibaca skrip halaman. |
| Core Web Vitals | Tiga ukuran kenyamanan halaman: kecepatan (LCP), respons (INP), dan kestabilan tampilan (CLS). |
| CTR (Click-Through Rate) | Persentase klik dibanding jumlah tampil di hasil pencarian. |
| Dasbor | Halaman ringkasan pertama setelah login. |
| Direct | Kunjungan tanpa informasi asal, misalnya mengetik alamat langsung. |
| Domain | Nama alamat situs, misalnya matexindo.com. |
| Draf | Status data yang belum diterbitkan. |
| Endpoint | Alamat layanan di server yang dipanggil aplikasi untuk mengambil atau menyimpan data. |
| FAQ | Frequently Asked Questions: daftar pertanyaan dan jawaban umum. |
| First-party analytics | Pencatatan kunjungan yang dikelola sendiri oleh MATEX, tanpa layanan analitik pihak ketiga. |
| Footer | Bagian paling bawah layar panel admin. |
| Geofence | Batas wilayah virtual berbentuk lingkaran di sekitar titik peta; saat ini hanya tersimpan sebagai data. |
| Hak Akses (Permission) | Satu izin tunggal, misalnya product.create. |
| Header | Bagian paling atas layar panel admin. |
| Hash | Sidik jari acak dari suatu data; dipakai menyimpan kata sandi dan memeriksa keaslian log. |
| HTTPS | Sambungan aman ke website (ditandai gembok pada browser). |
| Impresi | Berapa kali halaman muncul di hasil pencarian Google, diklik atau tidak. |
| Internal / Publik | Internal: hanya dipakai di dalam sistem. Publik: boleh tampil di website. |
| IP (alamat IP) | Nomor alamat perangkat/jaringan di internet. Satu jaringan kantor biasanya berbagi satu IP. |
| JWT (JSON Web Token) | Tanda pengenal digital sementara yang diberikan server setelah login berhasil. |
| Kanal kontak | Satu sarana menghubungi MATEX, misalnya WhatsApp atau email. |
| Kueri | Kata atau frasa yang diketik orang di Google. |
| Log Aktivitas | Daftar rekam jejak peristiwa penting pada platform. |
| Marketplace | Toko online pihak lain tempat produk MATEX dijual. |
| Media Library | Pustaka gambar milik platform. |
| Metadata | Keterangan tambahan tentang suatu data atau peristiwa. |
| Modul | Satu bagian fitur pada platform, misalnya Produk atau Artikel. |
| Nonaktif | Data berhenti dipakai tetapi masih tersimpan dan dapat diaktifkan kembali. |
| Page view | Satu kali halaman dibuka. |
| PageSpeed Insights | Alat Google untuk menilai kecepatan dan mutu halaman. |
| Placeholder | Contoh teks samar di dalam kolom isian. |
| Profil Akses | Kumpulan hak akses (peran) yang dipasang pada akun. |
| Rate limit | Pembatasan jumlah permintaan dalam jangka waktu tertentu untuk mencegah penyalahgunaan. |
| Referrer (perujuk) | Situs asal pengunjung sebelum masuk ke website. |
| Search Console | Layanan gratis Google yang melaporkan kinerja website di hasil pencarian. |
| SEO | Search Engine Optimization: upaya agar website mudah ditemukan mesin pencari. |
| Sesi | Rentang waktu Anda tetap dianggap login; pada platform ini 24 jam. |
| Sidebar | Panel menu di sisi kiri layar. |
| Slug | Bagian akhir alamat halaman yang mudah dibaca, misalnya kantor-pusat. |
| SSR (Server-Side Rendering) | Halaman disiapkan sebagian oleh server sebelum dikirim ke browser agar cepat tampil. |
| Status HTTP | Kode jawaban server: 200 berhasil, 401 belum login, 403 ditolak, 404 tidak ditemukan, 429 terlalu banyak permintaan. |
| Token | Tanda pengenal sementara; lihat JWT. |
| Trusted proxy | Perantara jaringan tepercaya yang meneruskan informasi seperti negara pengunjung. |
| URL | Alamat suatu halaman web. |
| User Agent | Teks identitas browser dan sistem operasi. |
| Web Vitals | Lihat Core Web Vitals. |
