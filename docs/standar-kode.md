# Standar Kode MATEX

Pegangan cara menulis dan merapikan kode MATEX. Tujuannya:

- **Konsisten.** Satu pola untuk satu jenis pekerjaan. Modul baru langsung mengikuti pola yang sama, dan pola lama dipindahkan ke pola baru secara bertahap. Tidak boleh ada pola ketiga.
- **Efisien.** Tidak ada kerja ganda, misalnya query yang sama dijalankan dua kali dalam satu request, atau fungsi bantu yang disalin ke banyak file.
- **Mudah dibaca dan dirawat.** Nama yang jelas, file yang tidak raksasa, dan struktur folder yang bisa ditebak.
- **Aman diubah.** Setiap perubahan dijaga test dan dibuktikan.

Status pekerjaan dan urutan tahapnya ada di `docs/peta-jalan.md`. Riwayat temuan ada di `docs/audit-awal-claude-2026-10-18.md`.

## 1. Prinsip kerja

1. **Perilaku tidak berubah saat merapikan.** Merapikan berarti memindah, memecah, mengganti nama, atau menyatukan kode yang kembar. Respons API, isi database, dan tampilan harus tetap sama. Kalau sebuah perapian memang mengubah perilaku (misalnya menyeragamkan format respons), itu dikerjakan sebagai perubahan terpisah yang direncanakan bersama frontend.
2. **Pengaman dulu, baru dirapikan.** Sebelum modul disentuh, harus ada test yang bisa menangkap perubahan perilaku.
3. **Setiap langkah ada buktinya.** Contohnya hasil build identik, rekaman respons API identik, atau test yang gagal kalau sengaja dirusak. "Kelihatannya sama" tidak cukup.
4. **Bug yang ketemu diperbaiki terpisah**, di commit sendiri sebelum perapian, dan dicatat di laporan audit.
5. **Commit kecil dan jelas**, dengan urutan: test + perbaikan bug, lalu perapian, lalu dokumen. Perubahan format saja (Prettier) selalu di commit tersendiri dan dicatat di `.git-blame-ignore-revs`.
6. **Satu modul selesai dulu baru pindah.** Tidak ada modul yang dibiarkan setengah jalan.
7. **Pakai yang sudah ada.** Sebelum menulis fungsi bantu, cek `backend/src/helper/`. Sebelum membuat tampilan baru, cek desain Kartify di tag `kartify-reference-v1` (lihat README).

## 2. Backend

### 2.1 Struktur folder

```
backend/src/
  app.ts, db.ts, hsid.ts
  config/       pengaturan dari environment             *.config.ts
  middleware/   middleware Express                      *.middleware.ts
  helper/       fungsi bantu lintas modul               *.helper.ts
  service/      integrasi luar (email, dan seterusnya)  *.service.ts
  interface/    tipe bersama                            *.interface.ts
  ctrl/admin/   route admin (di-load otomatis, urut abjad)
  ctrl/public/  route website publik (di-load otomatis)
```

Nama file dan folder memakai huruf kecil dengan tanda hubung (`web-navigation.ts`), dan akhiran sesuai jenisnya seperti di atas. File route tidak memakai akhiran.

### 2.2 Pola modul route

Satu modul adalah satu urusan bisnis (kantor, profil akses, navigasi, dan seterusnya). Bentuknya salah satu dari dua ini:

- **Modul kecil** (sampai sekitar 500 baris): satu file `ctrl/admin/<modul>.ts`.
- **Modul besar**: `ctrl/admin/<modul>.ts` hanya mendaftarkan router, dan isinya ada di folder `ctrl/admin/<modul>/`. Folder ini sengaja tidak di-load otomatis, jadi file pendaftar itulah yang menentukan urutan route. Contohnya `office`, `admin-access`, `web-navigation`, dan `admin-account`.

Nama file di dalam folder modul:

| File | Isi |
| --- | --- |
| `read.ts` | list dan detail |
| `create.ts` | tambah data |
| `update.ts` | ubah data dan ubah status |
| `delete.ts` | hapus data |
| `<nama-urusan>.ts` | fungsi bantu khusus modul itu, misalnya `input.ts`, `permissions.ts`, `items.ts` |

File pendaftar memakai satu templat komentar: apa modulnya, path API-nya, apakah urutan route penting (dan kenapa), serta file test kontraknya. Path tetap seperti `/me` atau `/permission-matrix` harus didaftarkan sebelum `/:id`, karena Express mencocokkan route sesuai urutan pendaftaran.

### 2.3 Bentuk sebuah handler

Target pola (Fase 5; modul generasi baru seperti `faq.ts` dan `product.ts` sudah mendekati):

1. Middleware: `verifyToken`, lalu `requirePermission("<modul>.<aksi>")`.
2. Scope sesi (perusahaan, kantor, akses) diambil dari helper bersama, bukan query sendiri. Target akhirnya: dibaca dari `req`, yang sudah diisi middleware izin, sehingga tidak ada query akun yang diulang.
3. Input dibaca dan divalidasi dengan helper bersama (`helper/input.helper.ts`, rencana Fase 5), dan menolak dengan kode yang jelas.
4. Perubahan data memakai transaksi (helper `withTransaction`, rencana) dan menulis audit log (`writeAuditLog`).
5. Respons memakai `sendSuccess` dan `sendError` (`helper/api-response.helper.ts`), bukan `res.json` langsung.
6. Error tak terduga diteruskan ke penanganan error pusat di `app.ts` (Express 5 sudah meneruskan error dari fungsi async), kecuali kalau handler perlu rollback.

### 2.4 Konvensi API dan database

- **Kode respons** HURUF_BESAR dengan awalan modul: `OFFICE_NOT_FOUND`, `ADMIN_ACCESS_NAME_EXISTS`. Status HTTP: 400 input salah, 401 belum login, 403 tidak berizin atau di luar scope, 404 tidak ada, 409 bentrok dengan data lain.
- **ID di API** selalu disamarkan dengan hashids (`hsid.ts`). ID yang tidak valid dijawab 400 atau 404, tidak pernah 500.
- **Query** selalu memakai parameter (`?`) dan selalu dibatasi perusahaan (`id_master_comp`).
- **Nama lama yang dipertahankan**, karena mengganti nama API atau tabel berisiko tinggi tapi manfaatnya kecil: path `/api/v1/admin-acct`, tabel `admin_acct` dan `master_comp`, serta istilah `chair` (= jabatan).
- **Belum seragam, diputuskan di Fase 5:** soft delete ada yang memakai status 99 (`office`, `admin_acct`, `admin_access`, `chair`) dan ada yang memakai kolom `*_deleted_at` (`web_navigation`, `faq`). Format pagination juga ada dua: `pagerows` dan `has_more`. Penyeragamannya mengubah perilaku, jadi dikerjakan bersama frontend.

### 2.5 Gaya penulisan

- **Format:** satu config Prettier di root repo (`.prettierrc.json`: lebar 100, petik tunggal). Backend dan `ops` sudah memakainya; frontend masih memakai config lokalnya (admin lebar 80, public 100) dan disamakan di Fase 6. Perintah: `npm run format` dan `npm run format:check` di `backend` dan `ops/e2e`.
- **Lint backend:** Oxlint (`npm run lint` di `backend`, config `backend/.oxlintrc.json`). Dipilih karena backend memakai TypeScript 7, yang belum didukung typescript-eslint. Aturan: kategori *correctness* dan variabel tak terpakai adalah **error** (harus 0); tipe `any`, `==`, dan file di atas 800 baris adalah **warning**, yaitu daftar utang yang dicicil di Fase 5C. Frontend tetap memakai ESLint karena butuh aturan template Angular.
- Komentar menjelaskan **kenapa**, bukan mengulang kode. Komentar pembatas `//====` dari generasi kode lama sudah diringkas menjadi satu baris komentar biasa (Fase 5A). Tidak menulis pembatas baru.
- Tipe nyata, bukan `any`, untuk data yang keluar-masuk fungsi.

## 3. Test dan bukti

| Jenis | Tempat | Perintah | Untuk |
| --- | --- | --- | --- |
| Unit backend | `backend/tests/*.test.ts` | `npm test` (di `backend`) | helper dan aturan murni |
| Kontrak API | `ops/e2e/write/*-api.spec.ts` | `npm run test:api` (di `ops/e2e`) | perilaku endpoint terhadap MySQL asli |
| Browser | `ops/e2e/write/*.spec.ts` | `npm run test:write` | alur admin dan tampilan publik |
| Rilis (read-only) | `ops/e2e/tests` | `npm test` | cek setelah deploy |

Setiap modul backend yang disentuh harus punya test kontrak dulu. Helper di `ops/e2e/write/api-contract.ts` (`login`, `expectCode`, `adminReferences`, `createAdminAccount`, `uploadSample`) dipakai oleh semua spec.

### Alur kerja standar per modul

1. **Petakan** route (method, path, izin), helper yang dipakai bersama, dan urutan route yang penting.
2. **Tulis test kontrak API**: kode status, kode respons, field utama, aturan keamanan, dan validasi input.
3. **Perbaiki bug yang ditemukan** (commit terpisah, dicatat di audit).
4. **Rekam perilaku**: `MATEX_E2E_RECORD=recordings/sebelum npm run test:api` menyimpan semua respons dan isi tabel terkait, dengan nilai yang selalu berubah (waktu, uuid, token, nama file acak) disamarkan.
5. **Rapikan**: pecah, pindahkan, atau satukan ke pola standar.
6. **Buktikan**: rekam ulang ke `recordings/sesudah`, lalu bandingkan (harus identik). Setelah itu typecheck, test backend, dan suite e2e lengkap. Kalau urutan route penting, balik urutannya sekali untuk memastikan test gagal, lalu kembalikan.
7. **Catat** di laporan audit, peta jalan, dan README bila perlu.

## 4. Frontend

Standar frontend dilengkapi di Fase 6, setelah survei lengkap. Yang sudah berlaku:

- **Struktur:** `components/<fitur>/` untuk halaman, `shared/` untuk komponen, layanan, store (NGXS), dan tipe bersama, serta `core/` untuk guard, interceptor, dan utilitas inti.
- **Nama file:** komponen tanpa akhiran (`office.ts`, `form-office.ts`), selain komponen memakai akhiran (`*.service.ts`, `*.state.ts`, `*.action.ts`, `*.interface.ts`, `*.routes.ts`).
- **Format:** Prettier pada `src` (`npm run format`). Perubahan format saja dikerjakan di commit tersendiri.
- **Desain:** sebelum membuat atau merombak tampilan, cek desain Kartify yang cocok di tag `kartify-reference-v1`. Kartify adalah acuan tampilan; data demo dan logika tokonya bukan logika bisnis MATEX.
- **Bukti perapian:** CSS hasil build identik, dan JavaScript hanya berbeda di bagian yang memang diubah. Ditambah test browser untuk halaman yang disentuh.

Target Fase 6 (rinciannya di peta jalan): satu folder per jenis (tidak ada kembar seperti `directive/` dan `directives/`), tidak ada komponen di atas sekitar 800 baris, tidak ada sisa fitur toko v2 di website publik, dan lint tanpa peringatan.
