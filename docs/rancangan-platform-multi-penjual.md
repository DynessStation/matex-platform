# Rancangan MATEX sebagai platform multi-penjual

Status: **bahan diskusi, belum dikerjakan.** Ditulis 7 November 2026 dari pertanyaan pemilik: toko atau manufaktur lain (contoh SATRIAJAYA) ingin menaruh etalase di website dan punya panel sendiri, tetapi tetap tersambung ke MIA lewat hubungan produksi, dan nantinya menjadi marketplace sendiri (V2).

Bisnis MIA masih mencari bentuk, jadi yang penting sekarang adalah tidak mengunci pilihan, bukan membangun semuanya.

## Intinya: pisahkan tiga peran

Shopee dan Tokopedia hanya punya satu peran, penyedia platform. MIA bisa memegang ketiganya sekaligus, dan itulah sumber kerumitannya.

| Peran | Artinya | Contoh |
| --- | --- | --- |
| **Platform** | Menyediakan website, panel, dan transaksi | MIA |
| **Penjual** | Yang memajang dan menjual ke pembeli | MIA, SATRIAJAYA |
| **Produsen** | Yang membuat barangnya | MIA, SATRIAJAYA, pihak lain |

Model ini lazim disebut *hybrid marketplace*: platform juga berjualan sebagai salah satu penjual. Kuncinya, **MIA diperlakukan sebagai penjual biasa di platformnya sendiri**, dengan akun penjual seperti yang lain. Tidak ada jalur khusus untuk produk MIA, jadi laporan dan pembagian uangnya memakai aturan yang sama.

## Empat skenario

| Skenario | Penjual | Produsen | Aliran uang |
| --- | --- | --- | --- |
| A | MIA | MIA | Seluruh hasil penjualan masuk MIA |
| B | SATRIAJAYA | SATRIAJAYA | SATRIAJAYA dapat hasil penjualan dikurangi komisi platform ke MIA |
| C | SATRIAJAYA | MIA | Seperti B, ditambah SATRIAJAYA membayar biaya produksi ke MIA |
| D | MIA | SATRIAJAYA | Hasil penjualan masuk MIA, dan MIA membayar pembelian barang ke SATRIAJAYA |

**Contoh skenario C** dengan angka contoh, harga pembeli Rp 1.000.000:

```
Pembeli bayar                       1.000.000
- Biaya payment gateway                20.000   ke penyedia pembayaran
- Komisi platform 10%                 100.000   ke MIA, sebagai pendapatan platform
= Hak SATRIAJAYA                      880.000
- Tagihan produksi                    600.000   ke MIA, sebagai pendapatan produksi
= Dibayarkan ke SATRIAJAYA            280.000
```

Pendapatan MIA terpisah menjadi dua: **komisi platform** dan **penjualan jasa produksi**. Keduanya sebaiknya tercatat terpisah sejak awal, karena pajak dan laporannya berbeda.

## Hal yang paling sensitif: harga produksi

SATRIAJAYA **tidak boleh melihat HPP MIA**. Yang dilihatnya adalah **harga produksi**, yaitu harga MIA kepada SATRIAJAYA. Jadi ada dua angka:

```
HPP MIA (rahasia MIA)  +  margin produksi  =  Harga produksi (yang dilihat SATRIAJAYA)
```

Bagi SATRIAJAYA, harga produksi itulah HPP-nya, dan kalkulator serta resep di panelnya memakai angka itu. Tabel biaya yang baru dibuat sudah terikat per perusahaan, sehingga pemisahan ini sejalan dengan fondasinya. Lapisan harga produksi, mesin, dan kapasitas belum ada dan perlu dibangun.

## Yang sudah ada dan yang perlu ditambah

**Sudah mendukung:**

- Hampir semua tabel punya `id_master_comp`, jadi data sudah bisa dipisah per perusahaan.
- Hak akses per profil sudah ada, dan bisa dipakai ulang untuk panel penjual.

**Perlu ditambah:**

| Bagian | Isinya |
| --- | --- |
| Website | Sekarang hanya menampilkan satu perusahaan (`PUBLIC_COMPANY_ID`). Perlu bisa menampilkan produk banyak penjual, dan halaman toko per penjual |
| Identitas produk | Penjual dan produsen tercatat terpisah di tiap produk |
| Panel penjual | Akun penjual hanya melihat datanya sendiri. Fitur MIA seperti Dasbor utama tetap untuk MIA |
| Kerja sama produksi | Daftar perjanjian MIA dengan mitra: harga produksi per produk, order produksi, status, tagihan |
| Komisi | Aturan komisi per penjual atau kategori, bertanggal seperti biaya kanal |
| Pesanan | Belum ada. Satu keranjang bisa berisi beberapa penjual, jadi perlu dipecah per penjual |
| Pencatatan uang | Buku saldo per pihak: setiap pembagian tercatat sebagai baris, tidak pernah ditimpa |
| Pencairan | Saldo penjual dan jadwal pencairannya |

## Tahapan yang disarankan

Tiap tahap berguna sendiri, dan bisa berhenti di mana saja kalau arah bisnisnya berubah.

| Tahap | Isi | Uang lewat platform? |
| --- | --- | --- |
| **0. Sekarang** | Menu HPP & Harga untuk MIA sendiri | Tidak |
| **1. Etalase mitra** | SATRIAJAYA punya akun dan panel, produknya tampil di website, pembeli tetap diarahkan ke WhatsApp atau marketplace-nya | Tidak |
| **2. Kerja sama produksi** | Mitra memesan produksi ke MIA, melihat harga produksi, MIA menagih di luar sistem atau lewat invoice | Tidak |
| **3. Marketplace (V2)** | Keranjang, pembayaran, pembagian otomatis, pencairan, pengiriman, retur, sengketa | Ya |

**Tahap 1 dan 2 bisa berjalan tanpa izin dan risiko pegang uang orang lain.** Tahap 3 lompatan terbesar: bukan cuma kode, tetapi juga legal, operasional, dan layanan pelanggan.

## Yang perlu diputuskan atau dicek sebelum V2

Bagian ini belum gw verifikasi ke sumber resmi, dan perlu dicek ke konsultan hukum dan pajak.

- **Perizinan:** menjadi penyedia marketplace kemungkinan besar masuk aturan perdagangan melalui sistem elektronik, dan butuh legalitas perusahaan yang sudah beres.
- **Menahan uang penjual:** sebaiknya memakai fitur pembagian dari penyedia pembayaran resmi, bukan menampung sendiri, karena menyimpan uang pihak lain bisa masuk ranah izin keuangan.
- **Pajak:** komisi, jasa produksi, dan penjualan barang diperlakukan berbeda, dan platform bisa ditunjuk sebagai pemungut pajak.
- **Tanggung jawab produk:** siapa yang menanggung retur, garansi, dan keluhan kalau penjualnya SATRIAJAYA tetapi produsennya MIA.

## Pertanyaan untuk meeting

1. SATRIAJAYA memakai model yang mana: B, C, atau D, atau campuran?
2. Berapa kira-kira komisi platform, dan apakah sama untuk semua mitra?
3. Bagaimana harga produksi ditentukan: per produk, per order, atau dari kapasitas mesin?
4. Pembeli melihat satu merek MATEX, atau nama toko masing-masing?
5. Siapa yang menangani pengiriman dan retur?

## Yang gw jaga mulai sekarang

Tanpa membangun apa pun untuk V2, keputusan teknis berikut menjaga pintunya tetap terbuka:

- Data baru selalu terikat `id_master_comp`.
- Data biaya tidak pernah ikut query publik.
- Tarif, komisi, dan biaya disimpan sebagai data bertanggal, bukan rumus di kode.
- Saat pencatatan penjualan dibangun di Tahap 4 Part 2, penjual dan kanal tercatat di tiap baris.
