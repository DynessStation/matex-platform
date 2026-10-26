# Halaman Analitik Publik

> **Untuk apa:** membaca perilaku pengunjung website lebih rinci: tren, performa halaman di browser pengunjung, formulir kontak, sumber, negara, dan halaman populer.
> **Izin yang dibutuhkan:** dashboard.view.
> **Perlu diperhatikan:** data anonim dan hanya mencakup kunjungan yang tercatat; jangan menyamakannya dengan laporan penjualan.

## Gambaran Umum

Analitik Publik adalah versi lengkap dari ringkasan trafik di Dasbor. Datanya dikumpulkan sendiri oleh website matexindo.com (first-party) tanpa menyimpan alamat IP mentah atau identitas pengunjung.

Halaman memuat ulang datanya otomatis setiap 30 detik di latar belakang. Bila pencatatan pengunjung belum diaktifkan di server, muncul pita "Pencatatan pengunjung belum diaktifkan" dan semua angka nol.

URL: https://internal.matexindo.com/public-analytics

## Rentang Waktu dan Tombol

Tombol di kanan atas mengatur periode data dan memuat ulang halaman.

### 7, 30, dan 90 hari

Memilih periode semua bagian di halaman: 7, 30 (bawaan), atau 90 hari terakhir termasuk hari ini. Tidak ada pemilih tanggal bebas.

Mengganti periode langsung memuat data baru dan tidak memakai jeda tombol Perbarui.

### Perbarui

Memuat ulang data sekarang juga. Setelah itu tombol nonaktif dengan hitung mundur 5 menit sebelum bisa ditekan lagi; jeda tetap berjalan walaupun Anda pindah halaman.

## Kartu Ringkasan

Lima kartu di bagian atas menunjukkan angka utama kunjungan pada periode terpilih.

### Aktif sekarang

Jumlah pengunjung yang membuka halaman dalam 5 menit terakhir, tidak terpengaruh pilihan periode.

### Pengunjung

Jumlah sesi anonim yang membuka paling sedikit satu halaman pada periode terpilih; bukan jumlah orang yang terverifikasi.

Sesi adalah nomor acak yang disimpan di tab browser (sessionStorage) dan hilang saat tab ditutup, jadi orang yang sama dapat terhitung lebih dari sekali.

### Page view

Jumlah halaman yang dibuka pada periode terpilih. Satu pengunjung dapat menghasilkan banyak page view.

### Klik keluar

Jumlah klik pada tautan yang keluar dari website, misalnya tombol beli ke marketplace atau tautan media sosial.

### Pesan terkirim

Jumlah formulir kontak yang berhasil dikirim pada periode terpilih. "N% konversi form" di bawahnya adalah pesan terkirim dibagi formulir yang mulai diisi.

Nilainya 0% bila belum ada yang mulai mengisi, dan dapat melebihi 100% karena "mulai mengisi" dan "terkirim" dicatat sebagai kejadian terpisah.

## Tren Trafik

Grafik batang harian untuk periode terpilih: kuning-oranye untuk page view, biru keabuan untuk pengunjung. Arahkan kursor ke kolom untuk melihat angkanya.

Page view hampir selalu lebih tinggi dari pengunjung karena satu pengunjung membuka beberapa halaman. Tanggal dihitung per hari UTC.

## Core Web Vitals

Pengukuran kecepatan dan kenyamanan halaman yang dikirim langsung oleh browser pengunjung (pengalaman nyata), dirata-rata untuk periode terpilih.

Setiap kartu menampilkan nilai rata-rata, jumlah sampel, dan persentase sampel yang masuk kategori baik. Nilainya rata-rata biasa, bukan persentil ke-75 seperti laporan Google, sehingga bisa berbeda dari hasil PageSpeed. Data hanya muncul dari browser yang mendukung pengukuran ini.

### LCP — Kecepatan konten utama

Waktu sampai konten terbesar di layar (biasanya gambar utama atau judul) terlihat. Baik bila 2.500 ms atau kurang.

### INP — Respons interaksi

Waktu yang dibutuhkan halaman untuk merespons klik, ketukan, atau ketikan pengunjung. Baik bila 200 ms atau kurang.

### CLS — Stabilitas tampilan

Seberapa banyak isi halaman bergeser sendiri saat dimuat (misalnya tombol turun karena gambar baru muncul). Baik bila 0,1 atau kurang.

## Funnel Kontak

Perjalanan pengunjung di formulir kontak website: dari mulai mengisi sampai berhasil terkirim.

### Mulai mengisi

Jumlah kali pengunjung mulai mengetik di formulir kontak pada periode terpilih.

### Berhasil terkirim

Jumlah formulir kontak yang berhasil dikirim pada periode terpilih.

### Rasio penyelesaian form

Berhasil terkirim dibagi mulai mengisi. Bila banyak yang mulai tetapi sedikit yang selesai, susunan atau petunjuk formulir mungkin perlu diperbaiki.

Angka ini tidak menjelaskan alasan pengunjung berhenti mengisi.

## Sumber Trafik

Sepuluh situs asal pengunjung terbanyak, diurutkan menurut page view. Angka di kanan adalah page view dari sumber itu, bukan jumlah orang; bilah di bawahnya hanya perbandingan antar sumber.

**Direct** berarti tidak ada informasi asal (alamat diketik langsung, dibuka dari aplikasi pesan, atau browser menyembunyikan asalnya). Sumber lain tampil sebagai nama domain apa adanya, misalnya www.google.com; parameter UTM tidak ditampilkan.

## Negara Pengunjung

Sepuluh negara dengan pengunjung terbanyak, tampil sebagai kode dua huruf (misalnya ID atau US).

Kode negara hanya terisi bila server diatur memercayai informasi negara dari perantara jaringan tepercaya (misalnya Cloudflare). Bila belum, tampil keterangan "Lokasi akan tampil setelah trusted proxy negara diaktifkan." Lokasi bersifat agregat per negara, tidak pernah lokasi tepat seseorang.

## Halaman Teratas

Halaman website yang paling banyak dibuka pada periode terpilih, diurutkan menurut page view.

- **Halaman:** alamat halaman, misalnya /, /katalog, atau /kontak. Versi English berawalan /en dan dihitung terpisah. Alamat yang terlalu panjang dipotong dengan "…"; arahkan kursor untuk melihat alamat lengkap.
- **Distribusi view:** bilah perbandingan page view antar halaman.
- **Pengunjung:** jumlah sesi yang membuka halaman itu.
- **Page view:** jumlah kali halaman dibuka.

Query string dan tanda # dibuang dari alamat, jadi /katalog?q=lateks tercatat sebagai /katalog.
