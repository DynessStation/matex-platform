# Konsep Kerapian Kode MATEX

Dokumen ini adalah pegangan untuk merapikan kode MATEX: apa targetnya, urutannya, dan langkah kerja yang sama untuk setiap modul. Tujuannya supaya kerapian dikerjakan bertahap, bisa dibuktikan, dan tidak mengganggu fitur yang sudah jalan.

Status temuan dan riwayat perbaikan dicatat di `docs/audit-awal-claude-2026-10-18.md`. Dokumen ini hanya berisi cara kerja dan rencana.

## Prinsip

1. **Perilaku tidak berubah.** Merapikan berarti memindah, memecah, atau mengganti nama. Respons API, isi database, dan tampilan harus tetap sama.
2. **Pengaman dulu, baru dirapikan.** Sebelum sebuah modul disentuh, harus ada test yang bisa menangkap kalau perilakunya berubah.
3. **Setiap langkah ada buktinya.** Contohnya hasil build identik, rekaman respons API identik, atau test yang gagal kalau sengaja dirusak. "Kelihatannya sama" tidak cukup.
4. **Bug yang ketemu diperbaiki terpisah.** Bug yang ditemukan saat menulis test diperbaiki di commit sendiri, sebelum modulnya dipecah, dan dicatat di laporan audit. Commit perapian murni tidak boleh membawa perubahan perilaku.
5. **Commit kecil dan jelas.** Urutannya: test + perbaikan bug, lalu perapian, lalu dokumen. Perubahan format saja (Prettier) selalu di commit tersendiri dan dicatat di `.git-blame-ignore-revs`.
6. **Satu modul selesai dulu baru pindah.** Tidak ada modul yang dibiarkan setengah dipecah.

## Alur kerja standar per modul

Langkah ini dipakai untuk setiap controller backend yang dipecah. Contoh lengkapnya `auth.ts` di Fase 4C.

1. **Petakan.** Daftar route (method, path, izin), helper yang dipakai bersama, dan urutan route yang penting. Express mencocokkan route sesuai urutan daftar, jadi path tetap seperti `/me` harus didaftarkan sebelum `/:id`.
2. **Tulis test kontrak API** di `ops/e2e/write/<modul>-api.spec.ts`. Test berjalan ke MySQL asli di stack e2e yang terisolasi. Isinya: kode status, kode respons, field utama, aturan keamanan (izin, scope perusahaan/kantor), dan validasi input. Jalankan dengan `npm run test:api` di `ops/e2e`.
3. **Perbaiki bug yang ditemukan** (commit terpisah, dicatat di audit).
4. **Rekam perilaku sebelum dipecah.** Jalankan test kontrak dengan `MATEX_E2E_RECORD=<folder>`. Hasilnya: semua respons JSON beserta isi tabel terkait sesudahnya, dengan nilai yang selalu berubah (waktu, uuid, token) disamarkan.
5. **Pecah modulnya.** Handler dipindah apa adanya ke folder `src/ctrl/admin/<modul>/`, satu file per kelompok route. File lama tinggal jadi pengatur urutan route. Folder ini sengaja tidak di-load otomatis oleh `app.ts`.
6. **Buktikan.** Rekam ulang dan bandingkan: harus identik. Lalu typecheck, test backend, dan suite e2e lengkap. Kalau urutan route penting, balik urutannya sekali untuk memastikan test kontrak gagal, lalu kembalikan.
7. **Catat** di laporan audit dan README bila perlu.

## Struktur target backend

```
backend/src/
  app.ts, db.ts, hsid.ts
  config/       pengaturan dari environment
  middleware/   middleware Express (login, izin, request context)
  ctrl/admin/   route admin, satu file per modul (di-load otomatis, urut abjad)
  ctrl/admin/<modul>/   isi modul besar yang sudah dipecah (tidak di-load otomatis)
  ctrl/public/  route website publik
  helper/       fungsi bantu yang dipakai lintas modul
  service/      integrasi luar (email, dan seterusnya)
  interface/    tipe bersama
```

Nama file: huruf kecil dengan tanda hubung, dan akhiran sesuai jenisnya (`*.middleware.ts`, `*.helper.ts`, `*.service.ts`, `*.config.ts`). Route modul tidak memakai akhiran.

Patokan kapan sebuah controller dipecah: lebih dari sekitar 1.000 baris, atau isinya bercampur beberapa urusan.

## Urutan kerja

| Tahap | Isi | Status |
| --- | --- | --- |
| 4A | Buang kode Kartify yang tidak terpakai (arsip di tag `kartify-reference-v1`) | Selesai |
| 4B | Format frontend dengan Prettier, build CSS admin deterministik | Selesai |
| 4C | Test kontrak akun admin, pecah `auth.ts` | Selesai |
| 4D | Struktur backend: `middleware/` keluar dari `ctrl/`, buang `helpers.ts` yang mati, perkakas test kontrak (`test:api`, rekaman) | Selesai |
| 4E | `office.ts` (4.076 baris) | Selesai |
| 4F | `admin-access.ts` (2.316 baris) | Selesai |
| 4G | `web-navigation.ts` (2.622 baris) | Selesai |
| 4H | Controller 1.000–1.850 baris: `attachment.ts`, `chair.ts`, `admin-permission.ts`, `website-page.ts`, `audit-log.ts`. Dipecah saat fiturnya diubah, atau lebih awal bila test kontraknya sudah ada | Nanti |
| 5 | Frontend (lihat di bawah) | Nanti |

## Frontend (Fase 5, rencana awal)

Frontend dikerjakan setelah backend rapi, dengan rencana rinci tersendiri yang disusun dari survei kodenya. Prinsip dan alurnya sama; yang berbeda adalah jenis pengamannya:

- **Pengaman:** test browser (Playwright) untuk halaman yang akan disentuh, ditambah bukti build: CSS identik, dan JavaScript hanya berbeda di bagian yang memang diubah.
- **Calon pekerjaan:** merapikan struktur `shared/` (ada folder kembar seperti `directive/` dan `directives/`), memisahkan sisa kode Kartify dari kode MATEX, mengurangi tipe `any` dan memperbaiki urutan import (sisa peringatan lint), serta memecah komponen yang terlalu besar.
- **Desain:** sebelum membuat atau merombak modul, cek dulu desain Kartify yang cocok di tag `kartify-reference-v1` (lihat README).
