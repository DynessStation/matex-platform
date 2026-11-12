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

**Perlu dari pemilik sebelum tahap ini dikode:** satu contoh file ekspor Shopee dan satu TikTok Shop dari toko mana saja (boleh data lama). Tanpa itu formatnya tebakan, dan tebakan dilarang.

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

## Pertanyaan untuk pemilik, tidak menahan Tahap 1

1. Contoh file ekspor Shopee dan TikTok Shop (untuk Tahap 2).
2. Atrija dan Koh Joni: produknya buatan MIA (skenario C di rancangan multi-penjual) atau buatan sendiri (skenario B)? Menentukan komponen default aturan bagi hasil.
3. Setia Latex dan Rasa Latex: badan usaha terpisah atau merek MIA? Menentukan apakah bukunya benar-benar terpisah atau hanya laporan per merek.
4. Siapa di tim yang akan mengimpor laporan tiap hari atau tiap minggu? Menentukan seberapa sederhana layar impornya harus dibuat.
