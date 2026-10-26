# Halaman Dasbor

> **Untuk apa:** melihat sekilas kunjungan website publik dan kondisi konten (produk, artikel, FAQ, pesan).
> **Izin yang dibutuhkan:** dashboard.view.
> **Perlu diperhatikan:** angka kunjungan bernilai nol selama pencatatan pengunjung belum aktif; "Pesan hari ini" dihitung per hari UTC (berganti pukul 07.00 WIB).

## Gambaran Umum

Dasbor adalah halaman pertama setelah login. Isinya ringkasan trafik website publik matexindo.com dan pintasan ke konten yang perlu diurus. Semua angka di halaman ini hanya untuk perusahaan akun Anda.

Data diperbarui otomatis setiap 30 detik di latar belakang tanpa tanda memuat. Untuk pemeriksaan lebih rinci gunakan halaman **Analitik Publik**.

URL: https://internal.matexindo.com/dashboard

## Rentang Waktu dan Tombol

Tombol di kanan atas mengatur periode data dan memuat ulang halaman.

### 7, 30, dan 90 hari

Memilih periode kartu, grafik, halaman teratas, dan sumber trafik: 7, 30, atau 90 hari terakhir termasuk hari ini. Bawaannya 30 hari.

Mengganti periode langsung memuat data baru dan tidak memakai jeda tombol Perbarui. Bagian Kesiapan Konten tidak terpengaruh periode.

### Perbarui

Memuat ulang semua data dasbor sekarang juga. Saat memuat ikonnya berputar; setelah itu tombol nonaktif dan menampilkan hitung mundur 2 menit sebelum bisa ditekan lagi.

Jeda ini tetap berjalan walaupun Anda pindah halaman atau memuat ulang browser, supaya server tidak dibebani permintaan beruntun. Tanpa menekan tombol ini pun dasbor tetap diperbarui otomatis setiap 30 detik.

### Analitik lengkap

Membuka halaman Analitik Publik, yang memuat data kunjungan lebih rinci (performa halaman, formulir kontak, negara pengunjung).

## Kartu Ringkasan

Lima kartu di bagian atas menunjukkan angka utama kunjungan pada periode terpilih. Kartu hanya informasi, tidak bisa diklik.

### Aktif sekarang

Jumlah pengunjung yang membuka halaman dalam 5 menit terakhir, tidak terpengaruh pilihan periode.

### Pengunjung

Jumlah sesi pengunjung anonim yang membuka paling sedikit satu halaman pada periode terpilih.

Sesi adalah nomor acak yang disimpan di tab browser dan hilang saat tab ditutup, jadi orang yang sama dapat terhitung lebih dari sekali bila membuka tab baru atau kembali di lain waktu. Sistem tidak menyimpan alamat IP mentah atau identitas pengunjung.

### Page view

Jumlah halaman yang dibuka pada periode terpilih. Satu pengunjung yang membuka lima halaman menghasilkan lima page view.

### Klik keluar

Jumlah klik pada tautan yang keluar dari website, misalnya tombol beli ke marketplace atau tautan media sosial.

### Pesan terkirim

Jumlah formulir kontak yang berhasil dikirim menurut pencatatan pengunjung pada periode terpilih. Persentase di bawahnya adalah pesan terkirim dibagi formulir yang mulai diisi.

Angka ini dapat berbeda dari "Pesan hari ini" di Kesiapan Konten, karena sumbernya berbeda (pencatatan pengunjung, bukan data pesan) dan periodenya juga berbeda.

## Grafik Pengunjung dan Page View

Grafik batang harian untuk periode terpilih: batang kuning-oranye untuk page view, batang biru keabuan untuk pengunjung. Arahkan kursor ke kolom untuk melihat tanggal dan jumlah page view.

Kaki grafik menampilkan "Terakhir masuk", yaitu waktu data kunjungan terakhir yang diterima, atau "belum ada event" bila belum ada sama sekali. Tanggal dihitung per hari UTC.

## Kesiapan Konten

Ringkasan jumlah konten yang dikelola di panel admin, tidak terpengaruh pilihan periode. Klik salah satu baris untuk membuka halaman pengelolaannya.

### Produk

Angka besar adalah semua produk yang belum dihapus, termasuk yang diarsipkan. Teks di bawahnya merinci jumlah yang terbit dan yang masih draft.

Hanya produk berstatus terbit yang tampil di katalog website. Baris ini membuka halaman Produk.

### Artikel

Angka besar adalah semua artikel yang belum dihapus. "Perlu ditinjau" menghitung artikel berstatus draf dan terjadwal.

Baris ini membuka halaman Artikel.

### FAQ aktif

Jumlah pertanyaan FAQ yang aktif dan tampil di website. Baris ini membuka halaman FAQ.

### Pesan hari ini

Jumlah pesan formulir kontak website yang diterima sejak awal hari ini menurut waktu UTC (pukul 07.00 WIB).

Pesan juga dikirim ke email resmi perusahaan; isi pesan dan balasannya diurus lewat email. Baris ini membuka halaman Pengaturan Kontak.

## Halaman Teratas

Sepuluh halaman website yang paling banyak dibuka pada periode terpilih, diurutkan menurut page view.

Kolom **Pengunjung** menghitung sesi yang membuka halaman itu, kolom **View** menghitung berapa kali halaman dibuka. Alamat halaman yang terlalu panjang dipotong dengan "…"; arahkan kursor untuk melihat alamat lengkapnya.

## Sumber Trafik

Sepuluh situs asal pengunjung terbanyak pada periode terpilih, diurutkan menurut page view. Angka di kanan adalah page view dari sumber itu, bukan jumlah orang.

**Direct** berarti tidak ada informasi asal, misalnya alamat diketik langsung, dibuka dari aplikasi pesan, atau browser menyembunyikan asalnya. Sumber lain tampil sebagai nama domain apa adanya (misalnya www.google.com), tanpa dikelompokkan.

## Membaca Angka Dasbor

- Pita **Pencatatan pengunjung belum diaktifkan** berarti pencatatan kunjungan masih dimatikan di server, sehingga angka kunjungan nol. Ini bukan kerusakan.
- Pesan **Data belum termuat** dengan tombol **Coba lagi** muncul bila server tidak dapat dihubungi atau akun tidak memiliki izin dashboard.view.
- Rentang tanggal dihitung dari browser, sedangkan server memotong data per hari UTC, sehingga batas hari dapat bergeser sekitar 7 jam dari WIB.
- Teks dasbor selalu berbahasa Indonesia walaupun bahasa panel diganti ke English.
- Angka kunjungan adalah indikator, bukan laporan penjualan; baca bersama kegiatan pemasaran dan publikasi yang sedang berjalan.
