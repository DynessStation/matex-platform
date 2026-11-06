# Rencana MATEX V1.2 Part 2: Produk, HPP, Harga, dan Kalkulator

Sumber: `PERAPIHAN MATEX V1.2.11A Part 2.pdf` (6 halaman), `10. KATEGORI PRODUCT MATEX - 05 NOVEMBER 2026.xlsx` (2 sheet terlihat, 2 tersembunyi), dua rekaman layar 6 November 2026, catatan pemilik di chat, dan pengecekan kode, database lokal, serta website production (hanya baca).

Status: **disetujui pemilik 6 November 2026.** Tahap 0 dan keamanan API publik dikerjakan lebih dulu; selesai ditandai di bagiannya.

## Jawaban pemilik (6 November 2026)

- **Harga yang benar: Excel,** karena itu yang dipegang leader produksi dan marketing. Importer menandai harga website yang berbeda, lalu admin menerapkannya lewat "Terapkan harga". Website tetap tidak berubah diam-diam.
- **APL 20%:** arti pastinya belum diketahui. Sistem memisahkan biaya platform, iklan, voucher, dan ongkir per kanal, dan APL tetap sebagai satu target sampai ada angka aslinya.
- **Pajak:** belum diatur, kemungkinan karena NIB belum ada. Kalkulator menampilkan "pajak belum diatur" dan bisa dihidupkan nanti.
- **Yang boleh melihat HPP:** Pemilik, Produksi, dan Marketing, lewat izin `cost.view`. Profil akses Produksi dan Marketing dibuat dengan izin ini tanpa hak admin lain.
- **Tarif per kanal:** input manual dulu.
- **API marketplace:** diminta dikaji, lihat Tahap 5.

## Keputusan utama: tidak perlu rombak total

Fondasi katalog sudah benar, jadi yang ditambah adalah lapisan di sampingnya. Tabel dan halaman publik tidak dibongkar.

| Bagian | Kondisi sekarang | Tindakan |
| --- | --- | --- |
| `product_catalog` dan i18n | Rapi, multi-bahasa, SEO, 53 produk | Dipertahankan |
| `product_category` | Sudah mendukung induk-anak (`id_parent_product_category`) | Dipakai: 9 kategori utama dan subkategorinya cukup diisi, bukan tabel baru |
| Atribut produk | Kolom tetap dan JSON spesifikasi | Ditambah tabel atribut, supaya atribut baru tidak butuh kolom baru |
| HPP dan margin | Belum ada, hanya di Excel | Tabel baru yang terpisah total dari data publik |
| Biaya marketplace dan pajak | Belum ada | Aturan disimpan sebagai data bertanggal, bukan rumus di kode |

Alasannya:

- Rombak total mengancam alamat produk, SEO, dan 277 test yang sudah lolos, padahal tim produksi dan marketing sedang buru-buru.
- Yang berubah terus adalah harga bahan, biaya platform, dan pajak. Itu paling aman dijadikan data yang bisa diubah dari admin tanpa deploy.
- Data biaya tidak boleh bocor ke website. Tabel terpisah membuat kebocoran itu mudah dicegah dan dites.

**Varian produk (satu halaman kasur dengan pilihan ukuran) ditunda.** Sekarang tiap ukuran adalah satu SKU dengan halaman sendiri, dan mengubahnya berarti membongkar halaman publik serta SEO. Lapisan biaya menempel ke SKU, jadi varian masih bisa ditambah nanti tanpa mengulang pekerjaan ini.

## Isi Excel yang menjadi dasar

**Rantai harga (sheet KATEGORI):**

```
Net MIA    = HPP / (1 - GPM)
Affiliate  = Net MIA / (1 - % affiliate)
E-commerce = Affiliate / (1 - % APL)
Grosir     = E-commerce - 5%          (sheet PRODUCT)
USD        = harga IDR / 18.000       (sheet PRODUCT)
```

Contoh baris pertama: 880.550 → 1.100.688 → 1.158.618 → 1.448.273.

**HPP (sheet DETAIL HITUNGAN dan MOCO) adalah resep bahan:** rebondid, topper atau gress, kain inner, kain outer, jasa jahit, kemasan, ongkir. Jumlah bahan banyak yang dihitung dari ukuran, misalnya kain `(2L + 5T) / 100` meter. Sheet MOCO sudah berbentuk daftar part per baris, dan bentuk itulah yang dipakai sistem.

**Ruang lingkup Excel lebih luas dari website:** 83 item berharga, sedangkan katalog 53 produk. 30 item belum punya SKU: Jok Import, Busa + Latex, Full Set, Insole, dan Moco. Kategori Hospital, Baby & Kids, serta Interior Furniture masih kosong.

**Forecast November-Desember** (Qty, Total HPP, Net MIA) kolomnya sudah ada, tetapi belum terisi.

### Yang perlu dicek tim sebelum data diimpor

Importer akan menampilkan ini sebagai laporan, bukan memperbaikinya diam-diam.

- **Harga live berbeda dari Excel.** Dari 13 produk terbit, hanya 3 yang sama. Contoh: Bantal GERD live Rp 340.255, Excel Rp 539.239 (+58,5%); Jok Motor 30x80x2,5 live Rp 83.553, Excel Rp 73.942 (-11,5%). 40 produk lain belum terbit, jadi harganya tidak terbaca dari luar dan dibandingkan saat importer jalan.
- **Nama tidak cocok untuk SKU yang sama.** `JM70…` bernama "Jok Motor Sambungan" di sheet KATEGORI, tetapi "Jok Motor 100% Latex D70" di sheet PRODUCT. `FPR406012` "Multipin Pillow Recon" lawan "Flat Recon".
- **Ukuran tidak konsisten antar sheet.** Jok Kecil 22x72 lawan 21x70; Jok Besar 29x76 lawan 25x74; Back Support 38x38 lawan 33x38; Cushion tebal 5 lawan 6.
- **Kolom M3 lima produk terapi menampilkan angka lain** (Back Support 0,83, padahal volumenya 0,0087). Asalnya kolom kg, jadi HPP tidak terpengaruh.
- **Isi kolom yang terlihat ikut ter-drag di sheet PRODUCT.** HS Code naik berurutan (`9404,21,1000`, `…1001`, `…1002`), Is Featured berisi 7 sampai 12 padahal seharusnya 0 atau 1, dan Lead Time ikut berurutan untuk Jok Motor. Lead time dan HS code di katalog perlu dicek apakah ikut salah.
- **Part Moco:** kardus Small `1 x 10.045,5` tetapi totalnya 13.000; kardus Medium `1 x 15.984` tetapi totalnya 19.700; label Large `1 x 800` tetapi totalnya 700. Ukuran Moco di sheet KATEGORI masih `??`.
- **GPM 42% dan 48%** di Jok Sambungan 1,5 cm tampak seperti hasil menyesuaikan harga, bukan target margin. Perlu dikonfirmasi.
- **Nomor dobel:** baris 19-24 muncul dua kali, kategori nomor 5 dipakai dua kali, nomor 7 tidak ada. Baris 179-181 tampak coretan lama dan tidak ikut diimpor.

## Tahap 0: Bug dan aturan visual

**Live 7 November di `deb357b`** (backup `matex-20261106T165521Z`, tanpa migration). Test: `part2-stage0.spec.ts`. Tidak mengubah database, dan bisa live paling dulu.

Keputusan saat pengerjaan: tab Umum dan Pratinjau di Halaman Website tetap ada, karena Umum menampilkan identitas halaman tetap dan Pratinjau masih berfungsi. Yang diubah di sana: judul di atas tab, titik status, dan keterangan di bawah tombol simpan dihapus. Input waktu jadi satu baris tanpa panah naik-turun.

### Bug yang penyebabnya sudah ditemukan

| No | Gejala | Penyebab | Perbaikan |
| --- | --- | --- | --- |
| B-1 | Footer di HP tidak bisa dibuka (Perusahaan, Jelajahi). Terbukti di production: judul jadi `active`, daftar tetap tersembunyi | CSS tema mencari `.active ~ * > .footer-list`, sedangkan di HTML daftarnya saudara langsung judul | Selector atau struktur HTML dibetulkan |
| B-2 | Saat koneksi lambat, seluruh form tertutup "Memuat" ketika mengetik judul (rekaman 1, mode 3G). Berlaku di Produk, Artikel, dan Kategori | Permintaan cek slug memicu loader global halaman | Cek slug memakai `SKIP_GLOBAL_LOADER`, dan disapu permintaan latar lain yang sejenis |
| B-3 | Pesan "Isi angka" muncul di baris lain yang tidak sedang diedit (rekaman 2) | Pesan error di `inline-table` tampil di semua baris | Hanya untuk baris yang sedang diedit. Berlaku untuk semua tabel G-4 |
| B-4 | Teks `undefined` di SKU dan Harga marketplace (rekaman 2) | Baris baru belum punya nilai `sku` dan `price`. `min_qty` dan `max_qty` harga Grosir punya pola yang sama | Nilai awal dilengkapi, dan komponen tidak lagi menampilkan undefined |
| B-5 | Barcode, HS Code, dan Negara menerima spasi berlebih dan simbol. Ukuran serta stok menerima angka sangat besar (Lebar 43.523 mm, stok 436 miliar) | Hanya ada aturan `min(0)`, tanpa aturan format atau batas | Validator di form dan di backend (lihat bawah) |
| B-6 | Harga Grosir bisa jauh di atas harga Konsumen tanpa peringatan (Rp 3.192.312 lawan Rp 336.033 di rekaman 2) | Belum ada pengecekan antar harga | Peringatan kuning. Tidak diblokir, karena bisa saja disengaja |
| B-7 | Browser menawarkan alamat pribadi di isian Provinsi | Autofill browser | `autocomplete="off"` untuk isian asal produk |

Aturan validator:

- Barcode dan Kode Manufaktur: huruf, angka, dan tanda hubung. Tidak diwajibkan format GTIN, karena data sekarang berisi SKU di kolom barcode.
- HS Code: angka, titik, dan koma.
- Negara, Provinsi, dan Kota: dirapikan spasinya. Nanti bisa diganti pilihan daftar.
- Batas angka: berat, ukuran, dan stok dibatasi nilai yang masuk akal, dan tidak melebihi kapasitas kolom database.

### Aturan visual dari PDF, diterapkan ke seluruh admin

- **Penanda tab:** Halaman Website dan Kantor belum memakai `app-tab-status`. Halaman Website juga memakai pola lama yang ditandai X di PDF, termasuk tab Pratinjau dan keterangan di bawah tombol simpan.
- **Input sebaris sama tinggi dan lurus:** penyapuan semua form, termasuk input Waktu (`HH:MM`) di Artikel, Kantor, dan Halaman Website, serta tombol toolbar seperti "Produk di depan".
- **Tombol "Isi otomatis" dan "Terjemahkan":** jadi tombol teks dengan ikon, tanpa kotak.
- **Toggle dan label:** sebaris rata tengah, atau label di bawah toggle. Sekarang labelnya turun separuh.
- **Teks usang:** "(belum untuk v1)" di Harga & Kanal diganti.

### Website di HP (PDF halaman 5)

"Produk Unggulan" jadi kisi 2 kolom dengan kartu yang lebih rapi, supaya tidak satu kartu besar per layar. Gambar, nama, dan harga terlihat tanpa terpotong, dan tidak tertutup menu bawah.

## Tahap 1: Katalog siap berkembang

**Modal Detail Produk live 7 November di `563da71`.** Kategori dan atribut fleksibel belum dikerjakan.

**Kategori.** 9 kategori utama dan subkategorinya mengikuti Excel. Empat kategori yang sudah ada dipakai ulang, sehingga alamatnya tidak berubah. Yang belum punya produk berstatus draf, jadi tidak muncul di website.

```
Kasur Latex
Aksesori Tempat Tidur  > Bantal & Guling Full Latex, Bantal & Guling Recon
Aksesori Terapi
Otomotif               > Jok Natural Latex, Jok Import, Jok Sambungan, Busa + Latex, Full Set
Sepatu, Hewan Peliharaan
Rumah Sakit            > Matras, Aksesori Bedah
Bayi & Anak            > Matras, Bantal & Guling
Interior Furniture     > Matras Custom, Sofa Single & Set, Sofa Ruang Tamu, Aksesori Sofa
```

**Atribut fleksibel.** Ini jawaban untuk "ke depan atribut bakal nambah":

- `product_attribute`: definisi (nama dua bahasa, tipe teks/angka/pilihan, satuan, tampil di website atau internal, bisa difilter).
- `product_attribute_category`: atribut mana berlaku untuk kategori mana.
- `product_attribute_value`: nilainya per produk.

Atribut baru cukup ditambah dari admin, dan form produk menampilkannya sendiri. API publik sudah punya tempatnya (`attributes: []`), dan JSON spesifikasi lama tetap jalan.

**Modal Detail Produk** sesuai PDF, dari menu baris `+ Detail`:

- Header tetap di atas: nama, SKU, tombol salin, status, dan "diperbarui x lalu".
- Isi berkelompok warna: media, kategori, identitas, asal, ukuran dengan konversi, stok dan pesanan, biaya dan harga, SEO, serta kalkulator.
- Kelompok biaya hanya muncul untuk akun yang punya izinnya, dan datanya tidak terkirim ke akun lain.

## Tahap 2: HPP

**Live 7 November di `563da71`** (versi 1.2.11B, migration 032, backup `matex-20261106T184018Z`). Tabelnya masih kosong di production sampai pemilik mengimpor Excel lewat admin. Test: `pricing.test.ts`, `costing-api.spec.ts`, `costing-page.spec.ts`. File Excel asli diimpor ke database uji: 83 dari 83 item cocok dengan Excel untuk HPP, Net, dan Affiliate, dan E-commerce berbeda paling jauh pembulatan rupiah.

Bedanya dari rancangan awal: tabel utama bernama `cost_item`, supaya 30 item Excel yang belum punya produk tetap bisa dihitung, lalu dihubungkan lewat SKU kalau produknya sudah dibuat. `product_cost_snapshot` belum dibuat, karena riwayat harga bahan dan versi resep sudah cukup untuk menelusuri, dan baru diperlukan saat ada grafik HPP.

Temuan dari Excel yang tampil di laporan impor: empat produk terapi (Back Support, Cushion, Lumbar, Wasir) menuliskan inner Rp 35.000, tetapi total HPP-nya tidak menjumlahkannya. Kalau inner memang dipakai, HPP keempat produk itu kurang Rp 35.000. Tim produksi perlu memastikan.

Semua tabel berada di domain sendiri, dengan izin sendiri (`cost.view`, `cost.manage`), dan tidak pernah di-join oleh query publik.

| Tabel | Isi |
| --- | --- |
| `cost_material` | Bahan, jasa, dan kemasan: nama, jenis, satuan (kg, m3, meter, pcs) |
| `cost_material_price` | Harga bahan **bertanggal**, sehingga riwayat tersimpan dan perubahan harga bisa disimulasikan |
| `product_recipe` | Resep per SKU, berversi, bisa disalin antar ukuran |
| `product_recipe_line` | Baris resep: bahan, jumlah atau rumus dari ukuran (L, P, T), harga khusus bila perlu |
| `product_cost_snapshot` | HPP tercatat per tanggal, untuk grafik dan laporan |

- Rumus memakai pengurai aman dengan variabel terbatas, bukan `eval`.
- Harga bahan berubah → HPP semua produk terkait bisa dilihat dampaknya dulu sebelum disimpan.
- Halaman baru **Katalog → HPP & Bahan**: daftar bahan, resep, dan perbandingan antar versi.

**Importer Excel** dijalankan dalam dua langkah: laporan uji dulu (cocok, beda, dan masalah di atas), lalu baru masuk database setelah disetujui. File Excel dan angka biayanya tidak masuk repo.

## Tahap 3: Harga, kanal, pajak, kalkulator

**Live 7 November di `563da71`.** Bedanya dari rancangan awal: tarif berlaku umum lalu per item (tanpa tingkat kategori, karena Excel menyimpannya per item), dan pajak baru berupa isian persen di kalkulator sampai legalitas perusahaan jelas. Biaya kanal bisa dibatasi per kategori di API, tetapi halamannya belum menampilkan pilihan kategori.

**Tingkat harga sebagai data.** `pricing_tier` menyimpan Net, Affiliate, Aplikasi, Grosir, dan kurs USD beserta persentasenya. Nilai berlaku bertingkat: umum → kategori → produk. Jadi 20% untuk semua, tetapi 8% untuk jok tertentu, tetap bisa.

**Kanal dan biaya** (jawaban untuk "tiap platform beda kalkulatornya"):

| Tabel | Isi |
| --- | --- |
| `sales_channel` | Website, Shopee, Tokopedia, TikTok Shop, Lazada, Blibli, Reseller, Affiliate |
| `channel_fee_rule` | Kanal, nama biaya, jenis (persen atau nominal), dasar hitung, batas maksimum, per item atau per pesanan, kategori, **berlaku dari-sampai** |
| `tax_profile` | Status perusahaan dan aturan pajak, juga bertanggal |

Tarif berubah → tim menambah satu baris bertanggal tanpa deploy, dan hitungan lama tetap bisa ditelusuri.

**Tarif belum diisi sebagai fakta.** Hasil riset 6 November 2026 menunjukkan sumber yang ada saling bertentangan, misalnya batas komisi dinamis Tokopedia dan TikTok Shop, dan tarif berubah beberapa kali setahun. Sistem hanya menyediakan isian, lalu tim mengisi dari Seller Center masing-masing. Gambaran kasar dari riset, belum diverifikasi:

- Shopee sekitar 6-13%, Tokopedia dan TikTok Shop sekitar 8-12%, Lazada sekitar 4-8%, belum termasuk iklan.
- PPh 22 marketplace 0,5% dari peredaran bruto (PMK 37/2025). Ini **bukan biaya tambahan murni**, karena bisa dikreditkan atau menjadi bagian pelunasan PPh Final. Pengaruhnya ke arus kas, jadi kalkulator menampilkannya terpisah.
- PPN bergantung pada status PKP perusahaan, dan perlu dikonfirmasi ke bagian keuangan.

**Kalkulator dua arah:**

- **Dari harga:** harga jual → tiap potongan → uang diterima → laba dan margin per kanal.
- **Dari target:** margin yang diinginkan → harga jual minimum per kanal.
- **Perbandingan:** satu produk, semua kanal, satu layar.
- **Simulasi bisnis:** qty, diskon, voucher, iklan → omzet, laba, dan titik impas.

Kalkulator tidak mengubah harga apa pun. Hasilnya berlabel estimasi, disertai tanggal aturan yang dipakai.

**Yang kalkulator bakal perlihatkan:** APL 20% di Excel berlaku rata untuk semua platform, sementara potongan aslinya beda-beda. Sebagai ilustrasi dengan angka contoh: harga Rp 1.448.273, potongan platform 12% + Rp 1.250, dan affiliate 5% dari harga affiliate. Uang diterima sekitar Rp 1.215.300, sekitar Rp 114.600 di atas target Net MIA. Selisih itulah ruang untuk iklan dan voucher.

**Harga hitungan terpisah dari harga tayang.** Website tidak pernah berubah sendiri. Admin menekan "Terapkan harga" per produk atau massal, melihat selisihnya dulu, dan setiap perubahan tercatat di log. Ada aturan pembulatan, karena harga live sekarang masih berkoma (Rp 83.552,63).

## Tahap 4: Forecast dan realisasi

Ini yang menjawab "berapa yang bisa diperoleh Matex":

- **Forecast** per SKU per periode: Qty → Total HPP dan Net MIA, sesuai kolom Excel, lalu dirangkum per kategori.
- **Realisasi penjualan:** input manual atau impor file laporan marketplace per kanal. Forecast lawan realisasi tampil di tab **Finance** di Dasbor.
- **Produksi dan stok:** pergerakan stok (masuk, keluar, penyesuaian) tampil di tab **Inventaris**.

**Sengaja belum:** pembukuan akuntansi dan kirim laporan pajak. Keduanya proyek sendiri.

## Tahap 5: Sambungan API marketplace

Pemilik benar bahwa ini sangat membantu: pesanan, biaya asli per pesanan, stok, dan harga bisa masuk otomatis, sehingga realisasi tidak perlu diketik. Tetapi ini bukan langkah pertama, karena akses API bergantung pada syarat toko dan legalitas di luar kode.

| Platform | Kondisi yang ditemukan (perlu dicek ulang di portalnya) |
| --- | --- |
| Shopee Open Platform | Ada jalur aplikasi milik seller sendiri. Halaman edukasi seller yang ditemukan menyebut syarat: seller Mall, seller terkelola, atau minimal 600 pesanan selesai dalam 30 hari. Halaman itu sudah lama, jadi syarat terbaru perlu dipastikan |
| TikTok Shop dan Tokopedia | Lewat TikTok Shop Partner Center. Ada jenis "seller developer" yang tersambung satu lawan satu ke toko sendiri, dan tersedia sandbox. Open API Tokopedia yang lama sudah dipindahkan ke sini |
| Lazada Open Platform | Tersedia Seller API dengan endpoint Indonesia |
| Blibli | Dokumentasi resminya belum ditemukan |

Syarat NIB untuk tiap portal belum terkonfirmasi. Pemilik menyebut NIB kemungkinan belum ada, dan ini kemungkinan jadi penghambat pertama, jadi perlu dicek saat mendaftar.

**Cara membangunnya:**

- Satu antarmuka konektor per platform: ambil pesanan, ambil biaya, kirim stok, kirim harga. Modul lain tidak perlu tahu platform apa yang dipakai.
- Tiap platform masuk ke tabel yang sama dengan impor manual di Tahap 4, jadi impor manual dan API tidak saling mengganggu.
- Token toko dan kunci aplikasi terenkripsi di database atau `.env`, tidak pernah tampil di admin.
- Tahap pertama **hanya baca** (pesanan dan biaya). Mengirim harga dan stok ke marketplace menyusul setelah angkanya terbukti benar, karena salah kirim langsung mengubah harga jual.
- Webhook dan penarikan berkala memakai antrian dan riwayat sinkronisasi, supaya kegagalan terlihat dan bisa diulang.
- Bila syarat API belum terpenuhi, tetap jalan lewat impor file laporan dari Seller Center.

**Yang perlu tim siapkan:** status legalitas (NIB), daftar toko resmi per platform, dan akun pemilik toko untuk mendaftar di tiap portal developer. Pendaftaran dan persetujuan syarat dilakukan pemilik sendiri.

## Keamanan API publik (dikerjakan bersama Tahap 0)

**Live 7 November di `deb357b`.** Pemeriksaan production setelah deploy: tidak ada ID angka atau field internal di respons yang terbaca. Pemeriksaan sebelumnya, hanya baca: `.env`, `.git`, source map, dan daftar folder `/files/` tidak bisa diakses. API admin menolak tanpa login. Tabel penerima pesan kontak tidak ikut terkirim, dan harga grosir tersembunyi tidak ikut keluar. Yang ditemukan dan diperbaiki:

| Temuan | Perbaikan |
| --- | --- |
| ID database asli tampil di produk, kategori, artikel, dan gambar | Diganti hash, atau dibuang kalau tidak dipakai |
| Filter `ids`, `category_ids`, `exclude_id` menerima angka, sehingga bisa disisir | Hanya menerima hash |
| HS code, kode manufaktur, lead time, jumlah stok, `manage_stock`, nama file, SKU marketplace, kunci dan urutan kategori ikut terkirim | Dibuang dari respons publik |
| Tiap halaman mengambil data dua kali: di server, lalu lagi di browser | `no-store` diganti `public, max-age=0, must-revalidate`, sehingga data halaman pertama ikut bersama HTML dan browser tidak meminta ulang. Data tetap selalu segar |
| Halaman website belum mengirim beberapa header keamanan | `nosniff`, HSTS, dan `Permissions-Policy` ditambahkan di server SSR |

**Temuan setelah deploy:** data halaman pertama sudah ikut bersama HTML, tetapi browser tetap memintanya lagi. Kunci cache di server memakai alamat internal (`127.0.0.1:9200`), sedangkan browser memakai `matexindo.com`, jadi tidak pernah cocok. Stack test tidak menangkapnya karena kedua alamatnya sama. Perbaikan: `HTTP_TRANSFER_CACHE_ORIGIN_MAP` di `app.config.server.ts`, dan stack test sekarang memakai alamat internal yang berbeda seperti production. Live 7 November di `c9f3610`. Diukur di production pada 6 halaman: data ikut bersama HTML, dan di muatan pertama browser hanya memanggil analitik.

**Yang tidak mungkin, dan perlu jujur:** permintaan browser ke API tidak bisa disembunyikan sepenuhnya. Saat pengunjung berpindah halaman, browser tetap meminta data, dan data yang tampil di layar pasti bisa dilihat pemilik browser itu. Proxy hanya mengganti alamatnya, tidak menghilangkan permintaannya, jadi tidak dipasang. Perlindungan yang nyata adalah yang di atas: mengirim seperlunya saja, batas laju permintaan (sudah ada, 600 per 15 menit per IP, dan batas khusus form kontak), serta validasi di server.

**Catatan:** hash ID melindungi dari penyisiran, bukan enkripsi. Garam hash-nya masih tertulis di kode (`backend/src/hsid.ts`), jadi akses repo harus tetap tertutup. Content Security Policy belum dipasang karena perlu diuji terhadap Google Maps dan analitik; itu pekerjaan terpisah.

## Urutan kerja dan aturan

Tiap tahap ditutup dengan test lolos dan commit lokal. Push dan deploy tetap izin per kali.

1. Tahap 0, bisa langsung live.
2. Tahap 2 dan Tahap 3, karena ini yang ditunggu tim produksi dan marketing. Modal Detail versi awal ikut di sini.
3. Tahap 1 untuk kategori dan atribut. Isi kategori bisa dimajukan kapan saja karena tidak mengubah struktur.
4. Tahap 4.
5. Tahap 5, setelah syarat akses API tiap platform terpenuhi.

Tes wajib untuk lapisan biaya:

- Respons API publik tidak mengandung data biaya.
- Akun tanpa izin ditolak dan tidak menerima angkanya.
- Hasil rumus sama dengan Excel untuk seluruh 83 item, sampai ke rupiahnya.

## Yang masih perlu dijawab tim, tanpa menahan pekerjaan

| Pertanyaan | Penanya | Nilai aman sementara |
| --- | --- | --- |
| APL 20% itu mencakup apa saja (admin, iklan, voucher)? | Marketing | Dianggap satu angka target |
| GPM 42% dan 48% di Jok Sambungan disengaja? | Produksi | Diimpor apa adanya, ditandai di laporan |
| Nama dan ukuran yang berbeda antar sheet, mana yang benar? | Produksi | Sheet KATEGORI, ditandai di laporan |
| Legalitas (NIB, PKP) dan skema pajak? | Keuangan | Kalkulator menampilkan "pajak belum diatur" |

## Sumber riset biaya dan pajak

Sumber blog hanya dipakai sebagai gambaran, bukan dasar tarif.

- [Pemerintah menunjuk empat marketplace sebagai pemungut PPh (DJP)](https://www.pajak.go.id/en/node/120146)
- [PMK-37/2025: potongan pajak otomatis di marketplace (DJP)](https://www.pajak.go.id/en/node/120342)
- [Pemungutan PPh 22 berlaku untuk seluruh pengusaha online (Ortax)](https://ortax.org/tidak-hanya-untuk-umkm-pemungutan-pph-22-oleh-marketplace-berlaku-untuk-seluruh-pengusaha-online)
- [Biaya komisi marketplace Indonesia 2026 (Jangkar)](https://jangkar.io/blog/biaya-komisi-marketplace-indonesia-2026/)
- [Perbandingan biaya admin Tokopedia, TikTok Shop, Shopee 2026 (RekapCepat)](https://www.rekapcepat.id/blog/perbandingan-biaya-admin-tokopedia-tiktok-shop-shopee-2026)
- [Update biaya admin Shopee 31 Juli 2026 (Remarketing.id)](https://remarketing.id/perbedaan-biaya-admin-shopee-tokopedia-tiktok-shop/)
- [Biaya admin marketplace Indonesia 2026 (WebEkspor)](https://www.webekspor.com/blog/biaya-admin-marketplace-indonesia-2026-shopee-tokopedia-lazada-dan-tiktok-shop)

Sumber API marketplace:

- [Open API for Shopee Sellers](https://seller.shopee.ph/edu/article/7510)
- [Seller API overview, Tokopedia & Shop Partner Center](https://partner.tokopedia.com/docv2/page/seller-api-overview)
- [Onboarding seller developer TikTok Shop dan Tokopedia](https://partner.tiktokshop.com/docv2/page/tokopedia-shop-isv-seller-developer-onboarding)
- [Tokopedia & Shop Open API Integration One Pager](https://partner.tiktokshop.com/docv2/page/id-market-tokopedia-shop-open-api-integration-one-pager)
- [Lazada Open Platform](https://open.lazada.com/)
