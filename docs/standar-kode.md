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
- **Modul besar**: `ctrl/admin/<modul>.ts` hanya mendaftarkan router, dan isinya ada di folder `ctrl/admin/<modul>/`. Folder ini sengaja tidak di-load otomatis, jadi file pendaftar itulah yang menentukan urutan route. Contohnya `office`, `admin-access`, `web-navigation`, `admin-account`, dan `website-page`.

Setiap file route, termasuk file pendaftar, mengekspor `express.Router()`. Jangan `express()`: sub-app memasang lagi header `X-Powered-By` yang dimatikan `app.ts` (SEC-007).

Nama file di dalam folder modul:

| File | Isi |
| --- | --- |
| `read.ts` | list dan detail |
| `create.ts` | tambah data |
| `update.ts` | ubah data dan ubah status |
| `delete.ts` | hapus data |
| `input.ts` | semua aturan input modul: baca dan validasi body, termasuk cek unik ke database |
| `records.ts` | langkah database yang dipakai bersama route modul (kunci baris, baca relasi, bentuk data respons dan audit) |
| `<nama-urusan>.ts` | urusan khusus lain, misalnya `permissions.ts` (profil akses), `items.ts` dan `reorder.ts` (navigasi) |

File pendaftar memakai satu templat komentar: apa modulnya, path API-nya, apakah urutan route penting (dan kenapa), serta file test kontraknya. Path tetap seperti `/me` atau `/permission-matrix` harus didaftarkan sebelum `/:id`, karena Express mencocokkan route sesuai urutan pendaftaran.

### 2.3 Bentuk sebuah handler

Pola standar (semua modul generasi lama sudah dipindah di Fase 5C; contoh ringkas: `chair.ts`, `audit-log.ts`):

1. Middleware: `verifyToken`, lalu `requirePermission('<modul>.<aksi>')`.
2. Scope sesi lewat `getAdminScope(req)`. Di belakang `requirePermission`, scope sudah dititipkan di `req.adminScope`, jadi tidak ada query akun yang diulang. Jangan menulis query sesi sendiri.
3. Input dibaca dan divalidasi dengan helper bersama, dan ditolak dengan kode yang jelas.
4. Perubahan data memakai `withTransaction` dan menulis audit log (`writeAuditLog`).
5. Respons memakai `sendSuccess` dan `sendError`, bukan `res.json` langsung. Daftar memakai `sendList` (lihat 2.4).
6. Kegagalan yang diharapkan boleh `throw new HttpError(status, kode, pesan)` dari mana saja: penanganan error pusat (`middleware/error-handler.middleware.ts`) menjawabnya, dan `withTransaction` melakukan rollback dulu. Error tak terduga dijawab 500 oleh penanganan yang sama.

Helper bersama di `backend/src/helper/` (cek dulu di sini sebelum menulis fungsi bantu):

| Helper | Isi |
| --- | --- |
| `admin-scope.helper.ts` | `getAdminScope` (admin, perusahaan, kantor, profil akses, full-access) dan `adminHasPermission` |
| `input.helper.ts` | `nullableString`, `trimTo`, `toFlag` / `parseFlag`, `slugFromText`, `contentSlug`, `isValidEmail`, `isValidHttpUrl` |
| `id.helper.ts` | `decodeId(value, codec)` untuk ID hashids |
| `list-query.helper.ts` | `parseListQuery` (page, limit, search, sort, direction, plus nama lama untuk satu rilis), `sortColumn` (hanya kolom yang didaftarkan), `pageMeta`, `countOf` |
| `json.helper.ts` | `parseJsonValue` untuk kolom JSON |
| `transaction.helper.ts` | `withTransaction` |
| `http-error.helper.ts` | `HttpError` |
| `middleware/error-handler.middleware.ts` | `onFailure(kode, pesan, { duplicate })`: kode 500/409 milik route, untuk modul yang API-nya punya kode gagal sendiri |
| `api-response.helper.ts` | `sendSuccess`, `sendError`, `sendList` |
| `audit-log.helper.ts` | `writeAuditLog` |
| `attachment.helper.ts` | `storeAttachment` (validasi per koleksi, gambar jadi WebP, cek isi video), `buildAttachmentUrl`, `deleteStoredAttachment` |

Aturan lintas modul:

- Tabel baru yang menunjuk `attachment` wajib ditambahkan ke daftar `REFERENCES` di `ctrl/admin/attachment.ts`, supaya file yang masih dipakai tidak bisa dihapus (BE-009).
- `INSERT ... ON DUPLICATE KEY UPDATE` hanya untuk tabel yang index uniknya cuma kunci baris itu sendiri. Kalau ada index unik lain (misalnya slug), cek bentrok dengan baris lain dulu dan tolak dengan 409; kalau tidak, MySQL diam-diam mengubah baris milik data lain (BE-013).
- Ubah status dan hapus mengunci barisnya dulu, menjawab 404 kalau datanya tidak ada, dan menulis audit log seperti perubahan lain (BE-012).
- `try/catch` di route hanya untuk memetakan kegagalan layanan luar (502/503) atau membersihkan file; kode gagal 500 milik modul memakai `onFailure`.

### Checklist memindahkan modul lama ke pola standar (Fase 5C)

Contoh lengkapnya modul `office` (3.115 → 1.327 baris, rekaman identik).

1. **Scope dan izin:** hapus salinan `getSessionScope` dan query sesi sendiri; pakai `getAdminScope`. Cek izin tambahan dengan `adminHasPermission(scope, kunci, connection)`.
2. **ID:** `decodeId(req.params.id, keyhsid.idX)`, bukan fungsi decode per modul.
3. **Input:** satu fungsi `read<Modul>Input(body)` dipakai create **dan** update, melempar `HttpError` dengan kode dan pesan yang sama seperti sebelumnya. Kalau create dan update ternyata berbeda aturan, catat sebagai temuan dulu (contoh: BE-006).
4. **Transaksi:** `withTransaction`; jalan keluar yang diharapkan melempar `HttpError` (rollback otomatis). Tidak ada lagi `connection.rollback()` manual, variabel `connection: any`, atau `try/catch` yang hanya menjawab 500.
5. **Query yang kembar** (pengecekan duplikat, pembacaan relasi) jadi satu fungsi di folder modul.
6. **SQL ringkas:** tanpa baris kosong di dalam query; daftar kolom panjang memakai konstanta (contoh `OFFICE_COLUMNS`).
7. **Komentar:** hanya yang menjelaskan *kenapa*. Label yang mengulang kode (`// Commit`, `// Response`, `// Session`) dibuang.
8. **Bentuk respons tetap sama**, termasuk pagination lama; penyeragaman format menunggu 5D.
9. **Bukti:** rekaman sebelum/sesudah identik, test unit dan e2e lulus. Perluas test kontrak dulu untuk jalur yang akan berubah dan belum tercakup.

### 2.4 Konvensi API dan database

- **Kode respons** HURUF_BESAR dengan awalan modul: `OFFICE_NOT_FOUND`, `ADMIN_ACCESS_NAME_EXISTS`. Status HTTP: 400 input salah, 401 belum login, 403 tidak berizin atau di luar scope, 404 tidak ada, 409 bentrok dengan data lain.
- **ID di API** selalu disamarkan dengan hashids (`hsid.ts`). ID yang tidak valid dijawab 400 atau 404, tidak pernah 500.
- **Query** selalu memakai parameter (`?`) dan selalu dibatasi perusahaan (`id_master_comp`).
- **Nama lama yang dipertahankan**, karena mengganti nama API atau tabel berisiko tinggi tapi manfaatnya kecil: path `/api/v1/admin-acct`, tabel `admin_acct` dan `master_comp`, serta istilah `chair` (= jabatan).
- **Daftar (A-2, 27 Okt):** semua daftar menjawab `{ success, code, message, data: [...item], meta }` lewat `sendList`. `meta` berisi `page`, `limit`, `total` (yang cocok dengan pencarian dan filter), `total_all` (sebelum pencarian, untuk "x dari y"), dan `total_pages`; daftar tanpa halaman (pohon kategori) cukup `total` (dan `total_all`). Request: `?page=&limit=&search=&sort=<kunci>&direction=asc|desc`, dibaca `parseListQuery`; kunci sort dipetakan `sortColumn`. Nama lama (`paginate`, `ord`/`srt`, `field`/`sort=asc|desc`, `sortBy` di katalog publik) masih dibaca selama satu rilis lalu dibuang. Frontend: admin membangun query dengan `listParams()` dan membaca `IListResponse<T>`; website publik menerjemahkan dengan `toListQuery`/`toListModel`. Test kontrak `list-totals-api.spec.ts` memeriksa bentuk ini di setiap daftar admin.
- **Soft delete belum seragam:** ada yang memakai status 99 (`office`, `admin_acct`, `admin_access`, `admin_permission`, `chair`) dan ada yang memakai kolom `*_deleted_at`. Diseragamkan ke kolom `*_deleted_at` di A-3.

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

Berlaku untuk `frontend/admin` (panel internal) dan `frontend/public` (website), keduanya Angular 21 dengan SSR dan NGXS. Dasarnya survei Fase 6A (21 Oktober 2026, hasilnya di peta jalan).

### 4.1 Struktur folder

```
src/app/
  components/<fitur>/        halaman: list <fitur>.ts, form-<fitur>/, detail-<fitur>/
  shared/components/ui/      komponen bersama (tabel, form field, media, modal, dan seterusnya)
  shared/services/           satu service per modul API (*.service.ts)
  shared/store/              NGXS: action/ dan state/ per modul
  shared/interface/          tipe bersama (*.interface.ts)
  shared/directives/         directive (satu folder; tidak ada directive/ dan directives/ berdampingan)
  core/                      guard, interceptor, utilitas inti
public/assets/scss/          template Kartify (gaya dasar)
src/styles.scss              lapisan gaya global MATEX
```

Nama file dan folder huruf kecil dengan tanda hubung. Komponen tanpa akhiran (`office.ts`, `form-office.ts`); selain komponen memakai akhiran (`*.service.ts`, `*.state.ts`, `*.action.ts`, `*.interface.ts`, `*.routes.ts`, `*.directive.ts`, `*.pipe.ts`).

### 4.2 Aliran data

- Komponen tidak memanggil `HttpClient` langsung. Jalurnya: komponen → action NGXS → state → service → API. (Survei: sudah dipatuhi, 0 komponen memakai `HttpClient`.)
- Satu service per modul API, memakai `environment.API_URL`. Tidak ada request ke `assets/data/*.json` (data demo Kartify) untuk data apa pun.
- Langganan observable di komponen dibersihkan (`takeUntilDestroyed`), atau dipakai lewat `async` pipe.
- Kode baru memakai gaya Angular sekarang: `input()`, `output()`, `signal()`, dan kontrol alur `@if`/`@for`. Kode lama dengan `@Input()` disesuaikan saat komponennya disentuh.

### 4.3 Gaya (SCSS)

Urutan lapisan, dari dasar ke paling khusus:

1. **Template Kartify** (`public/assets/scss`): variabel (ukuran huruf, warna, jarak) dan komponen dasar (form, tabel, tombol, kartu, modal). Ubah variabelnya di sini bila perubahannya berlaku untuk seluruh aplikasi.
2. **Lapisan global MATEX** (`src/styles.scss`, nanti dipecah ke `src/styles/_*.scss` per urusan): pola yang dipakai lebih dari satu halaman, misalnya status kontrol form, tabel, kotak bantuan, kartu metrik, tombol perbarui.
3. **SCSS modul**: hanya tata letak yang benar-benar khas halaman itu.

Aturan:

- Sebelum menulis gaya, cek apakah Kartify atau lapisan global sudah punya. Kalau sudah, pakai atau ubah; kalau belum dan polanya dipakai di lebih dari satu tempat, tambahkan di global.
- SCSS modul tidak boleh menimpa elemen dasar (`.form-control`, `.form-label`, `.input-group-text`, `.btn`, `table`). Survei menemukan timpaan seperti itu di 6 modul; semuanya dipindah ke global di 6D.
- Blok yang sama di dua modul atau lebih (misalnya `.metric-grid`, `.refresh-button`, `.panel-footer` di dasbor dan analitik) dipindah ke global.
- Warna, ukuran huruf, dan jarak memakai variabel template atau CSS variable (`var(--theme-color)`), bukan angka lepas.
- `::ng-deep` hanya untuk menyentuh library pihak ketiga, dengan komentar alasannya.
- Memindah SCSS komponen ke global: bungkus semuanya dengan satu class di elemen akar komponen (contoh `.website-page-form` di `pages/_website-page.scss`). Satu class setara bobot atribut enkapsulasi Angular, jadi urutan menang-kalah dengan Kartify tetap sama; `:host-context(body.dark-only)` menjadi `body.dark-only &`. Awas aturan dengan bobot sama di `src/styles.scss`: file itu dimuat belakangan, jadi menang (contoh: tombol hapus media perlu `.btn` tambahan). Kesetaraan bobot itu hanya berlaku untuk selektor satu bagian: Angular menempelkan atribut ke setiap bagian, jadi `.a .b` di komponen berbobot dua atribut, sedangkan di global cuma satu class pembungkus. SCSS yang banyak memakai selektor bertingkat atau menimpa elemen dasar (contoh: `form-product.scss`) dibiarkan sebagai gaya komponen sampai 6D; bila komponennya dipecah, induk dan tiap tab memakai file yang sama lewat `styleUrl`. Selalu bandingkan screenshot sebelum/sesudah.

### 4.4 Komponen bersama

Pola yang sudah punya komponen wajib memakainya, tidak dibuat ulang per halaman:

| Pola | Komponen |
| --- | --- |
| Tabel list | `app-table` (`shared/components/ui/table`) |
| Field form | `form-fields` |
| Pilih atau unggah media | `media-box`, `image-upload`, modal media |
| Konfirmasi dan hapus | `confirmation-modal`, `delete-modal` |
| Kosong, error, memuat | `no-data`, `detail-error-state`, `skeleton` |
| Halaman | `pagination` |

Ditambah di 6D (lihat `rencana-ui-admin.md`): kotak bantuan "?" dan drawer panduan, tombol perbarui berjeda, tombol kembali, dan pratinjau gambar (lightbox).

### 4.5 Ukuran

- Komponen (TypeScript) paling banyak sekitar 800 baris, template sekitar 600 baris. Form besar dipecah per tab atau per bagian menjadi komponen anak.
- Pola form bertab (contoh: `website-page-form`): state dan logika bersama di service yang disediakan form itu sendiri (`providers: [XService]`, satu instance per form yang terbuka); tiap tab adalah komponen anak yang meng-inject service itu dan memegang template serta handler miliknya sendiri. Input dan output tetap di form induk dan diserahkan ke service lewat `connect()`. Tab yang memakai `formControlName` memasang `viewProviders` `ControlContainer` agar terikat ke `[formGroup]` induk. Helper tanpa state ke `*.util.ts`, tipe dan konstanta ke `*.model.ts`.
- Saat memindah template ke komponen lain, cek `imports` untuk directive atribut tanpa binding (misalnya `appLocalizedNumber`): yang lupa di-import tidak membuat build gagal, directive-nya diam-diam tidak jalan.
- Data besar yang statis (misalnya daftar kode negara) boleh lebih panjang, dan letaknya di `shared/data/`.

### 4.6 Teks dan bahasa

- Teks yang tampil ke pengguna lewat ngx-translate (`public/assets/i18n/<bahasa>.json`). Bahasa yang dipakai: Indonesia (utama) dan Inggris. Berkas bahasa lain dari template (`fr.json`) dibuang.
- Pesan error dari API ditampilkan dengan terjemahan kode error bila ada, lalu pesan API sebagai cadangan.

### 4.7 Format, lint, dan test

- **Format:** Prettier pada `src` (`npm run format`). Perubahan format saja dikerjakan di commit tersendiri.
- **Lint:** ESLint (`npm run lint`), target 0 peringatan. Perbaikan otomatis (urutan import) dikerjakan di commit tersendiri, terpisah dari perubahan perilaku.
- **Test:** test browser Playwright di `ops/e2e` untuk alur yang disentuh. Halaman yang dirombak di 6D mendapat test browser untuk alur utamanya.

### 4.8 Desain

- Acuan tampilan adalah Kartify (tag `kartify-reference-v1`). Data demo dan logika tokonya bukan logika bisnis MATEX.
- Mockup dari pemilik adalah arah, bukan ukuran pasti: warna, ukuran, dan bentuk mengikuti token yang sudah ada.

### 4.9 Bukti perapian

- Perapian murni (pindah gaya, pecah komponen): CSS hasil build identik atau hanya berbeda di bagian yang memang diubah, tampilan halaman yang disentuh dicek di browser (desktop dan lebar ponsel), dan test browser lulus.
- Cara yang dipakai di 6C untuk form besar: test browser dulu (semua tab terbuka, handler tiap tab, simpan), simpan tanpa perubahan direkam (`MATEX_E2E_RECORD`) lalu dibandingkan sebelum dan sesudah, dan screenshot penuh setiap tab (terang dan gelap) dibandingkan per piksel.
- Perubahan tampilan: sebelum dan sesudahnya dicek di browser, lalu dilaporkan ke pemilik.
