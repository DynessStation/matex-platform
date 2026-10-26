# Peta Jalan MATEX

Ringkasan posisi proyek: sudah sampai mana, sedang ke mana, dan ujung sementaranya. Dokumen ini diperbarui setiap kali satu tahap selesai. Aturan cara menulis kode ada di `docs/standar-kode.md`.

_Terakhir diperbarui: 19 Oktober 2026._

## Posisi sekarang

- **Production:** `matexindo.com` (publik) dan `internal.matexindo.com` (admin) berjalan di commit `6210bcf` (deploy 27 Oktober 2026 dini hari, API, admin, dan website publik dibangun ulang, tanpa migrasi, backup sebelum deploy `matex-20261026T211814Z`, full suite 189 lolos; sebelumnya `c69ba13` pada 26 Oktober malam, admin dan website publik, backup `matex-20261026T165140Z`; sebelumnya `6725e56` pada 26 Oktober malam, hanya admin, backup `matex-20261026T153931Z`; sebelumnya `534924a` pada 26 Oktober sore, API dan admin dibangun ulang, backup `matex-20261026T105809Z`; sebelumnya `60a4637` pada 26 Oktober pagi dengan backup `matex-20261026T034643Z`, `a0d86ca`, `1311ef8`, `490b039`, dan `e12a0ad` pada 25 Oktober malam, `527a68d` pada 25 Oktober sore dan `51b207d` pada 20 Oktober). Fase 5A sampai 5D, 6A, 6B, seluruh 6C (termasuk FE-014), dan 6D U-1 sampai U-5 (U-8 sebagian) plus aturan teks tabel tanpa kata terpotong, U-6 (tombol perbarui berjeda), U-7 (tombol kembali di form), U-15 (pratinjau gambar), U-16 (Profil Saya, dengan endpoint profil dan kata sandi baru), U-8, U-17 (panduan sesuai aplikasi, "?" di form), U-18 (urutan tanpa angka ketik), U-9 sampai U-14 (header selalu tampil, bug input telepon, tombol simpan halaman website tetap terlihat, halaman Kategori, filter kategori daftar Produk, penanda Dipakai di Media), P-1 (penanda MATEX Market segera hadir di header website), P-2 (Tag populer beranda, bagian masih dimatikan sampai diisi), serta perbaikan artikel terjadwal, urutan katalog, dan tab Umum halaman website sudah live.
- **Kondisi:** fondasi operasional aman (backup terenkripsi di luar VPS, restore sudah dilatih, SSH root hanya dengan kunci, log dirotasi). Semua modul admin generasi lama sudah satu pola dan dijaga test kontrak.
- **Test:** backend 84 unit test; e2e 120 test (115 kontrak API + 5 browser). Semuanya lulus.

## Yang sudah selesai

| Tanggal | Tahap | Hasil utama |
| --- | --- | --- |
| 14 Okt 2026 | Go-live v1 | Website publik, admin, dan API aktif di VPS CloudPanel |
| 18 Okt | Fase 0: Lingkungan | MySQL 8.4 lokal setara production, port dev tetap, README pengembangan lokal |
| 18 Okt | Audit awal | Laporan temuan berbukti (`audit-awal-claude-2026-10-18.md`) |
| 18 Okt | Fase 1: Perbaikan cepat | Katalog izin lengkap lewat migration, perintah membuat admin pertama, izin khusus asisten AI |
| 18 Okt | Pengerasan VPS | Root hanya dengan kunci, deploy memakai Node 22, rotasi log, bersih-bersih izin percobaan |
| 18 Okt | Backup luar VPS | Backup terenkripsi otomatis ke Google Drive setiap malam, disimpan 30 hari |
| 18 Okt | Fase 2: Test browser | Alur admin (login, upload, publish produk dan artikel) teruji otomatis; 4 bug ditemukan dan diperbaiki |
| 18 Okt | Isi bawaan | Database baru langsung berisi konten website MATEX; email FAQ yang salah diperbaiki |
| 19 Okt | Fase 3: Operasional | Latihan restore lulus; badge DEV di lingkungan non-production; `start-dev.cmd` dan `stop-dev.cmd` |
| 19 Okt | 4A | 727 file sisa Kartify yang tidak terpakai dibuang (arsip di tag `kartify-reference-v1`) |
| 19 Okt | 4B | Format frontend seragam (Prettier); build CSS admin selalu sama; peringatan lint admin 14.917 → 563 |
| 19 Okt | 4C | Test kontrak akun admin; `auth.ts` 5.100 baris dipecah; 2 bug diperbaiki (ID rusak membuat error 500, detail akun terhapus masih terbuka) |
| 19 Okt | 4D | Struktur backend: `middleware/` dipindah, file mati dibuang, `npm run test:api` dan mode rekam |
| 19 Okt | 4E–4G | `office.ts`, `admin-access.ts`, `web-navigation.ts` dipecah, masing-masing dengan test kontrak; rekaman identik |
| 19 Okt | Audit lanjutan | Penamaan modul diseragamkan; semua di atas di-deploy ke production (`e46d5fa`) |
| 19 Okt | 5A | Format dan lint backend seragam (Prettier root config, Oxlint); 0 error lint |
| 19 Okt | 5B | Fondasi bersama: scope sesi sekali per request, helper input/ID/list/JSON/transaksi, `HttpError`; salinan kembar diganti |
| 19 Okt | 5C | 9 modul generasi lama di pola standar, masing-masing dengan test kontrak dan rekaman identik; semua modul route jadi `Router`; bug BE-006 sampai BE-010, SEC-003 (logout mencabut semua sesi, migration 025), SEC-004 (upload lewat disk, cek isi video), SEC-007 (header `X-Powered-By`) |
| 20 Okt | 5C lanjutan | Modul generasi baru (FAQ, kontak, artikel, kategori, produk, analytics, route publik) diberi test kontrak lalu diseragamkan; bug BE-011 (urutan list 500), BE-012 (status/hapus tidak dicek dan tidak diaudit), BE-013 (slug menimpa terjemahan data lain) |

## Ke mana selanjutnya

### Fase 5: Backend satu pola

Hasil survei 19 Oktober: backend punya dua generasi kode. Generasi lama (8 modul, sekitar 20.000 baris) bergaya renggang, dan setiap handler menjalankan query sesinya sendiri: `getSessionScope` disalin di 6 tempat, ditambah 14 query sesi di modul akun admin. Generasi baru (9 modul) sudah ringkas dan memakai helper bersama `getAdminScope`. Fase 5 menjadikan semuanya satu pola (lihat standar bagian 2).

| Langkah | Isi | Selesai bila |
| --- | --- | --- |
| 5A Gaya ✅ | Satu config Prettier di root; Oxlint untuk backend (TypeScript 7 belum didukung ESLint); satu commit format murni; 1.397 baris komentar pembatas dan 2.215 celah kosong dirapatkan | **Selesai 19 Okt:** lint backend 0 error (309 warning = daftar utang 5C); syntax tree 122 file identik |
| 5B Fondasi bersama ✅ | Scope sesi diambil sekali oleh middleware lalu dibaca dari `req`; helper input, ID, list query, JSON, transaksi, `HttpError`, dan penanganan error pusat, semua dengan unit test; salinan kembar langsung diganti | **Selesai 19 Okt:** modul generasi baru menjalankan 1 query akun per request (sebelumnya 2); rekaman identik |
| 5C Pindah ke pola ✅ | Modul dipindah satu per satu, test kontrak dulu, mengikuti checklist di `standar-kode.md` | **Selesai 19 Okt:** `office` (3.115 → 1.327 baris), `admin-access` (1.742 → ±830), `web-navigation` (2.654 → ±1.250), `admin-account` (3.912 → 1.574), `chair` (1.150 → 420), `admin-permission` (1.074 → 431), `audit-log` (838 → 296), `attachment` (1.386 → 528), `website-page` (976 → 787, jadi folder). Tidak ada lagi salinan `getSessionScope`; rekaman tiap modul identik. Bug yang ditemukan di jalan: BE-006 sampai BE-010, SEC-003, SEC-004, SEC-007 |
| 5C lanjutan ✅ | Modul generasi baru yang punya kode gagal sendiri diberi test kontrak dulu, lalu `try/catch` diganti `onFailure` | **Selesai 20 Okt:** `faq`, `public-contact`, `article`, `product-category`, `product` (jadi folder), `analytics`, dan semua route publik; rekaman identik. Tersisa hanya `try/catch` yang memetakan layanan luar ke 502/503 (`seo-console`, `content-assistant`, beacon analytics, sitemap). Bug di jalan: BE-011, BE-012, BE-013 |
| 5D Aturan data ✅ (20 Okt; bentuk list penuh menyusul di 6D) | Keputusan pemilik 20 Okt dan data yang dibutuhkan UI baru, daftar lengkap di `rencana-ui-admin.md` (D-1 sampai D-6): kategori yang masih punya produk tidak bisa dinonaktifkan atau dihapus; navigasi `primary` tidak bisa dihapus; jumlah produk per kategori, jumlah pemakaian media, filter produk per kategori; satu format list (`total` dan `total_all`) dikerjakan bersama tabel baru di 6D | Semua butir D berstatus selesai, dengan test kontrak |

### Fase 6: Frontend satu pola

Hasil survei 6A (21 Oktober), dasar standar `standar-kode.md` bagian 4:

| Bagian | Admin | Website publik |
| --- | --- | --- |
| Ukuran | 270 file TypeScript (±39.800 baris), 25 file SCSS modul (±5.400 baris) | ±20.100 baris TypeScript, ±2.600 baris SCSS |
| Komponen terbesar | form halaman website 3.233 baris (template 3.179), form akun admin 1.515, form kantor 952, pratinjau halaman 942, form produk 813 (template 1.299), komponen tabel 814 | Tidak ada di atas 450 baris |
| Sisa template Kartify | `settings.json` demo diunduh setiap admin dibuka; store `store`, `state`, `country` (dipakai halaman akun), `tag` dan `menu` (tidak dipakai, halaman tag tidak punya route); 9 tipe tema/toko tanpa pemakai; `fr.json` | 31 store NGXS, lebih dari 20 service yang mengambil data demo `assets/data/*.json` (keranjang, wishlist, kupon, order, dan seterusnya) |
| Gaya ganda | `.form-control`/`.form-label`/`.input-group-text` ditimpa di 6 modul; blok kartu metrik dan tombol perbarui tersalin di dasbor dan analitik | Belum disurvei mendalam (dikerjakan di 6B) |
| Lint | 0 error, 554 peringatan (435 urutan import, 114 tipe `any`) | 0 error, 90 peringatan |
| Aliran data | Komponen tidak memanggil `HttpClient` langsung (sudah benar) | Sama |
| Test | Belum ada test unit frontend; 5 test browser di `ops/e2e` | Sama |

| Langkah | Isi | Selesai bila |
| --- | --- | --- |
| 6A Survei dan standar ✅ | Survei mendalam admin dan public; lengkapi standar frontend | **Selesai 21 Okt:** `standar-kode.md` bagian 4 lengkap (struktur, aliran data, lapisan gaya, komponen bersama, ukuran, bahasa, lint, bukti) |
| 6B Website publik ✅ | Buang sisa toko v2 dan demo Kartify yang tidak dipakai; tetap tersimpan di tag arsip | **Selesai 21 Okt:** tidak ada lagi request ke `assets/data` (sebelumnya 5 file per kunjungan; dicek di 15 halaman); konfigurasi situs pindah ke `shared/data/*.ts`; 16 dari 31 store dan tema/tata letak demo dibuang (FE-011); TypeScript ±20.100 → ±14.300 baris; lint 90 → 78. Ikon akun, favorit, dan keranjang di header **dipertahankan** sebagai penanda market MATEX yang akan datang (keputusan pemilik) |
| 6C Admin ✅ | Pecah komponen raksasa (form halaman website 3.233 baris, form akun admin 1.515, form kantor 952, form produk 813); satukan `directive/` dan `directives/`; buang sisa Kartify di admin (`settings.json` demo, store `store`/`state`/`country`/`tag`/`menu` dan halaman tag tanpa route, tipe tema/toko tanpa pemakai, `fr.json`) | Tidak ada komponen di atas sekitar 800 baris. **Kemajuan:** sisa Kartify dan satu folder `directives` selesai. Form halaman website dipecah: induk 62 baris, enam tab sebagai komponen anak (template terbesar: Konten 819, Media 616), state bersama di `WebsitePageEditorService` (1.305 baris) dan `WebsitePagePublicationService` (318) yang disediakan form, helper murni di `website-page-form.util.ts`, gaya pindah ke global `pages/_website-page.scss`; dua handler asisten yang tombolnya sudah hilang dibuang. Bukti: test browser baru (4 test: semua tab, simpan judul, simpan Beranda/Tentang terekam identik, handler tiap tab) dan screenshot semua tab terang/gelap identik. Sisa di form ini: service editor dan template Konten masih di atas batas (calon pecahan: alur simpan/validasi, bagian Beranda). Form akun admin dipecah dengan pola yang sama: induk 47 baris, empat bagian sebagai komponen anak (Profil, Kontak, Penempatan, Kata Sandi; template terbesar 201), state bersama di `AdminAccountFormService` (722) dan lookup Select2 di `AdminAccountLookupService` (461) yang disediakan form, helper murni di `form-admin-account.util.ts`, gaya pindah ke global `pages/_admin-account.scss`. Bukti: test browser baru `admin-account-form.spec.ts` (3 test: buat dengan semua handler, edit tersimpan tanpa perubahan terekam identik, edit nama dan telepon kedua) dan screenshot buat/edit terang/gelap identik piksel; `npm run test:write` penuh 127 lolos. Form kantor dipecah: induk 58 baris, enam tab sebagai komponen anak (template terbesar: Media 126; tab Jam dan Media memegang handler-nya sendiri, modal media pindah ke tab Media), state bersama, patch data edit, dan validasi simpan di `OfficeFormService` (572) yang disediakan form, helper murni di `form-office.util.ts`, gaya pindah ke global `pages/_office.scss` (dua tombol hapus diberi `.btn` agar tetap menang dari `.btn.btn-light-bg` di `src/styles.scss`). Bukti: test browser baru `office-form.spec.ts` (3 test: buat dengan handler semua tab, edit kantor berlokasi, simpan tanpa perubahan terekam identik) dan 32 screenshot (semua tab, buat/edit, terang/gelap) identik piksel; `npm run test:write` penuh 130 lolos. Pratinjau halaman dipecah: komponen tinggal 165 baris (input, bahasa, ukuran layar, blob URL), dokumen iframe dibangun fungsi murni di `website-page-preview.util.ts` (408), stylesheet-nya `website-page-preview.styles.ts` (351), gaya komponen pindah ke `pages/_website-page.scss` di bawah `.website-page-preview`. Bukti: test browser baru `website-page-preview.spec.ts` (3 test: terms, home, about di dua bahasa dan semua ukuran layar) merekam dokumen pratinjau; enam dokumen sebelum/sesudah identik kecuali indentasi baris; 12 screenshot sama kecuali ±1 nilai warna di 3 piksel antialias sudut yang juga berubah antar run build baru; `npm run test:write` penuh 133 lolos. Celah: data awal tidak punya gambar hero/galeri, jadi cabang itu tidak ikut terbandingkan (kodenya dipindah apa adanya). Form produk dipecah: induk 47 baris, lima tab sebagai komponen anak (template terbesar: Harga & Kanal 365), state, muat data edit, dan simpan di `ProductFormService` (558), bantuan penulisan di `ProductAssistantService` (144), keduanya disediakan form; opsi dan tipe di `form-product.model.ts`, helper murni di `form-product.util.ts`. `form-product.scss` tetap gaya komponen yang dipakai induk dan tiap tab: percobaan pindah ke global mengubah tampilan (selektor bertingkat kehilangan bobot, `.input-group-text` kalah dari `src/styles.scss`), jadi ikut dipindah bersama timpaan elemen dasar lain di 6D (catatan di `standar-kode.md` 4.3). Bukti: test browser baru `product-form.spec.ts` (2 test: buat dengan handler semua tab, simpan tanpa perubahan terekam identik) dan 26 screenshot (semua tab, buat/edit, dua bahasa, terang/gelap) sama kecuali ±1 nilai warna di 2 piksel antialias, noise yang juga muncul antar run baseline; `npm run test:write` penuh 135 lolos. Tabel bersama dirapikan: helper murni (ukuran halaman, normalisasi state URL, cek izin, nilai switch, kondisi aksi, path bertingkat) pindah ke `table.util.ts`, komponen tinggal 740 baris, template tidak berubah. Bukti: test browser baru `table.spec.ts` (2 test: cari, urut, ukuran halaman, centang, switch status, menu aksi di FAQ; rentang tanggal di log aktivitas) dan 20 screenshot tujuh daftar terang/gelap identik piksel; `npm run test:write` penuh 137 lolos. Form artikel dipecah (25 Okt): induk 47 baris, lima tab (template terbesar: Konten 204), `BlogFormService` (285) dan `BlogAssistantService` (83) disediakan form, helper di `form-blog.util.ts`; tiga handler asisten tanpa tombol (`generateArticle`, `copyAndTranslateToEnglish`, `slugify`) dibuang; `form-blog.scss` tetap gaya komponen bersama seperti form produk. Bukti: test browser baru `blog-form.spec.ts` (2 test), simpan tanpa perubahan terekam identik, 28 screenshot sama kecuali ±1 nilai warna di 1–2 piksel antialias; `npm run test:write` penuh 139 lolos. `theme.interface.ts` (1.594 baris tipe tema Kartify) dibuang bersama potongan store "App Setting" dan stub aksi setting yang tidak pernah di-dispatch; build dan suite penuh (139) lolos. Sisa form halaman website selesai (25 Okt): alur pratinjau/simpan pindah ke `WebsitePageSaveService` (440) dan bantuan penulisan ke `WebsitePageAssistantService`, payload simpan dan draf media jadi fungsi murni di util; `WebsitePageEditorService` tinggal 716. Blok Beranda dan highlight Tentang keluar dari tab Konten jadi `WebsitePageHomeContent` / `WebsitePageAboutContent` (tab Konten 381), slot media Beranda keluar dari tab Media jadi `WebsitePageHomeMedia` (tab Media 441). Bukti: spec `website-page-form` dan `website-page-preview` lolos, rekaman simpan dan enam dokumen pratinjau identik byte per byte, 52 screenshot (tiga halaman, semua tab, dua bahasa, terang/gelap) sama kecuali ±1 nilai warna di beberapa piksel antialias. Empat spec browser yang rapuh saat mesin sibuk diperbaiki (pilih gambar hasil upload lewat id, tunggu tab Unggah, tutup modal hapus lewat tombol); `npm run test:write` penuh 139 lolos. **Tidak ada lagi file admin di atas batas** (TS terbesar: `activity-log.ts` 770, `table.ts` 740; template terbesar `table.html` 551). FE-014 selesai (25 Okt): mode buat yang tidak terjangkau dibuang dari form halaman website. **6C selesai.** |
| 6D UI/UX admin | Temuan pemilik 20 Okt, daftar lengkap di `rencana-ui-admin.md`: global dulu (huruf area isi sedikit lebih kecil, warna kontrol form seragam, tabel versi baru, kotak bantuan "?" dan drawer panduan, tombol perbarui berjeda, tombol kembali), lalu per halaman (dasbor/analitik/SEO, navigasi `primary`, bug input telepon, tombol simpan halaman website, kategori, filter produk, penanda pemakaian media). SCSS ditulis sekali di global; SCSS modul hanya untuk yang khas halaman. Progres 26 Okt (live di `6725e56`): U-1 sampai U-13 dan U-15 sampai U-18 selesai (U-9 header selalu tampil, U-10 bug input telepon, U-11 tombol simpan halaman website tetap terlihat, U-12 halaman Kategori, U-13 filter kategori daftar Produk, U-18 urutan tanpa angka ketik). U-14 (penanda Dipakai di Media) dan P-1 (penanda MATEX Market segera hadir di header website) live; P-2 (Tag populer beranda) live di `6210bcf`. Sisa: bug kontras mode gelap; temuan Dasbor memanggil analitik tanpa izin (403) | Semua butir U selesai atau ditinggalkan dengan alasan; SCSS modul berkurang |
| 6E Lint dan test | Peringatan lint 0 (urutan import, tipe `any`); test browser untuk halaman yang disentuh | Lint admin dan public 0 peringatan |

## Ujung sementara: "MATEX v1.1, Fondasi Rapi"

Target sementara yang sedang dikejar. Tercapai bila semua ini benar:

- [ ] Semua modul backend memakai satu pola dan punya test kontrak API.
- [ ] Backend: format dan lint seragam, tanpa peringatan; tidak ada fungsi bantu kembar.
- [ ] Website publik tanpa sisa fitur toko v2; admin tanpa komponen raksasa.
- [ ] Temuan UI/UX admin 20 Oktober (`rencana-ui-admin.md`) selesai.
- [ ] Lint frontend 0 peringatan.
- [ ] Satu format pagination dan satu cara soft delete di seluruh API.
- [ ] Semua test (unit, kontrak API, browser) lulus, dan semuanya sudah di production.
- [ ] `standar-kode.md` dan peta jalan ini mutakhir.

## Setelah itu

1. **Fitur lanjutan v1**, dari roadmap bisnis (`production-v1-readiness-audit.md` dan `public-content-roadmap.md`).
2. **v2: commerce** (keranjang, pesanan, pembayaran). Desainnya diambil dari tag `kartify-reference-v1`, logikanya ditulis baru mengikuti standar.
3. Aplikasi mobile, dan keputusan soal semi-open-source.

## Temuan terbuka (tidak menghalangi)

| ID | Ringkas | Rencana |
| --- | --- | --- |
| FE-012 | Halaman produk/kategori/artikel yang tidak ada menjawab 500 di build e2e (production benar 404) | 6E |
| FE-013 | Halaman "My account" admin tidak menyimpan apa pun (aksi profil, kata sandi, dan detail toko masih kosong dari Kartify) | 6D, U-16 ✅ (26 Okt) |
| SEC-007 (sisa) | Server SSR public dan admin (Angular) masih mengirim `X-Powered-By: Express` | Fase 6, bersama perapian frontend |
| Catatan produk | Kategori yang dihapus tetap terhubung ke produknya dan tetap "memakai" gambarnya; navigasi "primary" bisa dihapus | Diputuskan pemilik 20 Okt: dikerjakan di 5D (D-1, D-3) |
| DB-002 | Migration 013 gagal di MariaDB | Tidak relevan selama lokal dan production memakai MySQL 8.4 |
| DB-003 | Beberapa relasi belum dikunci foreign key | Bersama migration 5D |
| DB-004 | Daftar izin global, belum per perusahaan | Diputuskan saat multi-perusahaan benar-benar dipakai |
| V-6 | User database production boleh login dari host mana saja | Diterima: dikelola CloudPanel, port database tertutup firewall |
| FE-004, DOC-001, TEST-001 | Port default public, dokumen lama, test frontend | Fase 6 |

## Rutinitas

- **Backup** otomatis setiap malam di VPS, lalu disalin terenkripsi ke Google Drive (disimpan 30 hari).
- **Latihan restore** setiap 3 bulan (berikutnya paling lambat **19 Januari 2027**), dan selalu sebelum migration besar.
- **Deploy:** semua test lulus di lokal, push ke GitHub, lalu `ops/deploy-production.sh` di VPS sebagai user `matexindo`, diikuti cek health dan halaman utama. Push dan deploy selalu atas izin pemilik.
