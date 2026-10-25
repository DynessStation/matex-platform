# Halaman Analitik Publik

> **Untuk apa:** membaca perilaku pengunjung website secara lebih rinci (trafik, sumber, halaman populer, performa, formulir kontak).
> **Izin yang dibutuhkan:** dashboard.view.
> **Perlu diperhatikan:** data bersifat anonim dan hanya mencakup pengunjung yang tercatat; jangan menyamakan angka ini dengan laporan penjualan.

## Gambaran Umum

Halaman Analitik Publik merupakan pengembangan dari fitur analitik pada halaman Dasbor. Jika Dasbor menampilkan ringkasan kondisi website publik MATEX, halaman ini menyajikan informasi yang lebih terperinci mengenai perilaku pengunjung, tren trafik, pengalaman pengguna, sumber trafik, serta interaksi pengunjung dengan formulir kontak.

Data analitik menggunakan pendekatan first-party analytics untuk membantu MATEX memahami aktivitas pengunjung pada website tanpa menyimpan alamat IP mentah.

Pada bagian atas halaman, tersedia filter periode dan tombol Perbarui. Pengguna dapat memilih rentang waktu yang ingin dianalisis, kemudian memperbarui tampilan untuk melihat data sesuai periode tersebut.

- Pilihan rentang: **7 hari**, **30 hari** (bawaan), atau **90 hari**. Rentang lebih dari 90 hari ditolak sistem; tidak ada pemilih tanggal bebas.
- Halaman memuat ulang dirinya sendiri setiap 30 detik; tombol **Perbarui** memuat ulang seketika.
- "Sesi anonim" berarti nomor acak yang disimpan di tab browser (sessionStorage); nomor ini hilang saat tab atau browser ditutup, sehingga orang yang sama dapat terhitung sebagai pengunjung berbeda.
- Bila pencatatan belum diaktifkan, halaman menampilkan pita "Pencatatan pengunjung belum diaktifkan" dan angkanya nol.

## Ringkasan Analitik

Bagian ini menampilkan kartu ringkasan yang serupa dengan halaman Dasbor, tetapi digunakan sebagai bagian dari analisis trafik yang lebih mendalam.

- **Aktif Sekarang:** jumlah pengunjung yang terdeteksi aktif dalam lima menit terakhir.
- **Pengunjung:** jumlah sesi anonim unik pada periode yang dipilih. Angka ini bukan jumlah identitas individu yang telah diverifikasi.
- **Page View:** total halaman yang dibuka atau dilihat selama periode terpilih.
- **Klik Keluar:** jumlah klik menuju marketplace atau tautan eksternal yang tercatat oleh sistem.
- **Pesan Terkirim:** jumlah formulir kontak yang berhasil dikirim. Teks di bawahnya berbentuk "N% konversi form" (terkirim dibagi mulai diisi). Nilainya selalu tampil (0% bila belum ada yang mulai mengisi) dan dapat melebihi 100% karena kedua kejadian dicatat terpisah.

**Contoh simulasi:** kartu analitik dapat menampilkan 1 pengunjung aktif, 38 pengunjung, 134 page view, 3 klik keluar, dan 2 pesan terkirim dengan rasio penyelesaian formulir sebesar 67%. Angka tersebut hanya ilustrasi; data aktual akan berubah mengikuti aktivitas pengunjung dan periode yang dipilih.

## Tren Trafik

Bagian **Tren Trafik** menampilkan grafik yang membandingkan jumlah pengunjung dengan jumlah page view selama periode yang dipilih.

Grafik menggunakan dua indikator:

- **Kuning-oranye — Page View:** menunjukkan jumlah halaman yang dibuka.
- **Biru keabuan — Pengunjung:** menunjukkan jumlah sesi anonim yang tercatat. Grafik berupa batang berpasangan per hari; arahkan kursor untuk melihat angka ("N page view, N pengunjung").

Grafik ini membantu pengguna mengamati perubahan trafik dari waktu ke waktu, misalnya ketika terjadi peningkatan kunjungan setelah artikel baru diterbitkan atau halaman produk diperbarui.

Perlu diperhatikan bahwa jumlah page view dapat lebih tinggi daripada jumlah pengunjung karena satu pengunjung dapat membuka beberapa halaman dalam satu sesi.

## Pengalaman Pengguna Nyata — Core Web Vitals

Bagian **Pengalaman Pengguna Nyata** menampilkan metrik Core Web Vitals berdasarkan data performa yang dikumpulkan dari browser pengunjung selama rentang waktu terpilih.

Metrik ini membantu mengevaluasi pengalaman pengguna saat membuka dan berinteraksi dengan website MATEX.

- **LCP (Largest Contentful Paint):** mengukur waktu yang diperlukan hingga elemen konten utama terlihat. Nilai yang lebih rendah umumnya menunjukkan pemuatan konten utama yang lebih cepat.
- **INP (Interaction to Next Paint):** mengukur responsivitas halaman terhadap interaksi pengguna. Nilai yang lebih rendah menunjukkan respons yang lebih cepat.
- **CLS (Cumulative Layout Shift):** mengukur pergeseran tata letak yang tidak terduga selama halaman dimuat atau digunakan. Nilai yang lebih rendah menunjukkan tampilan yang lebih stabil.

Setiap kartu menampilkan nilai rata-rata (LCP dan INP dalam milidetik, CLS tiga angka desimal), jumlah sampel, dan persentase sampel yang masuk kategori baik: LCP ≤ 2.500 ms, INP ≤ 200 ms, CLS ≤ 0,1. Perhatikan bahwa nilainya adalah rata-rata biasa, bukan persentil ke-75 seperti standar Google, sehingga dapat berbeda dari laporan PageSpeed. Data hanya muncul bila browser pengunjung mendukung pengukuran Web Vitals; bila kosong tampil keterangan bahwa data menunggu analytics production aktif.

Contoh simulasi:

| Metrik | Sampel | Nilai rata-rata contoh | Acuan kategori baik |
| --- | --- | --- | --- |
| LCP | 48 | 1.253 ms | ≤ 2.500 ms |
| INP | 26 | 162 ms | ≤ 200 ms |
| CLS | 47 | 0,214 | ≤ 0,1 |

Pada ilustrasi tersebut, LCP dan INP berada di bawah ambang batas kategori baik. Sebaliknya, CLS sebesar 0,214 menunjukkan bahwa stabilitas tampilan masih perlu diperhatikan. Persentase kategori baik yang ditampilkan pada halaman merupakan indikator tambahan dan tidak selalu dapat disimpulkan hanya dari nilai rata-rata.

Angka sampel, nilai pengukuran, dan persentase pada tabel hanya contoh. Data aktual bergantung pada pengumpulan metrik dari browser pengunjung.

## Funnel Kontak

Bagian **Funnel Kontak** menunjukkan perjalanan pengunjung dari mulai mengisi formulir kontak hingga formulir berhasil dikirim.

Indikator yang ditampilkan meliputi:

- **Mulai Mengisi:** jumlah aktivitas awal pengisian formulir yang berhasil tercatat.
- **Berhasil Terkirim:** jumlah formulir yang berhasil dikirim.
- **Rasio Penyelesaian Formulir:** persentase perbandingan jumlah formulir yang berhasil dikirim terhadap jumlah aktivitas mulai mengisi formulir yang tercatat.

Contoh simulasi: apabila terdapat 3 aktivitas mulai mengisi formulir dan 2 formulir berhasil terkirim, rasio penyelesaiannya adalah sekitar 67%.

Informasi ini dapat digunakan untuk mengevaluasi apakah formulir kontak sudah cukup mudah digunakan. Jika banyak pengunjung mulai mengisi tetapi sedikit yang menyelesaikan pengiriman, MATEX dapat mempertimbangkan evaluasi terhadap susunan kolom, kejelasan instruksi, maupun pengalaman pengisian formulir.

Rasio tersebut bergantung pada aktivitas yang berhasil direkam sistem. Angka ini tidak otomatis menjelaskan alasan pengunjung membatalkan pengisian formulir.

## Akuisisi — Sumber Trafik

Bagian Akuisisi memperlihatkan sumber trafik yang membawa pengunjung ke website MATEX, maksimal 10 sumber teratas. Angka di samping nama sumber adalah jumlah page view dari sumber itu (bukan jumlah kunjungan), dan sumber diambil dari nama situs asal (referrer) saja; parameter UTM tidak ditampilkan.

Contoh sumber trafik yang dapat ditampilkan antara lain:

- **Direct:** kunjungan yang tidak memiliki informasi sumber rujukan yang dapat dikenali oleh sistem.
- **www.google.com:** kunjungan yang tercatat berasal dari Google.
- **matexindo.com:** kunjungan dengan informasi rujukan dari domain tersebut, jika tercatat oleh sistem.

Contoh simulasi: Direct sebanyak 117, www.google.com sebanyak 15, dan matexindo.com sebanyak 2 kunjungan tercatat.

Angka tersebut hanya ilustrasi. Sumber trafik yang muncul dan jumlahnya mengikuti data aktual serta informasi rujukan yang tersedia. Kunjungan tanpa informasi rujukan tidak selalu berarti pengunjung mengetik alamat website secara langsung; kondisi tersebut juga dapat terjadi karena keterbatasan data rujukan pada browser atau jalur kunjungan tertentu.

Progress bar berfungsi sebagai visualisasi perbandingan jumlah trafik antar-sumber, bukan indikator kualitas atau tingkat konversi sumber tersebut.

## Lokasi Agregat

Bagian Lokasi Agregat menampilkan kode negara dua huruf (misalnya ID atau US) beserta jumlah pengunjung unik, 10 teratas.

Kode negara hanya terisi bila server diatur memercayai header negara dari perantara jaringan tepercaya (trusted proxy, misalnya Cloudflare). Bila belum, tampil keterangan "Lokasi akan tampil setelah trusted proxy negara diaktifkan.".

Lokasi yang ditampilkan bersifat agregat, bukan pelacakan alamat rumah atau lokasi presisi setiap pengunjung. Ketersediaan dan ketepatan informasi bergantung pada konfigurasi infrastruktur serta data lokasi yang diterima sistem.

## Minat Pengunjung — Halaman Teratas

Bagian **Minat Pengunjung** menampilkan halaman website yang paling banyak dikunjungi selama periode yang dipilih. Tabel ini membantu pengguna mengetahui konten yang paling sering dilihat oleh pengunjung.

Kolom yang tersedia meliputi:

- **Halaman:** alamat path halaman pada website, misalnya /, /katalog, atau /kontak. Versi bahasa Inggris berawalan /en dan tampil sebagai baris terpisah. Query string dan hash dibuang; path yang berbeda (misalnya / dan /home) dihitung terpisah.
- **Distribusi View:** visualisasi perbandingan jumlah page view antarhalaman.
- **Pengunjung:** jumlah pengunjung atau sesi anonim yang tercatat pada halaman tersebut sesuai definisi sistem.
- **Page View:** jumlah pembukaan halaman yang tercatat.

Contoh simulasi tabel halaman teratas:

| Halaman | Pengunjung | Page View |
| --- | --- | --- |
| / (alias: /home) | 29 | 55 |
| /katalog | 10 | 18 |
| /kontak | 8 | 14 |
| /tentang-matex | 8 | 11 |
| /artikel | 4 | 9 |
| /search | 4 | 5 |
| /kategori/latex-mattress | 2 | 4 |
| /en | 2 | 3 |
| /artikel/kelebihan-kasur-latex | 2 | 2 |
| /en/product/recon-mattress-180-200-8 | 1 | 2 |

Tabel di atas hanya contoh simulasi untuk menjelaskan cara membaca data. Jumlah pengunjung dan page view pada setiap halaman akan berubah mengikuti aktivitas aktual dan periode analisis. Jumlah pengunjung antarhalaman juga tidak boleh dijumlahkan begitu saja untuk dianggap sebagai jumlah pengunjung unik seluruh website, karena pengunjung yang sama dapat membuka beberapa halaman.

Halaman Analitik Publik digunakan sebagai alat bantu evaluasi website dan perilaku pengunjung, bukan sebagai laporan penjualan atau bukti bahwa seluruh pengunjung merupakan calon pembeli.

Pengguna dapat memanfaatkan informasi trafik, sumber kunjungan, halaman populer, performa website, dan penyelesaian formulir kontak untuk menentukan bagian website yang perlu diperbaiki atau dikembangkan.

Seluruh angka yang ditampilkan bersifat dinamis dan mengikuti periode yang dipilih serta data yang berhasil dikumpulkan oleh sistem. Angka-angka pada bagian contoh dalam manual ini hanya simulasi, bukan laporan aktual MATEX.

- **Saringan otomatis.** Kunjungan dari bot atau alat uji (crawler, headless, Lighthouse, PageSpeed) diabaikan; pengunjung yang mengaktifkan Do Not Track atau Global Privacy Control tidak dicatat. Dua hal ini dapat membuat angka lebih kecil dari perkiraan.
- **Retensi.** Tidak ada penghapusan otomatis data analitik; data menumpuk tanpa batas waktu.
- **Peristiwa yang dicatat:** page_view, outbound_click (klik ke domain lain, termasuk mailto dan tel), contact_start, contact_submit, dan web_vital.
- **Izin:** halaman ini membutuhkan dashboard.view. Bila gagal dimuat tampil "Data belum termuat" dan tombol Coba lagi.

**Kendala yang diketahui (diperbaiki pada versi 1.1):** angka desimal pada halaman Analitik Publik serta SEO & Mesin Pencari masih memakai titik (contoh: 0.222, 89.4%, 44.0%, 13.8), padahal acuan pada kartu memakai koma (≤ 0,1). Bacalah titik tersebut sebagai koma desimal.
