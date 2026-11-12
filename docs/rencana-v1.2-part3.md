# Rencana MATEX V1.2 Part 3: Toko, Uang, dan Panel yang Dipakai Tim

Sumber: `V.1.2.11B PART 3.pdf` (12 November 2026, "DEV Mode - Experimental"), hasil meeting tim yang diringkas pemilik di sana, `rancangan-platform-multi-penjual.md`, dan pengecekan kode serta skema.

Status: **arah disetujui pemilik 12 November 2026.** Tiap tahap tetap minta OK sebelum dikode, dan push serta deploy izin per kali.

## Intinya dalam satu kalimat

Panel tidak dipakai tim bukan karena teknologinya, tetapi karena **panel belum menunjukkan uang mereka**. Seller Center menunjukkannya, jadi orang ke sana. Part 3 membuat panel MATEX menjadi satu tempat melihat uang **semua toko sekaligus**, yang tidak bisa dilakukan Seller Center mana pun.

## Keputusan: tidak rombak total

Pemilik membuka pintu untuk ganti backend, database, atau framework. Jawabannya: **tidak**, dengan alasan yang bisa diuji.

| Usulan ekstrem | Kenapa tidak |
| --- | --- |
| Ganti backend ke NestJS | Nol layar baru untuk tim selama berbulan-bulan. 300 test hijau dan production yang jalan dibuang. Pola backend sudah satu (Fase 5), masalahnya bukan di sini |
| Ganti database | Hampir semua tabel sudah punya `id_master_comp`, jadi multi-perusahaan sudah ada di fondasi. Tabel biaya dan tarif sudah per perusahaan dan bertanggal |
| Rombak UI dari nol | Aturan visual sudah ada dan dipakai (`rencana-ui-admin.md`). Yang kurang bukan tampilan, tetapi **isi** yang membuat orang mau login |

Yang berubah besar adalah **sudut pandang panel**: dari "panel website matexindo.com" menjadi "panel bisnis MIA dan toko-tokonya", dengan website sebagai salah satu kanal.

## Peta bisnis yang dipakai

Dari gambar pemilik:

```
Matex Indo Abadi (MIA)
├─ Brand sendiri (punya toko / as supplier)
│  ├─ MIA          TikTok, Shopee
│  ├─ Setia Latex  TikTok, Shopee
│  ├─ Rasa Latex   TikTok, Shopee
│  └─ ...          bakal nambah
└─ B2B (mitra)
   ├─ Atrija
   ├─ Koh Joni
   └─ ...          bakal nambah
```

Tiap pihak: identitas sendiri, boleh punya panel sendiri, pembagian hasilnya fleksibel dan beda kasus, bisa "numpang" etalase di matexindo.com. Pembukuan terpisah per pihak, tetapi akhirnya menyatu di MIA.

Istilah yang dipakai di panel:

| Istilah | Artinya |
| --- | --- |
| **Entitas** | Pihak yang punya buku sendiri: MIA, Setia Latex, Rasa Latex, Atrija, Koh Joni. Disimpan di `master_comp` yang sudah ada, ditambah jenis hubungan |
| **Toko** | Satu akun di satu kanal milik satu entitas: "Setia Latex di TikTok". Satu entitas bisa punya banyak toko |
| **Kanal** | Shopee, TikTok Shop, Tokopedia, website matexindo.com, offline. Sudah ada di `sales_channel` |
| **Aturan bagi hasil** | Siapa dapat berapa dari penjualan sebuah toko, bertanggal, per entitas, bisa per kategori |

## Tahap 1: Entitas dan Toko

**Selesai lokal 12 November 2026, belum di-deploy.** Migration 034, API `/api/v1/business` (`backend/src/ctrl/admin/business`, helper `business.helper.ts`), halaman `components/business` (tab Entitas, Toko, Bagi hasil, tabel inline), panduan `assets/help/business.md`. Test: `business-api.spec.ts`, `business-page.spec.ts`.

Bedanya dari rancangan di bawah, diputuskan saat pengerjaan:

- Entitas disimpan di tabel baru `business_entity`, bukan di `master_comp`. `master_comp` adalah perusahaan pemilik panel, dan semua query lama sudah terikat ke sana; menambahkan tabel di bawahnya membuat tidak ada query lama yang berubah. Tiap perusahaan otomatis punya satu entitas berjenis `platform` (dibuat migration, atau saat pertama dibutuhkan).
- Akun mitra adalah akun admin biasa dengan kolom `admin_acct.id_business_entity`. Pembatasannya ada di SQL (`entityWhere`, `productEntityWhere`): entitas, toko, aturan, dan produk pihak lain tidak pernah terkirim, bukan hanya disembunyikan di menu. Akun mitra boleh memperbarui kontak dan tokonya sendiri, tidak bisa mengubah jenis entitas, status, atau aturan bagi hasil. Produk yang dibuatnya otomatis dijual oleh entitasnya, dan produsennya ditentukan staf platform.
- Aturan bagi hasil punya komponen generik di `revenue_share_component` (jenis komisi platform, tagihan produksi, biaya lain; tipe persen dari harga pembeli atau dana diterima, nominal per item, atau HPP + persen). Halaman menampilkannya sebagai tiga baris tetap. Dua aturan untuk lingkup yang sama tidak boleh bertumpuk tanggalnya.
- Produk membawa `id_seller_business_entity` dan `id_producer_business_entity` (form produk tab Umum, hanya tampil kalau entitasnya lebih dari satu). Semua produk lama menjadi milik entitas platform.
- Kolom logo entitas sudah ada, pemilih gambarnya belum dibuat. Pembagian hasil belum dihitung di mana pun: itu pekerjaan Tahap 3.

Menu baru **Bisnis** di atas Katalog (dasbor tetap paling atas).

- **Entitas**: daftar dan form. Kolom baru di `master_comp`: jenis (`own_brand`, `partner_b2b`, `platform` untuk MIA), logo, kontak, catatan. MIA ditandai sebagai platform dan tidak bisa dihapus.
- **Toko** (`store`): entitas, kanal, nama toko, tautan, status aktif, catatan akses (bukan kredensial). Ini kunci untuk impor penjualan dan konektor API nanti.
- **Aturan bagi hasil** (`revenue_share_rule`): entitas, toko (opsional), kategori (opsional), komponen bertingkat yang masing-masing bisa persen atau nominal: komisi platform ke MIA, harga produksi ke MIA, biaya lain, sisanya hak entitas. Berlaku dari-sampai. Satu kasus satu baris, jadi "masing-masing beda kasus" tertampung tanpa kode baru.
- Produk mendapat dua kolom: **penjual** (entitas) dan **produsen** (entitas), keduanya default MIA. Produk mitra yang "numpang etalase" tampil di website dengan nama tokonya kalau entitasnya mengizinkan.
- Hak akses: profil **Mitra** hanya melihat entitas, toko, produk, penjualan, dan buku miliknya sendiri. Dipaksa di query backend lewat `id_master_comp` akun, bukan hanya disembunyikan di menu. Test wajib: akun mitra A tidak pernah menerima baris milik B.

Migration 034. Tidak mengubah tabel publik.

## Tahap 2: Penjualan masuk lewat impor laporan Seller Center

API marketplace bergantung pada NIB dan persetujuan tiap portal (Part 2 Tahap 5). Yang bisa jalan **sekarang** adalah file ekspor yang tim unduh tiap hari dari Seller Center.

- Tabel `sales_order` dan `sales_order_line`: toko, nomor pesanan kanal, tanggal, status, pembeli (nama samaran dan kota saja), SKU, qty, harga, diskon penjual, voucher platform, ongkir, biaya platform, dana diterima. Satu nomor pesanan per toko hanya sekali, jadi impor ulang tidak menggandakan.
- **Importer per format**: Shopee (ekspor "Pesanan Saya" dan "Laporan Penghasilan"), TikTok Shop (ekspor pesanan dan "Settlement"). Pola sama dengan importer Excel HPP: **laporan uji dulu** (berapa baru, berapa sudah ada, berapa SKU tidak dikenal), lalu masuk setelah disetujui.
- SKU yang tidak dikenal dipetakan sekali ke produk atau `cost_item` lewat tabel `store_sku_map`, dan dipakai otomatis di impor berikutnya.
- Riwayat impor (`sales_import`): siapa, kapan, file apa, hasilnya. File tidak disimpan di repo.
- Tabel ini sama persis yang nanti diisi konektor API, jadi impor manual dan API tidak saling mengganggu.

**Yang sudah dilihat langsung di Seller Center TikTok Shop (12 Nov 2026, toko uji "CUMA LATEX"; di Indonesia Seller Center TikTok Shop dan Tokopedia sudah satu panel):**

- **Pesanan › Ekspor**: pilih rentang (pesanan terfilter, status tertentu, atau semua), format **CSV atau Excel**, maksimal 200.000 pesanan, bawaan 12 bulan terakhir. Kolom di layar: nomor pesanan, pembeli (disamarkan), produk, status pesanan, metode dan opsi pengiriman, total.
- **Keuangan › Laporan**: inilah "duit yang bisa ditarik". Satu laporan per hari penyelesaian, isinya **Pendapatan, Biaya, Penyesuaian, Jumlah penyelesaian pembayaran**, ID laporan, ID pembayaran. Tampilan "per pesanan" memberi baris per pesanan (ID pesanan, tanggal pesan, nama SKU, pendapatan, biaya, dana diterima) dan baris **penyesuaian** yang bukan pesanan (contoh: "Pembayaran GMV untuk Iklan TikTok", minus). Ada tombol Unduh dan riwayat ekspor.
- Kesimpulan untuk importer: dua file per toko, **pesanan** (apa yang terjual) dan **laporan keuangan** (berapa yang benar-benar masuk). Dana diterima diambil dari laporan keuangan, bukan dihitung sendiri. Penyesuaian non-pesanan masuk `sales_order_line` tanpa produk, berjenis `adjustment`, supaya saldo toko tetap cocok dengan panel marketplace.
- Shopee: pemilik tidak punya akun. Importer Shopee menunggu ada toko Shopee yang hidup; strukturnya disiapkan, formatnya dibaca dari file pertama yang masuk (layar impor menampilkan kolom yang terbaca sebelum apa pun disimpan).

**Masih perlu sebelum kode:** satu file CSV hasil Unduh dari dua layar di atas (boleh dari toko uji), supaya nama kolom dan format angka/tanggal dibaca dari file asli, bukan dari layar.

Migration 035.

## Tahap 3: Dasbor Uang dan Buku per Pihak

Ini layar yang membuat tim login.

- **Dasbor Uang** (menu Bisnis, halaman pertama): pilih periode dan entitas (atau semua). Kartu: omzet, potongan platform, dana diterima, HPP terjual, laba kotor, dan **hak tiap pihak** menurut aturan bagi hasil. Di bawahnya tabel per toko dan per produk. Angka HPP diambil dari `cost_item` yang sudah ada.
- **Buku per pihak** (`ledger_entry`): setiap pesanan yang masuk menghasilkan baris pembagian per pihak: hak entitas, komisi platform MIA, tagihan produksi MIA. Baris tidak pernah ditimpa; koreksi berupa baris baru. Saldo = jumlah baris. Ini "pembukuan terpisah tapi akhirnya nyatu": tiap entitas melihat bukunya, MIA melihat semua.
- Status pembayaran antar pihak: **belum dibayar**, **dibayar** (tanggal, catatan). Uang tetap pindah di luar sistem; panel hanya mencatat. Ini sengaja, supaya tidak masuk ranah menyimpan uang pihak lain.
- Dasbor utama yang ada sekarang (analitik website) pindah ke tab kedua; tab pertama adalah Uang untuk akun yang punya izinnya.

Migration 036.

## Tahap 4: Input dua bahasa yang tidak merepotkan

Masukan pemilik poin 8. Yang ada sekarang: tiap field teks punya dua kolom (ID dan EN) dan tombol terjemahan per field lewat asisten konten.

Perubahan:

- **Indonesia jadi bahasa utama** di semua form (produk, kategori, artikel, FAQ, halaman website). Form hanya menampilkan satu bahasa.
- Saat simpan, kalau EN kosong atau belum pernah disunting manual, EN **diisi otomatis** lewat asisten yang sudah ada; kalau asisten gagal, EN disalin dari ID dan ditandai "belum diterjemahkan".
- Toggle **"Tampilkan Inggris"** di atas form membuka kolom EN di samping ID bagi yang mau menyunting. Field EN yang pernah disunting manual tidak ditimpa lagi.
- Penanda per field: ikon kecil "otomatis" atau "disunting", supaya marketing tahu mana yang perlu dibaca ulang.
- Website publik tidak berubah: tetap dua bahasa.

Tanpa migration, hanya kolom penanda `*_en_source` (`auto`, `manual`) di tabel i18n yang ada. Masuk migration 036 bersama Tahap 3 supaya deploy-nya satu kali.

## Tahap 5: Rilis 1.2.11C dan UI-UX yang dirapikan sambil jalan

- Versi `1.2.11C`, changelog bahasa tim, migration 033-036 dijalankan manual sesuai `matex-vps-deploy.md`.
- Temuan UI-UX dicatat di `rencana-ui-admin.md` sebagai baris U baru dan dikerjakan di tahap tempat ia ditemukan, mengikuti aturan yang ada: satu baris satu tinggi, popup di samping tombol, tidak ada pemenggalan kata, gaya di lapisan global.
- Setiap tahap: test kontrak backend, spec halaman, full suite hijau, commit lokal. Angka uang dan bagi hasil diuji dengan contoh bertingkat yang hasilnya dihitung tangan di test.

## Yang sengaja ditunda

| Ditunda | Alasan |
| --- | --- |
| Keranjang, pembayaran, pengiriman di website (V2) | Butuh legalitas, payment gateway, layanan pelanggan. Tahap 1-3 di atas menyiapkan datanya tanpa memegang uang |
| Konektor API Shopee, TikTok, Tokopedia | Menunggu NIB dan pendaftaran developer oleh pemilik. Tabelnya sudah disiapkan di Tahap 2 |
| Manufacturing, kapasitas mesin, order produksi (V3) | Harga produksi ke mitra cukup sebagai angka di aturan bagi hasil dulu |
| Pembukuan akuntansi penuh dan laporan pajak | Buku per pihak di Tahap 3 adalah bahan mentahnya, bukan penggantinya |
| Varian produk dan atribut fleksibel (Part 2 Tahap 1) | Tidak menghambat uang masuk ke panel |

## Urutan dan ukuran

| Tahap | Isi | Migration | Perkiraan |
| --- | --- | --- | --- |
| 1 | Entitas, Toko, Aturan bagi hasil, penjual/produsen di produk, profil Mitra | 034 | 2 hari kerja |
| 2 | Impor penjualan Shopee dan TikTok, pemetaan SKU | 035 | 2 hari, setelah contoh file ada |
| 3 | Dasbor Uang, Buku per pihak | 036 | 2 hari |
| 4 | Dua bahasa: ID utama, EN otomatis | 036 | 1 hari |
| 5 | Rilis 1.2.11C | - | setengah hari + test penuh |

Tahap 1 bisa mulai sekarang. Tahap 4 bisa dimajukan kapan saja karena tidak bergantung tahap lain.

## Jawaban pemilik (12 Nov 2026)

1. **Contoh file ekspor**: akun uji TikTok Shop dibuka untuk dilihat (temuan di Tahap 2 di atas). Shopee tidak ada akun.
2. **Atrija dan Koh Joni: barangnya buatan MIA** (skenario C). Aturan bagi hasil bawaan untuk mitra: komponen **biaya produksi** (cost_plus dari HPP) ke MIA, sisa hak mitra; komisi platform opsional.
3. **Setia Latex dan Rasa Latex: nama toko di luar, pembukuannya terpisah tapi tergabung.** Jadi entitas `own_brand`, masing-masing dengan tokonya; bukunya terpisah per entitas, dan MIA melihat gabungannya. Tidak perlu badan usaha terpisah di sistem.
4. Soal "siapa yang mengimpor": belum dijawab karena pertanyaannya tidak jelas. Maksudnya: Tahap 2 butuh seseorang **mengunduh file dari Seller Center lalu mengunggahnya ke panel** tiap hari atau tiap minggu, sampai API marketplace tersambung. Keputusan sementara: siapa pun yang punya izin `sales.import`, layarnya dibuat sesederhana unggah satu file dan tekan "Masuk".

**Contoh pembukuan mitra yang dikirim pemilik** (lembar "SETIA LATEX, bulan Oktober", dari Om Ardi): per baris: tanggal, nomor PO, nama barang, ukuran P×L×T, qty, harga/pcs, **modal**, pembayaran masuk, sisa pembayaran, **perkiraan penerimaan**, **perkiraan margin**. Ini persis bentuk `ledger_entry` Tahap 3: per baris penjualan ada HPP (modal), hak yang diterima, dan margin; pembayaran masuk dicatat terpisah dan sisanya dihitung. Tahap 3 harus bisa menampilkan lembar seperti ini per entitas per bulan tanpa Excel.
