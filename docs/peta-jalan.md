# Peta Jalan MATEX

Ringkasan posisi proyek: sudah sampai mana, sedang ke mana, dan ujung sementaranya. Dokumen ini diperbarui setiap kali satu tahap selesai. Aturan cara menulis kode ada di `docs/standar-kode.md`.

_Terakhir diperbarui: 19 Oktober 2026._

## Posisi sekarang

- **Production:** `matexindo.com` (publik) dan `internal.matexindo.com` (admin) berjalan di commit `2fb590a` (deploy 19 Oktober 2026, dengan backup `matex-20261019T155243Z` dan migration 025).
- **Belum di-deploy:** 15 commit lokal dari 5C lanjutan (20 Oktober), tanpa migration: perbaikan BE-011 sampai BE-013 dan perapian modul generasi baru. Deploy cukup `ops/deploy-production.sh`, atas izin pemilik.
- **Kondisi:** fondasi operasional aman (backup terenkripsi di luar VPS, restore sudah dilatih, SSH root hanya dengan kunci, log dirotasi). Semua modul admin generasi lama sudah satu pola dan dijaga test kontrak.
- **Test:** backend 84 unit test; e2e 118 test (113 kontrak API + 5 browser). Semuanya lulus.

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
| 5D Keputusan seragam | Satu format pagination dan satu cara soft delete. Ini mengubah perilaku, jadi dikerjakan bersama frontend di Fase 6 dan, bila perlu, dengan migration | Satu format di seluruh API |

### Fase 6: Frontend satu pola

| Langkah | Isi | Selesai bila |
| --- | --- | --- |
| 6A Survei dan standar | Survei mendalam admin dan public; lengkapi standar frontend | `standar-kode.md` bagian 4 lengkap |
| 6B Website publik | Buang sisa fitur toko v2 yang masih terpasang (cart, wishlist, compare, coupon, order, wallet, refund, point, currency, review, Q&A, pembayaran: belasan store NGXS) dan file demo Kartify yang diunduh setiap kunjungan (`theme.json`, `currency.json`). Tetap tersimpan di tag arsip | Tidak ada request demo saat halaman dibuka; test browser lulus |
| 6C Admin | Pecah komponen raksasa (form halaman website 3.233 baris, form akun admin 1.515, form kantor 952, form produk 813); satukan `directive/` dan `directives/`; buang tipe tema Kartify yang tidak dipakai | Tidak ada komponen di atas sekitar 800 baris |
| 6D Lint dan test | Peringatan lint 0 (urutan import, tipe `any`); test browser untuk halaman yang disentuh; jalankan keputusan 5D | Lint admin dan public 0 peringatan |

## Ujung sementara: "MATEX v1.1, Fondasi Rapi"

Target sementara yang sedang dikejar. Tercapai bila semua ini benar:

- [ ] Semua modul backend memakai satu pola dan punya test kontrak API.
- [ ] Backend: format dan lint seragam, tanpa peringatan; tidak ada fungsi bantu kembar.
- [ ] Website publik tanpa sisa fitur toko v2; admin tanpa komponen raksasa.
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
| SEC-007 (sisa) | Server SSR public dan admin (Angular) masih mengirim `X-Powered-By: Express` | Fase 6, bersama perapian frontend |
| Catatan produk | Kategori yang dihapus tetap terhubung ke produknya dan tetap "memakai" gambarnya (gambar tidak bisa dihapus dari Media); menghapus navigasi "primary" tidak dicegah | Diputuskan pemilik, lalu dikerjakan di 5D |
| DB-002 | Migration 013 gagal di MariaDB | Tidak relevan selama lokal dan production memakai MySQL 8.4 |
| DB-003 | Beberapa relasi belum dikunci foreign key | Bersama migration 5D |
| DB-004 | Daftar izin global, belum per perusahaan | Diputuskan saat multi-perusahaan benar-benar dipakai |
| V-6 | User database production boleh login dari host mana saja | Diterima: dikelola CloudPanel, port database tertutup firewall |
| FE-004, DOC-001, TEST-001 | Port default public, dokumen lama, test frontend | Fase 6 |

## Rutinitas

- **Backup** otomatis setiap malam di VPS, lalu disalin terenkripsi ke Google Drive (disimpan 30 hari).
- **Latihan restore** setiap 3 bulan (berikutnya paling lambat **19 Januari 2027**), dan selalu sebelum migration besar.
- **Deploy:** semua test lulus di lokal, push ke GitHub, lalu `ops/deploy-production.sh` di VPS sebagai user `matexindo`, diikuti cek health dan halaman utama. Push dan deploy selalu atas izin pemilik.
