# Halaman SEO dan Mesin Pencari

> **Untuk apa:** memantau kemunculan matexindo.com di Google (Search Console) dan menguji kecepatan halaman beranda (PageSpeed).
> **Izin yang dibutuhkan:** dashboard.view.
> **Perlu diperhatikan:** data Google tertunda sekitar 3 hari; audit PageSpeed memakai kuota Google, jangan diulang-ulang tanpa perlu.

## Gambaran Umum

Halaman ini punya dua bagian dengan sumber berbeda:

- **Google Search Console:** berapa kali website muncul dan diklik di hasil pencarian Google, beserta kata kunci dan halamannya.
- **PageSpeed & Lighthouse:** audit teknis kecepatan dan kualitas halaman beranda, dijalankan saat Anda menekan tombol audit.

URL: https://internal.matexindo.com/seo-console

## Rentang Waktu dan Tombol

Tombol di kanan atas mengatur periode data Search Console dan memuat ulang halaman.

### 7, 28, dan 90 hari

Memilih periode data Search Console. Periode selalu berakhir 3 hari lalu karena Google baru memberikan data final setelah sekitar 3 hari.

Contoh: 28 hari berarti 28 hari yang berakhir 3 hari sebelum hari ini. Rentang tanggal yang dipakai tampil di sisi kanan strip status.

### Perbarui

Mengambil ulang data dari Google sekarang juga, tidak membuat Google memperbarui datanya. Setelah ditekan, tombol nonaktif dengan hitung mundur 5 menit karena kuota Google terbatas; jeda tetap berjalan walaupun Anda pindah halaman.

## Status Koneksi Search Console

Strip di atas kartu menunjukkan apakah panel sudah tersambung ke Search Console.

Bila tersambung tampil "Search Console terhubung", nama properti (misalnya sc-domain:matexindo.com, yang mencakup http, https, dan semua subdomain), tingkat aksesnya (misalnya siteFullUser; "read-only" bila kosong), dan rentang tanggal data.

Bila belum tersambung, tampil panel "Hubungkan Google Search Console" berisi langkah penyiapan untuk developer (service account Google, Search Console API, dan izin properti). Kartu dan tabel tidak tampil sampai penyiapan selesai.

## Kartu Search Console

Empat angka utama dari Google untuk periode terpilih.

### Klik Google

Jumlah klik dari hasil pencarian Google menuju website.

### Impresi

Jumlah kali tautan website tampil di hasil pencarian Google, diklik atau tidak.

### CTR rata-rata

Persentase klik dibanding impresi (klik ÷ impresi). CTR tinggi dari impresi yang sangat sedikit belum berarti SEO sudah baik.

### Posisi rata-rata

Peringkat rata-rata website di hasil pencarian; 1 berarti paling atas, makin kecil makin baik. Nilainya dirata-rata menurut impresi, bukan posisi tetap untuk setiap pencarian.

## Kueri dan Halaman Teratas

Dua tabel berisi sepuluh baris dengan klik terbanyak pada periode terpilih, masing-masing dengan kolom Klik, Impresi, CTR, dan Posisi.

### Kueri teratas

Kata kunci yang diketik orang di Google saat website muncul. Google menyembunyikan sebagian kata kunci yang jarang dicari, jadi daftar ini tidak selalu lengkap.

### Halaman teratas

Halaman website yang mendapat klik dari Google. Alamat panjang dipotong dengan "…"; arahkan kursor untuk melihat alamat lengkapnya.

Bila versi http dan https dari halaman yang sama muncul sebagai baris terpisah, minta developer memeriksa pengalihan ke https dan URL kanonis. Ini belum tentu masalah, tetapi layak diperiksa.

## PageSpeed & Lighthouse

Audit teknis halaman beranda matexindo.com memakai Google PageSpeed Insights. Audit hanya berjalan saat Anda menekan tombolnya dan selalu menguji beranda.

Selama audit berjalan (paling lama sekitar 60 detik) kedua tombol nonaktif dan tombol yang ditekan menampilkan ikon berputar. Hasilnya berupa empat skor 0–100: Performance, Accessibility, Best practices, dan SEO, dengan warna hijau untuk 90 ke atas, kuning untuk 50–89, dan merah di bawah 50. Di bawahnya tertera jenis perangkat, alamat yang diuji, dan waktu audit.

Bila tombol audit nonaktif dengan catatan tentang API key, kunci PageSpeed belum dipasang di server; ini urusan developer.

### Audit mobile

Menguji beranda seperti dibuka di ponsel dengan jaringan yang lebih lambat. Skor mobile biasanya lebih rendah dari desktop.

### Audit desktop

Menguji beranda seperti dibuka di komputer. Bandingkan dengan audit mobile untuk melihat perbedaannya.

### Membaca skor

Skor audit adalah hasil satu kali pengujian dan bisa naik turun antar percobaan karena kondisi jaringan dan server. Gunakan sebagai acuan perbaikan (misalnya ukuran gambar atau beban JavaScript), bukan satu-satunya ukuran kualitas website.

Kecepatan nyata yang dialami pengunjung ada di bagian Core Web Vitals pada halaman Analitik Publik.

## Bila Ada Kendala

- Pesan **Data belum termuat** dengan tombol **Coba lagi**: ulangi satu kali; bila tetap gagal, laporkan ke developer. Pesan galat dari Google dapat berbahasa Inggris dan ditampilkan apa adanya.
- Tabel kosong tidak selalu berarti website tidak muncul di Google; data periode pendek bisa terlalu sedikit untuk dilaporkan Google.
