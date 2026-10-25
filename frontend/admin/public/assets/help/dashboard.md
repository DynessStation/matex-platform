# Halaman Dasbor

> **Untuk apa:** melihat ringkasan cepat kunjungan website dan kesiapan konten (produk, artikel, FAQ, pesan).
> **Izin yang dibutuhkan:** dashboard.view untuk memuat datanya.
> **Perlu diperhatikan:** angka bernilai nol bila pencatatan pengunjung belum diaktifkan; "Pesan Hari Ini" mengikuti hari UTC; Dasbor tidak menyediakan unduhan/ekspor.

## Gambaran Umum

Halaman Dasbor Operasional merupakan halaman utama yang menyajikan ringkasan aktivitas website publik MATEX dan kondisi pengelolaan konten dalam satu tampilan.

Halaman ini dirancang untuk membantu pengguna memantau trafik pengunjung, memahami minat pengunjung terhadap halaman website, melihat sumber kedatangan trafik, serta mengidentifikasi hal-hal yang perlu diperhatikan dalam pengelolaan konten.

Halaman Dasbor dapat diakses melalui alamat berikut:

**URL:** https://internal.matexindo.com/dashboard

Pada versi 1.0.10, informasi yang ditampilkan terutama berfokus pada pemantauan website publik dan analisis awal yang mendukung evaluasi SEO serta aktivitas digital MATEX. Angka yang ditampilkan bersifat dinamis dan dapat berubah sesuai dengan data yang tercatat pada sistem, rentang waktu yang dipilih, serta waktu pembaruan data.

## Filter Periode dan Tombol Aksi

Pada bagian atas Dasbor terdapat pilihan rentang waktu dan tombol aksi untuk membantu pengguna mengatur serta memperbarui informasi yang ditampilkan.

### Filter Periode

Tersedia tiga pilihan rentang waktu:

- **7 Hari:** menampilkan ringkasan data dalam rentang tujuh hari.
- **30 Hari:** menampilkan ringkasan data dalam rentang tiga puluh hari.
- **90 Hari:** menampilkan ringkasan data dalam rentang sembilan puluh hari.

Filter periode digunakan untuk meninjau aktivitas website dalam rentang waktu yang berbeda. Pengguna dapat membandingkan kondisi trafik dan minat pengunjung secara umum berdasarkan periode yang dipilih.

### Tombol Perbarui

Tombol Perbarui memuat ulang seluruh data Dasbor. Selama proses berjalan, ikon berputar dan tombol tidak dapat ditekan. Dasbor tidak menyediakan tombol unduh atau ekspor.

Apabila data belum mencerminkan aktivitas terkini, tekan tombol ini untuk meminta data kembali. Hasilnya tetap bergantung pada data yang tercatat pada saat permintaan dilakukan.

### Tombol Analitik Lengkap

Tombol **Analitik Lengkap** mengarahkan pengguna ke halaman Analitik Publik untuk melihat informasi analitik yang disediakan secara lebih terperinci.

URL: https://internal.matexindo.com/public-analytics

Dasbor digunakan untuk memperoleh gambaran umum secara cepat, sedangkan halaman Analitik Publik digunakan ketika pengguna memerlukan pemeriksaan lebih lanjut terhadap data aktivitas website.

## Kartu Ringkasan Operasional

Pada bagian atas Dasbor terdapat lima kartu ringkasan yang menyajikan indikator utama aktivitas website. Kartu-kartu ini berfungsi sebagai informasi visual untuk membantu pengguna memahami kondisi website secara cepat dan tidak dapat diklik untuk membuka halaman lain.

Indikator yang ditampilkan meliputi:

- **Aktif Sekarang:** menunjukkan aktivitas pengunjung yang terdeteksi dalam lima menit terakhir.
- **Pengunjung:** menunjukkan jumlah sesi pengunjung anonim dalam rentang waktu yang dipilih.
- **Page View:** menunjukkan jumlah tampilan halaman yang tercatat selama rentang waktu yang dipilih.
- **Klik Keluar:** menunjukkan jumlah klik pada tautan eksternal, termasuk tautan menuju marketplace atau kanal lain di luar website MATEX.
- **Pesan Terkirim:** jumlah pengiriman formulir kontak yang tercatat oleh sistem analitik (bukan jumlah baris pada tabel pesan). Teks di bawah angka berbentuk "N% dari form yang mulai diisi", yaitu pesan terkirim dibagi formulir yang mulai diisi. Angka ini dapat berbeda dari "Pesan Hari Ini" karena sumber dan periodenya berbeda, dan akan nol bila pencatatan pengunjung belum aktif.

Nilai pada setiap kartu bersifat dinamis dan dapat berubah mengikuti aktivitas website, rentang waktu yang dipilih, serta data yang berhasil dicatat oleh sistem.

## Grafik Trafik Publik: Pengunjung dan Page View

Di bawah kartu ringkasan terdapat grafik **Pengunjung dan Page View** yang menggambarkan aktivitas website publik selama periode yang dipilih.

Grafik ini menggunakan dua indikator:

- **Batang kuning-oranye — Page View:** menunjukkan jumlah halaman yang dibuka.
- **Batang biru keabuan — Pengunjung:** menunjukkan jumlah sesi pengunjung yang tercatat. Bila ragu, lihat legenda warna pada grafik.

Melalui grafik tersebut, pengguna dapat mengamati perubahan aktivitas website dari waktu ke waktu, termasuk periode dengan peningkatan atau penurunan trafik.

Sebagai contoh, peningkatan page view dapat menunjukkan bertambahnya aktivitas penjelajahan halaman. Namun, peningkatan tersebut tidak selalu berarti jumlah pengunjung baru bertambah dalam proporsi yang sama karena satu pengunjung dapat membuka beberapa halaman dalam satu sesi.

Seluruh Dasbor (kartu, kesiapan konten, dan tabel) diperbarui otomatis setiap 30 detik di latar belakang, tanpa indikator pemuatan. Pada kaki grafik tertulis "Otomatis diperbarui setiap 30 detik" dan "Terakhir masuk: tanggal dan jam" (waktu event terakhir) atau "belum ada event". Interval tersebut tidak menjamin bahwa seluruh data sumber sudah berubah pada setiap siklus.

Apabila pengguna memerlukan informasi yang lebih terkini, tombol **Perbarui** dapat digunakan untuk meminta pengambilan data kembali.

## Kesiapan Konten — Yang Perlu Diperhatikan

Bagian **Kesiapan Konten** menyajikan ringkasan kondisi konten yang dikelola melalui platform internal. Bagian ini membantu pengguna memantau jumlah produk, artikel, FAQ aktif, dan pesan yang diterima melalui formulir kontak publik.

Pada versi 1.0.10, bagian ini menampilkan empat indikator berikut.

### Produk

Angka besar menunjukkan total produk yang belum dihapus; teks di bawahnya merinci jumlah yang terbit dan yang berstatus draft ("X terbit · Y draft").

Contoh data saat dokumentasi dibuat:

- 53 produk terbit.
- 0 produk berstatus draft.

Informasi ini membantu pengguna memantau jumlah produk yang sudah tersedia pada katalog publik dan mengidentifikasi produk yang masih memerlukan penyelesaian sebelum diterbitkan.

Tautan terkait: Pengelolaan Produk

### Artikel

Angka besar menunjukkan total artikel yang belum dihapus; teks di bawahnya berbentuk "X terbit · Y perlu ditinjau". Yang dihitung "perlu ditinjau" adalah artikel berstatus draf dan terjadwal.

Contoh data saat dokumentasi dibuat:

- 4 artikel terbit.
- 0 artikel perlu ditinjau.

Informasi ini dapat digunakan untuk memantau aktivitas publikasi dan mengidentifikasi artikel yang masih memerlukan pemeriksaan atau tindak lanjut.

Tautan terkait: Pengelolaan Artikel

### FAQ Aktif

Menampilkan jumlah FAQ aktif yang tersedia untuk membantu menjawab pertanyaan pengunjung website publik.

FAQ yang dikelola dengan baik dapat membantu pengunjung memperoleh informasi dasar mengenai MATEX dan produknya tanpa harus selalu menghubungi pihak internal.

Tautan terkait: Pengelolaan FAQ

### Pesan Hari Ini

Menampilkan jumlah pesan yang diterima melalui formulir kontak pada website publik MATEX (https://matexindo.com/kontak) pada hari ini. Hari dihitung menurut tanggal UTC sehingga hitungannya berganti pukul 07.00 WIB, bukan tengah malam WIB.

Formulir tersebut digunakan oleh pengunjung untuk mengirimkan pertanyaan, permintaan informasi, maupun pesan terkait MATEX. Informasi yang dapat dikirimkan melalui formulir meliputi:

- Nama pengirim (wajib diisi).
- Email pengirim. Salah satu dari email atau nomor telepon wajib diisi.
- Nomor telepon.
- Topik pesan. Pilihan bawaan adalah Informasi Produk, Penawaran & Pembelian, Kemitraan & Kerja Sama, serta Lainnya; daftar ini dapat diubah melalui halaman Pengaturan Kontak.
- Isi pesan atau penjelasan mengenai kebutuhan pengirim (wajib diisi).
- Persetujuan penggunaan data untuk keperluan menanggapi pesan (wajib disetujui).

Pesan yang berhasil dikirim melalui formulir tersebut akan diteruskan ke email resmi, yaitu **info@matexindo.com**, dengan **formcontact@matexindo.com** sebagai alamat pengirim email.

Oleh karena itu, pengguna yang bertanggung jawab menangani komunikasi dan pertanyaan dari calon pelanggan diharapkan memeriksa kotak masuk email info@matexindo.com secara berkala, termasuk folder spam atau junk. Setiap pesan juga disimpan oleh sistem dengan nomor referensi MSG-<nomor>; bila pengiriman email gagal, pesan tetap tersimpan tetapi emailnya tidak terkirim. Pengiriman dari satu alamat IP dibatasi 5 kali per 15 menit.

Indikator pada Dasbor berfungsi sebagai ringkasan jumlah pesan yang tercatat oleh sistem, sedangkan pemeriksaan isi pesan dan tindak lanjut kepada pengirim dilakukan melalui email.

Setiap indikator pada bagian Kesiapan Konten dapat digunakan sebagai pintasan menuju halaman pengelolaan terkait. Dengan demikian, pengguna dapat beralih dari ringkasan Dasbor ke halaman yang diperlukan tanpa harus mencari menu tersebut secara manual melalui Sidebar.

Nilai yang ditampilkan pada bagian ini bersifat dinamis dan dapat berubah ketika data produk, artikel, FAQ, atau pesan diperbarui.

## Minat Pengunjung — Halaman Teratas

Bagian **Minat Pengunjung** menampilkan daftar halaman website yang memiliki aktivitas kunjungan tertinggi berdasarkan data analitik yang tersedia.

Informasi disajikan dalam bentuk tabel dengan tiga kolom utama:

- **Halaman:** menunjukkan alamat atau rute halaman website yang tercatat.
- **Pengunjung:** menunjukkan jumlah sesi pengunjung yang berkaitan dengan halaman tersebut sesuai perhitungan sistem.
- **View:** menunjukkan jumlah tampilan halaman (page view) yang tercatat.

Bagian ini membantu pengguna memahami halaman yang paling banyak diakses oleh pengunjung. Informasi tersebut dapat digunakan sebagai bahan evaluasi untuk menentukan konten yang perlu dipertahankan, diperbarui, atau dikembangkan lebih lanjut.

Sebagai contoh, apabila halaman katalog memperoleh aktivitas kunjungan yang tinggi, pengguna dapat mengevaluasi kelengkapan informasi produk, struktur kategori, dan kemudahan navigasi menuju halaman detail produk.

Data halaman teratas tidak secara langsung menunjukkan jumlah transaksi atau keberhasilan penjualan. Penilaian terhadap hasil bisnis memerlukan indikator tambahan yang sesuai dengan proses penjualan MATEX.

## Akuisisi — Sumber Trafik

Bagian **Akuisisi** menampilkan sumber trafik yang mengarahkan pengunjung ke website MATEX berdasarkan informasi yang berhasil dicatat oleh sistem.

Sumber trafik ditampilkan sebagai nama situs asal pengunjung (domain perujuk), maksimal 10 sumber teratas, diurutkan menurut jumlah page view. Angka di samping nama sumber adalah jumlah page view dari sumber itu, bukan jumlah orang.

- **Direct:** kunjungan tanpa informasi asal, misalnya mengetik alamat langsung, membuka dari aplikasi pesan, atau informasi asal diblokir browser.
- Nama situs perujuk, termasuk mesin pencari dan media sosial, muncul apa adanya sebagai nama domain (misalnya www.google.com). Sistem tidak mengelompokkannya ke kategori seperti "Mesin pencari" atau "Media sosial".
- **Domain atau situs perujuk lainnya:** kunjungan yang terdeteksi berasal dari domain lain, termasuk perpindahan dari halaman atau situs yang merujuk ke website MATEX.

Informasi sumber trafik dapat digunakan untuk memahami asal kunjungan dan menjadi bahan evaluasi terhadap aktivitas publikasi, navigasi website, serta strategi pemasaran digital.

Pengguna perlu memahami bahwa klasifikasi sumber trafik bergantung pada mekanisme pencatatan yang diterapkan. Oleh karena itu, data tersebut sebaiknya dibaca sebagai indikator analitik dan tidak selalu dapat digunakan untuk menyimpulkan keseluruhan sumber kunjungan secara mutlak.

## Pembaruan dan Interpretasi Data Dasbor

Data pada Dasbor bersifat dinamis dan dapat berubah mengikuti aktivitas website serta proses pencatatan dan pengambilan data oleh sistem.

Pembaruan dapat berlangsung secara otomatis sesuai mekanisme yang diterapkan pada setiap komponen. Namun, dalam kondisi tertentu, data terbaru mungkin belum langsung terlihat karena keterlambatan pencatatan, pemrosesan, atau pengambilan data dari sumbernya.

Apabila informasi yang ditampilkan belum mencerminkan kondisi terbaru, pengguna dapat memilih rentang waktu yang sesuai, menekan tombol **Perbarui**, atau memuat ulang halaman apabila diperlukan.

Pengguna juga perlu memahami bahwa data analitik merupakan indikator pendukung pengambilan keputusan, bukan kesimpulan bisnis yang berdiri sendiri. Perubahan trafik, tampilan halaman, atau klik tautan eksternal perlu ditafsirkan berdasarkan konteks aktivitas pemasaran, publikasi konten, dan kebutuhan bisnis MATEX.

- **Pita informasi "Pencatatan pengunjung belum diaktifkan".** Bila pita ini muncul, angka akan nol karena pencatatan pengunjung belum dinyalakan di server. Ini bukan kerusakan.
- **Pesan "Data belum termuat"** dengan tombol **Coba lagi** muncul bila server tidak dapat dihubungi atau akun tidak memiliki izin dashboard.view.
- **Bahasa.** Teks Dasbor selalu Bahasa Indonesia walaupun bahasa panel diganti ke English.
- **Batas hari.** Rentang tanggal dihitung dari browser, sedangkan server memotong data per hari UTC; batas hari dapat bergeser sekitar 7 jam dari waktu WIB.
