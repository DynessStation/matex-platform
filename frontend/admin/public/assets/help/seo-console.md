# Halaman SEO dan Mesin Pencari

> **Untuk apa:** memantau kemunculan website di Google (Search Console) dan menguji kecepatan halaman (PageSpeed).
> **Izin yang dibutuhkan:** dashboard.view.
> **Perlu diperhatikan:** data Google tertunda sekitar 3 hari; audit PageSpeed memakai kuota, jangan ditekan berulang-ulang; audit selalu menguji halaman beranda.

## Gambaran Umum

Halaman **SEO & Mesin Pencari** digunakan untuk memantau performa website publik MATEX, yaitu https://matexindo.com, pada hasil pencarian Google serta menjalankan audit performa halaman website.

Halaman ini membantu pengguna memahami bagaimana website ditemukan melalui mesin pencari, seberapa sering halaman website ditampilkan, berapa banyak klik yang diperoleh, serta bagaimana performa website berdasarkan pengujian teknis.

Terdapat dua fungsi utama pada halaman ini:

- **Google Search Console:** menampilkan data performa website dari hasil pencarian Google.
- **PageSpeed & Lighthouse:** menjalankan audit teknis untuk mengevaluasi performa halaman pada perangkat seluler maupun desktop.

Kedua fungsi tersebut memiliki tujuan dan sumber data yang berbeda. Data Search Console berkaitan dengan performa website pada hasil pencarian, sedangkan audit PageSpeed & Lighthouse merupakan hasil pengujian teknis terhadap halaman website.

## Pemilihan Rentang Waktu dan Pembaruan Data

Pada bagian atas halaman, tersedia pilihan rentang waktu dan tombol **Perbarui**.

- **7 Hari:** menampilkan data performa pencarian untuk rentang waktu tujuh hari.
- **28 Hari:** menampilkan data performa pencarian untuk rentang waktu dua puluh delapan hari.
- **90 Hari:** menampilkan data performa pencarian untuk rentang waktu sembilan puluh hari.
- **Perbarui:** memuat ulang data dari Google. Tombol ini tidak meminta Google memperbarui datanya.

Pengguna dapat memilih rentang waktu sesuai kebutuhan analisis. Rentang waktu yang lebih pendek berguna untuk memantau perkembangan terbaru, sedangkan rentang yang lebih panjang dapat membantu melihat pola performa pencarian.

Catatan: data Google Search Console tidak realtime. Tanggal akhir selalu hari ini dikurangi 3 hari dan hanya data final yang diambil, sehingga aktivitas 3 hari terakhir tidak tampil. Contoh: rentang 28 hari berarti 28 hari yang berakhir 3 hari lalu.

## Status Koneksi Search Console

Bagian ini berupa satu strip ringkas. Bila terhubung, tampil teks tebal "Search Console terhubung", baris "properti · akses tingkat", dan di sisi kanan rentang tanggal data (TTTT-BB-HH – TTTT-BB-HH).

Informasi yang dapat ditampilkan meliputi:

- **Status koneksi:** tulisan "Search Console terhubung".
- **Properti:** nama properti Search Console, misalnya sc-domain:matexindo.com; properti jenis domain mencakup http, https, dan semua subdomain.
- **Tingkat akses:** misalnya SiteFullUser (pengguna penuh properti); bila kosong tampil "read-only".
- **Rentang tanggal data:** periode data yang sedang ditampilkan.

Sebagai contoh simulasi, bagian ini dapat menampilkan status **Search Console Terhubung**, properti domain sc-domain:matexindo.com, jenis akses SiteFullUser, serta rentang tanggal data yang tersedia.

Informasi tersebut hanya ilustrasi. Status, nama properti, jenis akses, dan rentang tanggal yang sebenarnya mengikuti konfigurasi integrasi serta data yang dikembalikan oleh sistem.

Bila belum terhubung, yang tampil adalah panel "Belum terhubung — Hubungkan Google Search Console" berisi tiga langkah penyiapan (membuat service account Google, mengaktifkan Search Console API, lalu menambahkan email service account sebagai pengguna properti). Kartu metrik dan tabel tidak tampil pada kondisi ini. Penyiapan dilakukan oleh developer, bukan oleh admin biasa.

## Ringkasan Metrik Performa

Bagian ini menyajikan empat metrik utama dari Google Search Console berdasarkan rentang waktu yang dipilih.

- **Klik Google:** jumlah klik yang diperoleh website dari hasil pencarian Google. Metrik ini menunjukkan berapa kali pengguna mengeklik hasil pencarian yang mengarah ke website.
- **Impresi:** jumlah kemunculan tautan website pada hasil pencarian Google yang tercatat oleh Search Console.
- **CTR rata-rata (Click-Through Rate):** persentase klik dibandingkan impresi, dihitung klik ÷ impresi dan ditampilkan satu angka desimal.
- **Posisi rata-rata:** peringkat rata-rata di hasil pencarian Google (1 berarti teratas; angka lebih kecil lebih baik), dihitung sebagai rata-rata berbobot impresi. Nilai ini bukan jaminan posisi tetap untuk setiap pengguna atau setiap pencarian.

Contoh simulasi: apabila website memperoleh 1 klik dari 1 impresi, CTR yang ditampilkan dapat mencapai 100%. Posisi rata-rata dapat ditampilkan sebesar 1,0 apabila data yang tersedia menghasilkan nilai tersebut.

Angka di atas hanya contoh untuk menjelaskan cara membaca metrik. Data aktual dapat berubah sesuai rentang waktu, aktivitas pencarian, halaman yang muncul, dan ketersediaan data Search Console.

Perlu diperhatikan bahwa CTR yang tinggi pada jumlah impresi yang sangat sedikit belum cukup untuk menyimpulkan bahwa performa SEO website secara keseluruhan sudah baik. Metrik perlu dibaca bersama-sama dan dievaluasi berdasarkan data dalam periode yang memadai.

## Kueri dan Halaman Teratas

Bagian ini membantu pengguna memahami kata kunci pencarian yang berhubungan dengan website serta halaman yang memperoleh performa dari hasil pencarian Google.

### Kueri Teratas

Bagian **Kueri Teratas** menampilkan kueri atau kata kunci yang digunakan pengguna ketika melakukan pencarian di Google dan menghasilkan data performa untuk website MATEX.

Tabel Kueri teratas menampilkan 10 baris yang diurutkan menurut klik, dengan kolom Kueri, Klik, Impresi, CTR, dan Posisi. Informasi ini membantu memahami topik atau istilah yang berkaitan dengan kemunculan website pada hasil pencarian.

Jika belum ada data kueri yang dapat ditampilkan, sistem dapat menampilkan keterangan bahwa data belum tersedia. Kondisi tersebut tidak selalu berarti website sama sekali tidak muncul di Google; ketersediaan data juga dapat dipengaruhi oleh periode yang dipilih, pemrosesan data, dan pembatasan pelaporan Search Console.

### Halaman Teratas

Bagian **Halaman Teratas** menyajikan daftar halaman website berdasarkan performanya pada hasil pencarian Google. Kolom yang ditampilkan meliputi:

- **Klik:** jumlah klik dari hasil pencarian Google menuju halaman terkait.
- **Impresi:** jumlah kemunculan halaman pada hasil pencarian yang tercatat.
- **CTR:** rasio klik dibandingkan impresi.
- **Posisi:** posisi rata-rata halaman pada hasil pencarian berdasarkan data Search Console.

Contoh alamat halaman yang dapat muncul dalam tabel adalah:

- https://matexindo.com/
- http://matexindo.com/

Alamat tersebut hanya contoh. Halaman yang ditampilkan dan nilai setiap metrik mengikuti data aktual yang dikembalikan oleh Search Console.

Jika versi HTTP dan HTTPS muncul sebagai baris berbeda, pengguna dapat meminta pengelola sistem memeriksa konfigurasi URL, pengalihan menuju HTTPS, serta konsistensi URL kanonis. Kemunculan kedua alamat tidak dengan sendirinya membuktikan adanya masalah SEO, tetapi dapat menjadi alasan untuk melakukan pemeriksaan lebih lanjut.

## PageSpeed & Lighthouse — Audit Performa Website

Bagian **PageSpeed & Lighthouse** digunakan untuk menjalankan audit teknis website melalui layanan pengujian Google PageSpeed Insights yang menggunakan Lighthouse.

Berbeda dengan data Search Console yang merangkum performa pencarian pada periode tertentu, audit ini menghasilkan laporan pengujian berdasarkan URL dan jenis perangkat yang dipilih.

Tersedia dua pilihan audit:

- **Audit Mobile:** menjalankan pengujian performa halaman dengan konfigurasi perangkat seluler.
- **Audit Desktop:** menjalankan pengujian performa halaman dengan konfigurasi perangkat komputer.

Setelah audit selesai, tampil empat skor 0–100: Performance, Accessibility, Best practices, dan SEO. Kartu diberi warna menurut skor (90 ke atas baik; 50–89 perlu perbaikan; di bawah 50 buruk). Di bawahnya tertera strategi (mobile/desktop), alamat yang diuji, dan tanggal audit. Metrik rinci seperti LCP, INP, dan CLS tidak ditampilkan pada layar ini.

Hasil audit dapat digunakan sebagai bahan evaluasi untuk menentukan apakah halaman memerlukan perbaikan, seperti optimasi ukuran gambar, pengurangan beban JavaScript, atau peningkatan kecepatan pemuatan halaman.

**Hal yang perlu diperhatikan sebelum menjalankan audit:**

1. Audit selalu dijalankan pada halaman beranda website (matexindo.com); aplikasi tidak menyediakan pilihan halaman lain.
2. Pilih jenis perangkat sesuai kebutuhan pengujian.
3. Tunggu hingga proses selesai (maksimal 60 detik). Selama audit berjalan kedua tombol nonaktif dan tombol yang diklik menampilkan ikon berputar.
4. Jika diperlukan, bandingkan hasil audit mobile dan desktop untuk mengetahui perbedaan performanya.
5. Hindari menjalankan audit berulang kali tanpa kebutuhan karena setiap permintaan dapat menggunakan kuota layanan API.

Hasil audit bukan representasi langsung dari seluruh pengalaman pengunjung secara real-time. Nilai pengujian dapat berubah berdasarkan kondisi pengujian, konfigurasi perangkat, kondisi jaringan, dan keadaan halaman saat diuji. Karena itu, hasil audit sebaiknya digunakan sebagai salah satu acuan evaluasi, bukan satu-satunya ukuran kualitas website.

- Bila tombol audit nonaktif, tampil catatan agar API key PageSpeed ditambahkan pada environment server; ini dilakukan developer.
- Bila muncul "Data belum termuat" dengan tombol Coba lagi, ulangi satu kali; bila tetap gagal, laporkan ke developer. Pesan galat dari server dapat berbahasa Inggris dan ditampilkan apa adanya.

Halaman SEO & Mesin Pencari merupakan alat bantu untuk memantau performa website MATEX pada mesin pencari serta mengevaluasi kondisi teknis halaman website.

Pengguna dapat memanfaatkan data ini untuk:

- Memantau perkembangan klik dan impresi dari Google.
- Memahami kata kunci dan halaman yang memperoleh performa pencarian.
- Mengidentifikasi kemungkinan ketidakkonsistenan URL yang perlu diperiksa.
- Mengevaluasi performa halaman melalui audit mobile dan desktop.
- Menentukan prioritas perbaikan website berdasarkan data yang tersedia.

Seluruh data pada halaman bersifat dinamis. Hasilnya bergantung pada rentang waktu yang dipilih, ketersediaan data Search Console, status integrasi, serta hasil audit yang dijalankan. Angka pada contoh dalam manual ini hanya simulasi dan bukan laporan aktual MATEX.

**Kendala yang diketahui (diperbaiki pada versi 1.1):** nama properti Search Console tampil dengan huruf kapital (Sc-Domain:Matexindo.Com). Ini hanya tampilan; properti yang terhubung tetap sc-domain:matexindo.com.
