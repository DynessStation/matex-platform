# Laporan Audit Awal Matex Platform v1.0.10

Tanggal: 18 Oktober 2026
Disusun oleh: Claude (asisten teknis), untuk Hardyness
Dasar pemeriksaan: source code di `D:\PROGRAMMING\MATEX` (sama persis dengan GitHub `main`), hasil build/test/lint lokal, database lokal, dan dua pengecekan read-only di VPS yang dijalankan Hardyness sendiri.

Cara membaca laporan ini:

- **Terbukti** artinya sudah dicek langsung dan ada buktinya.
- **Dugaan** artinya masuk akal tapi belum dibuktikan.
- Prioritas: **P0** darurat, **P1** penting segera, **P2** perlu dikerjakan di fase perbaikan, **P3** perapian, **Info** catatan saja.

---

## Bagian 1 — Ringkasan untuk pengambil keputusan

**Kesimpulan singkat: proyek ini dalam kondisi sehat dan siap dilanjutkan, tidak perlu ditulis ulang.**

Matex Platform sudah live di production (website publik, admin internal, dan API). Pondasinya lebih rapi dari yang dikira: keamanan login dan hak akses sudah dipikirkan matang, ada catatan aktivitas (audit log), backup, pengecekan otomatis sebelum rilis, dan semua aplikasi berhasil di-build tanpa error.

Masalah yang ditemukan sebagian besar bukan "rusak", tapi **utang kerapian** dan **beberapa celah kecil** yang wajar untuk proyek yang dikembangkan cepat oleh satu orang.

**Kekuatan utama**

- Hak akses admin dicek ketat di setiap halaman (per perusahaan, status akun, dan izin per fitur).
- Database tertata: 51 tabel, relasi antartabel dijaga, dan bisa dibangun ulang lewat migration.
- Semua pengecekan otomatis lulus: 56 test backend, 3 build aplikasi, dan 0 celah keamanan di library.
- Dokumentasi operasional (runbook server, backup, prosedur deploy) sudah ada dan detail.

**Risiko terpenting**

1. **Database tidak bisa dibangun utuh hanya dari repo.** Kalau server hilang total dan backup juga hilang, database baru dari repo tidak punya akun admin dan izin dasar, sehingga admin tidak bisa login. (DB-001, P1)
2. **Fitur asisten AI bisa dipakai semua admin tanpa batasan izin**, jadi kuota OpenAI bisa terkuras. (SEC-002, P2)
3. **Beberapa file kode sangat besar** (sampai 5.000 baris), sehingga makin lama makin sulit diubah dengan aman. (BE-001, P2)
4. **Hampir tidak ada test otomatis untuk tampilan (frontend).** Perubahan di admin/public hanya bisa dicek manual. (TEST-001, P2)

**Langkah awal yang disarankan**

Perbaiki DB-001 dan SEC-002 dulu (perubahan kecil, dampak besar), lalu bertahap rapikan kode besar sambil menambah test.

---

## Bagian 2 — Kesiapan environment dan akses

| Komponen | Status | Bukti | Kendala | Tindakan |
|---|---|---|---|---|
| GitHub (baca & push) | Berhasil | `git ls-remote` dan push `d3905ab` berhasil | — | — |
| GitHub CLI (`gh`) | Tidak ada | Perintah `gh` tidak ditemukan | Belum bisa bikin PR atau cek CI dari sini | Opsional: `winget install GitHub.cli` lalu `gh auth login` |
| Folder proyek lokal | Berhasil | `D:\PROGRAMMING\MATEX`, sama dengan GitHub | — | — |
| Baca/tulis file & terminal | Berhasil | Edit, build, dan commit dari sesi Claude | — | — |
| Node.js / npm | Berhasil | Node 24.19, npm 11.17 | — | — |
| Database lokal | Berhasil | MySQL 8.4.10 di port 3307, DB `matex_dev` | Harus dinyalakan manual setiap habis restart Windows | Lihat README bagian Local Development |
| Database production | Dicek tidak langsung | VPS: Percona 8.4.10, migration 23/23 cocok | Claude tidak punya akses VPS (disengaja) | Akses read-only bisa dibuka nanti kalau perlu |
| Percakapan Codex lama | Gagal | Link share ChatGPT menolak (403) | Butuh login ChatGPT | Konteks didapat dari memori lokal Codex dan riwayat Git |
| Aplikasi Codex | Masih berjalan di komputer ini | Proses `codex`/`ChatGPT` aktif | Dua asisten bisa mengedit file yang sama bersamaan | Jangan biarkan dua asisten mengedit bersamaan (tidak perlu dicabut) |

**Soal koneksi ChatGPT/Codex:** tidak ada konflik teknis. Koneksi GitHub, token, dan integrasi Codex boleh tetap ada. Satu-satunya risiko nyata adalah dua asisten mengubah file atau server di waktu yang sama. Cukup pastikan hanya satu yang bekerja dalam satu waktu.

---

## Bagian 3 — Peta proyek

```text
Browser pengunjung ──► matexindo.com (public, Angular SSR, port 9201) ──┐
Browser admin ───────► internal.matexindo.com (admin, Angular SSR, 9202) ┼──► API Express (9200) ──► MySQL/Percona 8.4
                                                                         │         │
                                                         Nginx/CloudPanel di depan  └──► Folder file media
```

| Folder | Isi |
|---|---|
| `backend/` | API (Express 5 + TypeScript). Route otomatis dimuat dari `src/ctrl/admin` dan `src/ctrl/public`. |
| `backend/database/migrations/` | 23 file perubahan struktur database, dijalankan berurutan. |
| `frontend/public/` | Website publik (Angular 21, SSR untuk SEO). Berbasis template Kartify yang sudah disesuaikan. |
| `frontend/admin/` | Panel admin internal (Angular 21, SSR). Juga berbasis Kartify. |
| `ops/` | PM2, Nginx, skrip deploy, pengecekan sebelum rilis, test browser (Playwright). |
| `docs/` | Runbook production, audit kesiapan v1, panduan platform. |

**Lingkup v1 (sudah diputuskan):** profil perusahaan, katalog produk, artikel, FAQ, kontak, dan SEO. Fitur toko online (keranjang, checkout, dan sejenisnya) **diparkir untuk v2**.

---

## Bagian 4 — Temuan teknis

### Keamanan

**SEC-001 — Google Maps API key lama ada di riwayat Git** · P1 · **Selesai**
- Lokasi: riwayat commit `348fe4d` dan `c6904c5`.
- Masalah: key pernah ikut ter-commit. Menghapusnya dari kode tidak menghapusnya dari riwayat Git.
- Status: **Hardyness melaporkan key sudah dirotasi** di Google Cloud Console. Key lama di riwayat Git sudah tidak berlaku, jadi tidak perlu menulis ulang riwayat Git.

**SEC-002 — Asisten AI bisa dipakai semua admin tanpa izin khusus** · P2 · **Selesai**
- Lokasi: `backend/src/ctrl/admin/content-assistant.ts`.
- Masalah: endpoint ini hanya mengecek "sudah login", tidak mengecek izin fitur seperti endpoint lain. Satu permintaan bisa mengirim sampai sekitar 190 ribu karakter ke OpenAI.
- Perbaikan: ditambah izin baru `content_assistant.use`. API menolak admin tanpa izin ini (403), dan tombol AI di admin disembunyikan untuk mereka. Supaya editor yang sekarang memakai fitur AI tidak kehilangan akses, migration otomatis memberikan izin ini ke profil akses yang sudah boleh mengedit konten.
- Masih bisa ditambah nanti: batas pemakaian per admin.

**SEC-003 — Logout tidak membatalkan token yang sudah dicuri** · P3 · **Selesai (Fase 5C, 19 Oktober 2026)**
- Login memakai token berlaku 24 jam di cookie. Logout menghapus cookie, tapi token yang (misalnya) sudah dicuri tetap berlaku sampai habis masanya.
- Yang sudah aman: akun yang dinonaktifkan langsung ditolak, karena status akun dicek ke database di setiap permintaan.
- Saran: cukup dicatat dulu. Tidak mendesak untuk skala sekarang.
- Perbaikan: kolom `admin_acct.token_version` (migration 025). Token membawa versi itu; `verifyToken` menolak token yang versinya sudah lewat, dan logout menaikkan versi sehingga semua sesi akun itu (termasuk token salinan) berakhir. Token lama tanpa versi dianggap versi 0, jadi deploy tidak mengeluarkan siapa pun. Ada test kontrak dan unit test.

**SEC-004 — Upload file menampung semua file di memori** · P3 · **Selesai (Fase 5C, 19 Oktober 2026)**
- Satu upload bisa membawa 10 file × 50 MB yang ditampung di RAM server. Tipe video dipercaya dari keterangan browser.
- Yang sudah aman: gambar selalu diproses ulang (dikompres dan dibersihkan), sehingga file gambar berbahaya ikut "dicuci". Fitur ini hanya untuk admin yang login.
- Saran: turunkan batas atau simpan sementara ke disk kalau upload video jadi sering.
- Perbaikan: upload ditulis ke file sementara (`<tmp>/matex-upload`), bukan RAM, dan dihapus lagi setelah request selesai. Isi video dicek dari tanda tangan filenya (mp4, webm, ogg), tidak lagi hanya dari keterangan browser. Ada test kontraknya.

**SEC-005 — Isi artikel (HTML) tidak dibersihkan di server** · Info
- Saat ini aman, karena Angular otomatis membuang script berbahaya saat menampilkan.
- Perlu diingat untuk nanti: kalau aplikasi mobile (Ionic) atau email ikut menampilkan isi artikel, bersihkan HTML-nya juga.

**SEC-006 — Ada dump database di folder `tmp/`** · Info
- `tmp/canonical-import-*/database.sql` tidak ikut Git (aman), tapi kemungkinan berisi data akun. Jangan disalin ke Google Drive atau flashdisk bersama.

**SEC-007 — API memberi tahu bahwa servernya Express** · Info · **Selesai (Fase 5C, 19 Oktober 2026)**
- `app.ts` mematikan header `X-Powered-By`, tapi setiap modul route yang dibuat sebagai sub-app `express()` memasangnya lagi, dan sub-app pertama yang di-load melewati semua request. Production menjawab semua API dengan `X-Powered-By: Express` (dicek 19 Oktober). Hanya membocorkan teknologi server, tidak membuka akses apa pun.
- Perbaikan: semua modul route memakai `express.Router()`. Setiap respons di test kontrak dicek tidak membawa header itu. Sisa: server SSR Angular (public dan admin) masih mengirim header ini; dikerjakan di Fase 6.

### Database

**DB-001 — Database baru dari repo tidak bisa dipakai login** · P1 · **Selesai**
- Bukti awal: database baru yang dibangun murni dari 23 migration hanya berisi 2 izin. Data perusahaan dan akun admin tidak ada sama sekali, dan izin dasar seperti `office.view`, `dashboard.view`, `admin_access.*` tidak ada di file SQL mana pun di repo.
- Perbaikan:
  - Migration `20261018_023_seed_base_admin_permissions.sql` berisi semua izin yang dicek API. Izin yang sudah ada di production **tidak diubah**, hanya yang belum ada yang ditambahkan.
  - Perintah baru `npm run admin:create-first` membuat perusahaan (kalau belum ada), kantor, jabatan, profil "Super Admin", dan admin pertama. Password diketik saat dijalankan dan tidak pernah disimpan di repo. Perintah ini menolak berjalan kalau sudah ada admin.
  - File lama di `database/seeds/` dihapus karena seluruh isinya sudah tercakup migration ini.
- Pengujian: database kosong + migration + admin pertama berhasil login dan membuka menu admin. Di salinan database lama, migration hanya menambah 4 izin baru dan tidak mengubah satu pun baris lama.

**DB-007 — Izin kelola akun admin tidak pernah ada di database** · P1 · **Selesai** (temuan baru saat mengerjakan DB-001)
- API mengecek `admin_account.create`, `admin_account.update`, dan `admin_account.delete`, tetapi ketiganya tidak pernah ada di database.
- Dampak: hanya super-admin (`is_all_access`) yang bisa menambah, mengubah, atau menghapus akun admin, dan profil akses lain tidak bisa diberi hak itu sama sekali.
- Perbaikan: ketiganya ditambahkan oleh migration yang sama. Izin baru ini **tidak otomatis diberikan** ke siapa pun, jadi admin yang perlu harus diberi lewat menu Access Profiles.

**DB-002 — Migration 013 tidak bisa jalan di MariaDB** · P2 · Terbukti
- Lokasi: `backend/database/migrations/20261004_013_remove_legacy_cms.sql`, yang diubah di commit `03ee67c` agar cocok dengan MySQL 8.
- Masalah: di MariaDB (XAMPP), membangun database baru gagal di migration ini. Di MySQL 8 dan Percona (production) lancar.
- Penting: **file ini jangan diedit lagi**, karena production mencatat checksum versi sekarang. Cukup tetapkan bahwa database dev wajib MySQL 8.4 (sudah dilakukan hari ini).
- Catatan: dokumen `production-v1-readiness-audit.md` menyebut "fresh bootstrap lulus". Itu benar sebelum 14 Oktober, tapi sejak itu hanya lulus di MySQL 8.

**DB-003 — Beberapa relasi tidak dikunci di database** · P3 · Terbukti
- `office.id_master_comp` dan `master_comp.id_comp_category` tidak punya foreign key, jadi database tidak mencegah data yatim. Kode aplikasi sudah menjaga ini, tapi database tidak.

**DB-004 — Daftar izin bersifat global** · P3 · Terbukti
- Tabel `admin_permission` tidak dibedakan per perusahaan. Admin perusahaan mana pun yang punya izin "ubah permission" bisa mengubah daftar izin untuk semua perusahaan.
- Saat ini tidak masalah karena baru satu perusahaan. Perlu diputuskan sebelum benar-benar multi-perusahaan.

**DB-005 — Ada data izin percobaan di database dev** · Info
- Database lokal berisi grup izin "Contoh", "dummy group permission", dan "Test Module". Perlu dicek apakah ikut ada di production.

**DB-006 — Tidak ada migration "mundur"** · Info
- Kalau migration bermasalah, jalan pulangnya restore dari backup. Ini wajar karena tooling backup sudah ada.

**DB-008 — Website publik di database baru masih kosong** · P2 · **Selesai**
- Migration yang mengisi halaman bawaan (Beranda, Tentang, Kontak, menu navigasi) hanya mengisi untuk perusahaan yang **sudah ada saat migration dijalankan**. Di database baru, perusahaan baru dibuat belakangan oleh `admin:create-first`, sehingga halaman-halaman itu tidak pernah terbentuk dan Beranda menjawab 404.
- Dampak: pemulihan dari nol atau server staging baru punya admin yang berfungsi, tetapi website publiknya kosong.
- Perbaikan: konten website matexindo.com diekspor sekali secara read-only dari production ke `backend/database/seeds/company-defaults/` (6 halaman, 10 gambar, menu, 2 kanal kontak, 4 topik form kontak, 4 FAQ). `admin:create-first` otomatis memasangnya saat membuat perusahaan baru, atau lewat `npm run db:seed:company-defaults`. Email penerima form kontak sengaja tidak disalin. Diuji: konten hasil pengisian identik dengan ekspor production, dan Beranda publik di database baru tampil (skenario e2e baru).

**CONTENT-001 — Dua jawaban FAQ menyebut alamat email di domain yang tidak ada** · P1 · **Selesai**
- FAQ "Cara pembelian produk" dan "Kerjasama dan partnership" (ID dan EN) yang tampil di matexindo.com menyebut alamat `@matexindonesia.com`. Domain itu **tidak terdaftar** (DNS: *Non-existent domain*), sehingga email pengunjung ke alamat itu pasti gagal terkirim. Domain `matexindo.com` punya mail server yang aktif.
- Dampak bisnis: calon pembeli dan calon mitra yang mengikuti petunjuk FAQ tidak pernah sampai ke tim MATEX.
- Asal masalah: teks FAQ dibuat dengan bantuan AI dan alamat email di dalamnya tidak diperiksa ulang.
- Perbaikan: pemilik mengganti alamatnya lewat admin menjadi `info@matexindo.com` (sama dengan kanal email di halaman Kontak) pada 18 Oktober 2026, lalu isi bawaan diekspor ulang dari production.
- Pelajaran: konten yang dibuat dengan bantuan AI perlu diperiksa ulang untuk detail faktual (alamat, nomor, harga, klaim) sebelum dipublikasikan.

### Backend

**BE-001 — Beberapa file controller sangat besar** · P2 · **Selesai untuk 4 file terbesar (Fase 4C–4G, 19 Oktober 2026)**
- `auth.ts` 5.099 baris (isinya login sekaligus kelola akun admin), `office.ts` 4.076, `web-navigation.ts` 2.622, `admin-access.ts` 2.316.
- Dampak: sulit dibaca, rawan efek samping saat diubah, dan sulit dites.
- Saran: pecah bertahap saat fitur terkait akan diubah, bukan sekaligus.
- `auth.ts` sudah dipecah ke `ctrl/admin/admin-account/`: `session.ts` (login, logout, `/me`), `select.ts`, `read.ts`, `create.ts`, `update.ts`, `delete.ts`, dan `profile-photo.ts`. Isi handler dipindah apa adanya. `auth.ts` (kemudian diganti nama menjadi `admin-account.ts` agar sama dengan nama foldernya) kini hanya mengatur urutan route, karena `/me` dan `/select/*` harus terdaftar sebelum `/:id`, dan folder itu sengaja tidak di-load otomatis. Bukti: rekaman 76 request (seluruh respons JSON beserta isi tabel `admin_acct` dan `audit_log` sesudahnya) identik sebelum dan sesudah pemecahan. Test kontrak gagal bila urutan route dibalik.
- Fase 4E: `office.ts` dipecah ke `ctrl/admin/office/` (`scope.ts`, `input.ts`, `relations.ts`, `read.ts`, `create.ts`, `update.ts`, `delete.ts`), didahului test kontrak `office-api.spec.ts`. Rekaman respons dan isi tabel identik sebelum dan sesudahnya. Tidak ada bug baru.
- Fase 4F: `admin-access.ts` dipecah ke `ctrl/admin/admin-access/` (`scope.ts`, `permissions.ts`, `read.ts`, `create.ts`, `update.ts`, `delete.ts`), didahului test kontrak `admin-access-api.spec.ts`. Test itu juga membuktikan izin yang diberikan ke profil akses benar-benar berlaku. Rekaman identik. Tidak ada bug baru.
- Fase 4G: `web-navigation.ts` dipecah ke `ctrl/admin/web-navigation/` (`scope.ts`, `metadata.ts`, `read.ts`, `create.ts`, `update.ts`, `delete.ts`, `items.ts`, `reorder.ts`), didahului test kontrak `web-navigation-api.spec.ts`. Rekaman identik. Tidak ada bug baru.
- Kini tidak ada controller backend di atas 1.850 baris. Controller 1.000–1.850 baris (`attachment.ts`, `chair.ts`, `admin-permission.ts`, `website-page.ts`, `audit-log.ts`) dipecah dengan cara yang sama saat fiturnya diubah (Fase 4H di `docs/standar-kode.md`).

**BE-004 — ID dengan karakter tidak valid membuat server error 500** · P3 · **Selesai (Fase 4C)**
- Library `hashids` versi 2 melempar error bila ID berisi karakter di luar alfabetnya (misalnya URL yang diketik manual atau diubah), sementara semua kode mengharapkan hasil kosong untuk ID tidak valid. Contoh: `GET /api/v1/admin-acct/select/office?id_master_comp=abc-def` menjawab 500, bukan 400.
- Perbaikan: `src/hsid.ts` mengembalikan hasil kosong untuk ID tidak valid. Ke-32 pemanggil sudah memperlakukan hasil kosong sebagai ID tidak valid, jadi semuanya kini menjawab 400/404. Ada unit test (`tests/hsid.test.ts`).

**BE-005 — Detail akun admin yang sudah dihapus masih bisa dibuka** · P3 · **Selesai (Fase 4C)**
- Hapus akun admin adalah soft delete (status 99). List, ubah, ubah status, dan hapus sudah menyaring status 0/1, tapi `GET /api/v1/admin-acct/:id` tidak, sehingga akun terhapus masih tampil lewat URL detail. Login akun itu tetap ditolak.
- Perbaikan: query detail ikut menyaring status 0/1, sehingga akun terhapus menjawab 404.

**BE-006 — Update kantor melewati tiga pengecekan yang ada di create** · P3 · **Selesai (Fase 5C)**
- Create kantor menolak kode di atas 50 karakter, nama di atas 255 karakter, dan kantor publik tanpa slug yang valid; update tidak. Kode yang kepanjangan sampai ke MySQL dan berakhir error 500, dan kantor publik bisa tersimpan tanpa slug.
- Ditemukan saat menyiapkan pemindahan modul `office` ke pola standar. Perbaikan: update menjalankan pengecekan yang sama (lalu keduanya memakai satu `readOfficeInput`). Ada test kontraknya.

**BE-007 — Parameter urutan list bisa membuat error 500** · P3 · **Selesai (Fase 5C)**
- Lima list (profil akses, akun admin, izin, log audit, jabatan) mencari kolom urutan (`?ord=`, `?field=`) di objek biasa, sehingga `ord=toString` memasukkan teks fungsi JavaScript ke `ORDER BY` dan MySQL menjawab error. Teksnya tidak bisa dikendalikan penyerang, tapi tetap membuat 500.
- Perbaikan: helper `sortColumn` yang hanya menerima kunci yang memang didaftarkan; semua list memakainya.

**BE-008 — Admin full-access tidak melihat akun kantor lain di daftar akun** · P2 · **Selesai (Fase 5C)**
- Daftar akun admin selalu menyaring ke kantor admin yang login, termasuk admin full-access. Padahal dropdown kantor menawarkan semua kantor ke admin full-access, dan detail/ubah/hapus mengizinkannya. Akibatnya akun yang dibuat di kantor lain tidak pernah muncul di daftar.
- Perbaikan: saringan kantor hanya untuk admin tanpa full-access. Ada test kontraknya.

**BE-009 — Gambar yang dipakai produk bisa dihapus dari Media** · P2 · **Selesai (Fase 5C)**
- Sebelum menghapus file, modul attachment mengecek apakah file itu masih dipakai, tapi daftar pengecekannya belum mencakup media produk dan gambar/ikon kategori produk. Akibatnya gambar yang sedang tampil di website bisa dihapus dari Media, termasuk file fisiknya.
- Perbaikan: semua tabel yang menunjuk attachment dicek (satu daftar di `ctrl/admin/attachment.ts`). Ada test kontrak dan unit test.
- Dicek di production setelah deploy 19 Oktober: 0 dari 21 relasi media produk dan kategori menunjuk file yang sudah terhapus.

**BE-010 — Upload tipe file yang salah menghasilkan error 500** · P3 · **Selesai (Fase 5C)**
- Pesan error dari fungsi penyimpan file tidak lagi sama dengan yang dicari route upload, sehingga misalnya file .txt ke Media dijawab 500, bukan 400 `ATTACHMENT_FILE_TYPE_NOT_ALLOWED`.
- Perbaikan: fungsi penyimpan file langsung menolak dengan kode yang tepat (`HttpError`). Ada test kontraknya.

**BE-011 — Parameter urutan list bisa membuat error 500 (modul generasi baru)** · P3 · **Selesai (Fase 5C, 20 Oktober 2026)**
- Bug yang sama dengan BE-007, di list FAQ, artikel, dan produk: `?field=toString` memasukkan teks fungsi JavaScript ke `ORDER BY`.
- Perbaikan: ketiganya memakai `sortColumn`. Ada test kontraknya.

**BE-012 — Ubah status dan hapus tidak dicek dan tidak diaudit** · P3 · **Selesai (Fase 5C, 20 Oktober 2026)**
- Artikel: ubah status dan hapus menjawab "berhasil" untuk ID yang tidak ada, sudah terhapus, atau milik perusahaan lain. Kategori produk: hapus juga begitu. Artikel, kategori, dan produk tidak menulis audit log untuk ubah status dan hapus, padahal modul lain menulis.
- Perbaikan: jawabannya 404 untuk data yang tidak ada, dan setiap ubah status dan hapus tercatat di audit log. Ada test kontraknya.

**BE-013 — Slug yang sama menimpa terjemahan artikel atau kategori lain** · P2 · **Selesai (Fase 5C, 20 Oktober 2026)**
- Terjemahan artikel dan kategori produk disimpan dengan `INSERT ... ON DUPLICATE KEY UPDATE`, dan tabelnya punya index unik untuk slug. Kalau slug artikel baru sama dengan artikel lain, MySQL tidak menolak: terjemahan artikel lain itu yang ditimpa dengan isi baru, artikel baru tersimpan tanpa terjemahan, dan API menjawab berhasil. Kategori produk sama. Produk aman (menghapus lalu menulis ulang, dengan cek slug di awal).
- Dicek baca-saja di production 20 Oktober: 4 artikel dan 4 kategori, semuanya masih punya kedua terjemahan. Belum ada yang rusak.
- Perbaikan: slug yang dipakai artikel/kategori lain ditolak dengan 409 sebelum disimpan. Ada test kontraknya, termasuk bukti isi artikel lama tidak berubah.

**BE-002 — Gaya penulisan kode tidak seragam** · P3 · Terbukti
- Sebagian file (misalnya `article.ts`) ditulis sangat padat satu baris panjang, sementara file lain sangat renggang dengan banyak komentar pembatas. Ini menyulitkan review.
- Struktur folder juga tidak konsisten: middleware Express ada di `src/ctrl/middleware/` dengan nama camelCase (`authJwt.ts`), dan `src/helpers.ts` sudah tidak dipakai.
- Fase 4D (19 Oktober 2026): middleware dipindah ke `src/middleware/` (`auth-jwt.middleware.ts`, `auth-permission.middleware.ts`, `request-context.middleware.ts`) dan `src/helpers.ts` dihapus. Rekaman test kontrak identik sebelum dan sesudahnya. Struktur target dan konvensi nama ada di `docs/standar-kode.md`. Penyeragaman gaya penulisan di dalam file dilakukan saat file itu dipecah atau diubah.
- Fase 5A (19 Oktober 2026): satu config Prettier di root dan Oxlint untuk backend. Komentar pembatas dan baris kosong berlebihan dirapatkan dalam satu commit format murni (syntax tree 122 file identik, tercatat di `.git-blame-ignore-revs`). Lint backend 0 error. Sisa BE-002 (dua generasi pola kode) dikerjakan di Fase 5B–5C.
- Fase 5B (19 Oktober 2026): helper bersama (`helper/input`, `id`, `list-query`, `json`, `transaction`, `http-error`) dan penanganan error pusat; scope sesi dimuat sekali per request oleh `requirePermission`. Salinan fungsi yang identik di office, web-navigation, article, product, product-category, website-page, audit-log, dan admin-account diganti. Sisa: salinan `getSessionScope` dan pola lama per modul (Fase 5C).
- Fase 5C (19 Oktober 2026): semua 9 modul generasi lama dipindah ke pola standar dengan test kontrak; tidak ada lagi salinan `getSessionScope`, dan semua modul route memakai `express.Router()`. Lanjutan 20 Oktober: modul generasi baru (`faq`, `public-contact`, `article`, `product-category`, `product`, `analytics`, dan route publik) juga di pola standar dengan test kontrak; `try/catch` yang hanya menjawab 500 diganti `onFailure`. Yang tersisa hanya `try/catch` yang memang memetakan kegagalan layanan luar ke 502/503.

**BE-003 — Hal yang sudah benar di backend** · Info
- Semua query database memakai parameter (aman dari SQL injection), perubahan data dibungkus transaksi, data dicek kepemilikannya per perusahaan sebelum diubah, dan ada rate limit untuk login dan API.

### Frontend

**FE-001 — Banyak modul sisa template Kartify yang tidak dipakai** · P2 · **Selesai (Fase 4A, 19 Oktober 2026)**
- Admin punya sekitar 27 folder modul (order, wallet, coupon, store, dan lain-lain) yang tidak lagi punya halaman. Sudah dikeluarkan dari build, tapi file-nya masih ada.
- Pengukuran lewat graf import TypeScript (termasuk import type): 269 dari 546 file `.ts` admin (40.461 dari 80.219 baris) dan 70 dari 366 file `.ts` public tidak terjangkau dari titik masuk aplikasi.
- Perbaikan: semua kode itu diarsipkan di tag Git `kartify-reference-v1`, lalu dihapus dari kode aktif beserta template/style-nya (admin 541 file, public 186 file). Bukti tanpa perubahan perilaku: hasil build production public identik byte demi byte (1.100 file). Admin identik kecuali CSS global, yang juga berbeda di antara dua build dari sumber yang sama karena SCSS Kartify memakai `math.random()` (lihat FE-010). Lint, build, dan test e2e 5/5 lulus.
- Aturan ke depan: sebelum membuat modul baru, cek desain Kartify yang cocok di tag itu (lihat README, bagian Kartify Design Reference).

**FE-010 — Build CSS admin tidak deterministik** · P3 · **Selesai (Fase 4B, 19 Oktober 2026)**
- `frontend/admin/public/assets/scss/themes/_dark-sidebar.scss` memakai `math.random()` untuk warna ikon layout sidebar `iconcolor-sidebar`, sehingga setiap build menghasilkan CSS (dan nama file) berbeda walaupun kodenya sama.
- Dampak: cache CSS di browser pengguna selalu dianggap baru setiap deploy, dan perbandingan build tidak bisa dipakai sebagai bukti identik.
- Perbaikan: warna dipilih berurutan dari palet, bukan acak. Layout `iconcolor-sidebar` tidak dipakai MATEX, jadi tampilan tidak berubah. Dua build production admin dari sumber yang sama sekarang identik (958 file).

**FE-002 — Ribuan peringatan lint di admin** · P3 · **Selesai (Fase 4B, 19 Oktober 2026)**
- Admin: 17.114 peringatan, sekitar 97% hanya soal format (spasi, akhir baris). Public: 133 peringatan. Error: 0.
- Perbaikan: Prettier dijalankan pada `src` admin dan public dalam satu commit khusus format (dicatat di `.git-blame-ignore-revs`, supaya `git blame` tetap menunjuk ke commit aslinya). Akhir baris sudah LF di repo sejak `.gitattributes`.
- Bukti tanpa perubahan perilaku: CSS hasil build identik. Perbedaan JavaScript hasil build (diperiksa pada build tanpa minify) hanya berupa spasi di sekitar teks template, tanda kutip dan titik koma di salinan template untuk mode development, serta nomor baris untuk debug. Lint, build, dan test e2e 5/5 lulus.
- Sisa peringatan: admin 563, public 90 (0 soal format). Mayoritas urutan import (`import/order`) dan tipe `any`; dirapikan bertahap saat file-nya disentuh.

**FE-003 — Default SSR untuk development salah** · P2 · **Sudah diperbaiki**
- Saat dijalankan lokal, SSR admin/public diarahkan ke port production (9200), sehingga muncul "fetch failed".
- Diperbaiki di commit `d3905ab` (sudah di GitHub). Perilaku production tidak berubah.

**FE-004 — Public `ng serve` default ke port 4200** · P3 · Terbukti
- Padahal konfigurasi dev public mengharapkan port 4201. Sementara ini sudah dicatat di README (`npm start -- --port 4201`).

*Temuan FE-005 sampai FE-008 ditemukan saat membangun test otomatis (Fase 2).*

**FE-005 — Halaman admin berizin dibelokkan saat dirender server** · P2 · **Selesai**
- `PermissionGuard` ikut berjalan saat SSR, padahal daftar izin admin tersimpan di browser, sehingga di server selalu kosong. Membuka langsung (atau refresh) halaman seperti Media membuat server merender dashboard dulu, lalu browser membetulkannya. Di mode dev halamannya benar-benar terlempar ke dashboard.
- Perbaikan: guard dilewati saat SSR, sama seperti `AuthGuard`. Browser tetap memeriksa izin, dan API tetap menolak akses tanpa izin.

**FE-006 — Mode dev (`ng serve`) admin tidak meneruskan cookie saat SSR** · P3 · **Selesai**
- Cookie login hanya diteruskan oleh `frontend/admin/server.ts` (dipakai production). `ng serve` tidak memakai file itu, sehingga refresh halaman data (misalnya Produk) di mode dev bisa melempar ke halaman login. Production tidak terdampak.
- Dicoba dulu: token `REQUEST` bawaan Angular. Terbukti kosong di dev server admin, karena `server.ts` admin memakai mesin SSR lama (`CommonEngine`). Memigrasikan `server.ts` ke mesin baru dinilai terlalu berisiko untuk masalah yang hanya ada di mode dev.
- Perbaikan: SSR dimatikan khusus untuk konfigurasi `development` admin (`"ssr": false`). Admin adalah alat internal di balik login yang tidak butuh SEO. Production dan test e2e tetap memakai SSR.
- Catatan lanjutan (opsional): kalau suatu saat admin dimigrasikan ke `AngularNodeAppEngine` seperti public, SSR di mode dev bisa diaktifkan lagi.

**FE-009 — Komponen `LegacyApp` yang tidak dipakai di public** · P3 · **Selesai**
- `frontend/public/src/app/legacy-app.ts` tidak diimpor di mana pun, tetapi tetap di-compile dan memakai template `app.html` yang sama dengan `App`. Perubahan apa pun pada `app.html` bisa membuat build gagal tanpa alasan yang jelas (ini terjadi saat menambahkan tanda DEV).
- Perbaikan: file dihapus (tetap tersedia di riwayat Git).

**FE-007 — Pemilih gambar tertutup sendiri setelah mengunggah gambar baru** · P2 · **Selesai**
- Setelah unggahan berhasil, modal pemilih tertutup sendiri (alasan: `Dismissed with: undefined`) sebelum admin sempat memilih gambarnya. Berlaku untuk semua pemilih gambar (artikel, produk, kategori, kantor).
- Akar masalah: `NotificationService.showSuccess()` (warisan template) selalu memanggil `modalService.dismissAll()`, sehingga notifikasi "Lampiran berhasil diunggah" ikut menutup semua modal.
- Perbaikan: `showSuccess()` diberi opsi `{ dismissModals: false }` dan hanya dipakai oleh unggahan media. Perilaku 70 pemanggil lain tidak berubah. Skenario artikel di `npm run test:write` sekarang mengunggah thumbnail baru dari dalam pemilih.

**FE-008 — Pemilih gambar artikel tidak bisa mengunggah gambar baru** · P2 · **Selesai**
- `app-image-upload` di formulir artikel tidak diberi `collection`, sehingga unggahan baru langsung ditolak di browser ("collection required").
- Perbaikan: kedua pemilih gambar artikel memakai koleksi `media_library`, sama seperti formulir kategori.

**FE-011 — Beranda demo Kartify bisa dibuka di website publik** · P2 · **Selesai (Fase 6B, 21 Oktober 2026)**
- `matexindo.com/?theme=electro` (juga `mega-mart`, `baby-shop`, `organic-store`, `style-tech`) menampilkan beranda demo toko elektronik (Nokia, Samsung, Macbook) dengan header, logo, dan warna demo, di bawah nama MATEX. Halaman produk juga menerima `?layout=` untuk enam tata letak demo. Halaman seperti itu bisa ikut terindeks mesin pencari.
- Perbaikan: beranda selalu memakai tata letak MATEX dan halaman produk satu tata letak; tema, header, tata letak, dan data demonya dibuang.

**FE-012 — Produk, kategori, atau artikel yang tidak ada membuat error 500 di build e2e** · P3 · **Selesai**
- Resolver ketiganya memasang status 404 lalu mengalihkan ke `/404`. Build e2e (tidak dioptimasi, mode pengembangan Angular) menolak "redirect dengan status 404" dan menjawab 500. Production menjawab 404 dengan benar (dicek 21 Oktober), jadi pengunjung tidak terdampak.
- Saran: resolver cukup menampilkan halaman 404 tanpa redirect berstatus 404. Dikerjakan di 6E.
- Perbaikan (27 Okt, 6E E-4): ketiga resolver mengembalikan `false` tanpa redirect; halaman produk, kategori, dan artikel lalu menampilkan komponen 404 di alamat yang diminta (`shared/resolver/resolved-missing.ts`), komponen itu memasang status 404 dan `noindex`. Halaman juga menunggu data rute agar pindah (di browser) dari halaman 404 ke item yang ada tetap tampil. Test browser `public-not-found.spec.ts`: enam alamat hilang (dua bahasa) menjawab 404 tanpa redirect, item yang ada tetap 200.

**FE-013 — Halaman "My account" admin tidak menyimpan apa pun** · P2 · **Selesai**
- Tombol simpan profil, kata sandi, dan detail toko men-dispatch action NGXS yang isinya masih kosong dari template Kartify (`account.state.ts`: "Update profile logic hre"). Pengguna mengira datanya tersimpan. Form "detail toko" juga sisa toko Kartify.
- Saran: halaman "Profil saya" yang benar (U-16 di `rencana-ui-admin.md`): ubah nama, foto, dan kata sandi lewat API yang sudah ada; buang form toko.
- Perbaikan (26 Okt, U-16): API yang dibutuhkan ternyata belum ada, jadi dibuat `backend/src/ctrl/admin/admin-account/profile.ts` (`PUT /me`, `POST`/`DELETE /me/photo`, `PUT /me/password`, cukup sesi aktif; ganti kata sandi menaikkan `token_version` sehingga perangkat lain keluar, sesi yang dipakai tetap sampai waktu habisnya, percobaan dibatasi seperti login). Halaman `/account` ditulis ulang jadi "Profil Saya"; form toko dan store/country/state NGXS sisa Kartify dibuang. Test kontrak `admin-profile-api.spec.ts`, test browser `account-profile.spec.ts`. Sisa: `AccountState` lama masih dibaca tabel bersama (izin per role Kartify), dibersihkan di 6E. **Dibersihkan 27 Okt (6E E-5):** `AccountState` beserta service, action, dan interface akun lama dibuang; tabel memakai izin `AuthState`.

**FE-014 — Mode "buat" di form halaman website tidak bisa dicapai** · P3 · **Selesai**
- Halaman website adalah halaman tetap; route admin hanya `website-page/:key` (ubah). Cabang `mode === 'create'` di form (label, pilihan template untuk halaman baru, aksi publikasi) tidak pernah dipakai.
- Perbaikan (25 Okt, 6C): input `mode` di form dan sinyal `mode` di service editor dan publikasi dibuang beserta semua cabang `'create'` (label "Buat Halaman", status awal draf, aksi publikasi untuk halaman baru); `buildSavePayload` memakai nilai tersimpan saja. Pilihan template di tab Umum tetap, karena diatur `isSystemPage`, bukan mode. Bukti: rekaman simpan dan dokumen pratinjau identik, 52 screenshot sama (±1 noise).

### Build, deploy, test, dan dokumentasi

**TEST-001 — Test frontend hampir tidak ada** · P2 · **Sebagian selesai**
- Public 1 file test, admin 0. Backend punya 56 test kontrak, dan ada 3 file test browser (Playwright).
- Alur admin yang mengubah data (simpan produk, upload media, publish artikel) belum diuji otomatis.
- Perbaikan (Fase 2): `npm run test:write` di `ops/e2e` menguji login, upload media, serta publish produk dan artikel sampai tampil di website publik, pada lingkungan lokal terpisah (`matex_e2e`, port 3100/4300/4301) dengan build ala production. Belum dicakup: kantor, jabatan, dan akun admin.
- Fase 4C: `write/admin-account-api.spec.ts` menguji kontrak API sesi admin dan akun admin (13 endpoint: kode status, kode respons, field utama, aturan keamanan seperti tidak boleh menonaktifkan atau menghapus diri sendiri, dan urutan route) ke MySQL asli. Suite kini 15 skenario.
- Fase 4D–4G: `npm run test:api` (hanya API, tanpa build frontend) dan mode rekam `MATEX_E2E_RECORD`. Test kontrak kini mencakup akun admin, kantor (`office-api`), profil akses dan matriks izin (`admin-access-api`), serta navigasi website (`web-navigation-api`): 35 test API, ditambah 5 test browser, total 40. Belum dicakup: jabatan, lampiran, produk, artikel, halaman website, dan log audit; test kontraknya ditulis saat modul itu akan diubah.

**OPS-001 — Backup di luar VPS dan latihan restore belum terbukti** · P2 · **Selesai**
- `production-v1-readiness-audit.md` mencatat salinan backup di luar VPS dan latihan restore sebagai pekerjaan yang tersisa.
- Salinan di luar VPS: lihat V-2 (Google Drive terenkripsi, harian).
- Latihan restore 19 Oktober 2026: backup otomatis `matex-20261018T191501Z` diunduh dari VPS, checksum-nya diverifikasi, lalu dipulihkan dengan `backup:restore` ke database terpisah `mia_restore_drill` di MySQL 8.4 lokal (versi sama dengan production) dalam 40 detik. Hasil: migration `current` 25/25, 47 dari 48 tabel identik dengan production (selisih 1 baris analitik yang tercatat setelah jam backup), 91 dari 91 file lampiran ada, dan API yang membaca data hasil restore melayani halaman, menu, 53 produk, artikel, FAQ, kontak, sitemap, dan gambar. Database dan file drill dihapus setelahnya.
- Catatan untuk restore di Windows: `tar` bawaan Git Bash membaca `D:\...` sebagai alamat server remote. Jalankan dengan `C:\Windows\System32` (tar bawaan Windows) dan folder `bin` MySQL di urutan pertama PATH.

**DOC-001 — README dan memori lama sudah ketinggalan** · P3 · Terbukti
- README masih menyebut "Phase 4.8". Catatan Codex menyebut `product.ts` masih kosong, padahal sekarang sudah 899 baris.

### Server production (VPS) — diaudit 18 Oktober 2026 lewat SSH

Kondisi yang sudah sehat: kode server sama dengan GitHub, skema database production **identik** dengan database lokal `matex_dev`, Ubuntu 24.04 up to date, file `.env` berizin `600`, firewall hanya membuka SSH/80/443/CloudPanel (MySQL, Redis, FTP, dan port lama tertutup dari internet), dan backup harian berjalan jam 02:15 WIB dengan retensi 14 hari.

**V-1 — SSH menerima login password dan login root** · P1 · **Selesai (untuk root)**
- `PasswordAuthentication yes` dan `PermitRootLogin yes`. Siapa pun di internet bisa mencoba menebak password root.
- Perbaikan: kunci SSH PC pemilik dipasang untuk root, lalu `/etc/ssh/sshd_config.d/10-matex-root-key-only.conf` membuat root **hanya bisa login dengan kunci**. Untuk membatalkan: hapus file itu lalu `systemctl reload ssh`.
- Sengaja tidak diubah: login password untuk user lain. VPS ini juga dipakai proyek lain (user site CloudPanel seperti `gibadmin`, `remora`, `paskasindo-gibapi`) yang mungkin login dengan password. fail2ban sudah aktif memblokir tebakan password berulang.

**V-2 — Backup belum disalin ke luar VPS** · P1 · **Selesai**
- `rclone` sudah terpasang tetapi belum punya tujuan. Kalau VPS rusak total, backup ikut hilang.
- Perbaikan: remote `gdrive-crypt:` (Google Drive, scope `drive.file`, nama dan isi file terenkripsi) dan `ops/backup-offsite.sh` yang berjalan setelah backup malam, dengan retensi 30 hari di Drive. Sudah diuji: unggah, `cryptcheck`, unduh balik, lalu `backup:verify` lulus.
- Catatan kejadian: saat setup pertama, token Google sempat tercetak ke terminal dan terbaca di sesi Claude. Token itu sudah dicabut langsung ke Google (refresh ditolak dengan `invalid_grant`), lalu Drive disambungkan ulang tanpa menampilkan token.

**V-3 — Skrip deploy bisa memakai Node 18** · P2 · **Selesai**
- `ops/deploy-production.sh` memakai `node` pertama di PATH (Node 18 sistem) saat dijalankan lewat SSH non-interaktif. Pencarian Node nvm di skrip juga tidak pernah berhasil karena salah kedalaman folder.
- Perbaikan: skrip selalu memakai Node dari nvm dan menolak jalan kalau Node di bawah versi 20.

**V-4 — Log PM2 tidak dirotasi** · P3 · **Selesai**
- `pm2-logrotate` terpasang: rotasi harian atau saat log mencapai 10 MB, simpan 14 file, dikompres.

**V-5 — Izin percobaan dan izin lama masih ada** · P3 · **Selesai**
- `contoh.view`, `dummy.vie`, `test_module.view`, dan `category_product.*` tidak dipakai kode.
- Perbaikan: migration `20261018_024_retire_unused_permissions.sql` mencabut izin-izin itu dari profil akses lalu soft-delete (status 99), sama seperti tombol hapus di admin. Daftar izin di admin sekarang tepat 51, sesuai yang dipakai kode.

**V-6 — User database boleh login dari host mana saja** · P3 · Terbukti
- `matexapp@'%'` dan MySQL mendengarkan di semua interface.
- Keputusan: **risiko diterima**. Port 3306 terbukti tertutup firewall dari internet, CloudPanel memang membuat user database dengan pola ini, dan mengubahnya manual butuh kredensial master MySQL serta bisa membuat panel CloudPanel tidak sinkron.

---

## Bagian 5 — Hal yang sudah baik (pertahankan)

- **Keamanan akses admin:** setiap permintaan mengecek akun aktif, perusahaan yang sama, dan izin fitur, plus perlindungan khusus untuk super-admin.
- **Audit log** dengan pembersihan data sensitif dan pengecekan integritas.
- **API production sudah diperkeras:** Helmet, kompresi, rate limit, batas ukuran body, health check, dan shutdown yang rapi.
- **Upload gambar aman:** semua gambar diproses ulang lewat `sharp`, dan nama file diacak.
- **Migration runner** punya lock, checksum, dan mode adopsi database lama. Inilah yang menangkap masalah DB-002 hari ini.
- **Analitik ramah privasi:** tanpa IP mentah, menghormati Do Not Track, dan dimatikan sampai kebijakan privasi siap.
- **SEO matang:** canonical, hreflang ID/EN, JSON-LD, sitemap dinamis, dan status 404 yang benar.
- **Dokumentasi operasional** (runbook CloudPanel, backup/restore, preflight) detail dan bisa diikuti.
- **Keputusan scope v1/v2** jelas dan konsisten diterapkan di router, sitemap, dan navigasi.

---

## Bagian 6 — Daftar utang teknis

| Jenis | Item |
|---|---|
| Bug aktual | DB-002 (migration 013 di MariaDB). FE-003, FE-005, FE-006, FE-007, FE-008, FE-009, DB-007, BE-004 sampai BE-013, SEC-003, SEC-004, dan SEC-007 sudah diperbaiki. |
| Risiko keamanan | Tidak ada yang terbuka (SEC-001 sampai SEC-004 dan SEC-007 selesai; SEC-005 dan SEC-006 hanya catatan) |
| Integritas data | DB-003 (DB-001, DB-005, dan DB-008 selesai) |
| Konten bisnis | (CONTENT-001 selesai) |
| Arsitektur | DB-004 (izin global vs multi-perusahaan) |
| Maintainability | BE-001 (4 file terbesar selesai), BE-002 (struktur folder selesai; FE-001, FE-002, dan FE-010 selesai) |
| Performa | Belum ada temuan terbukti. Cache API publik masih `no-store` (catatan dari audit lama). List produk publik memuat semua produk lalu memotong halaman di memori: aman untuk 53 produk, perlu dipindah ke SQL kalau katalog membesar. |
| Kekurangan test | TEST-001 (sebagian selesai) |
| Kekurangan dokumentasi | DOC-001 |

---

## Bagian 7 — Roadmap yang disarankan

> Roadmap terbaru (posisi sekarang, tahap berikutnya, dan ujung sementara) ada di `docs/peta-jalan.md`. Bagian ini disimpan sebagai catatan awal.

**Fase 0 — Environment (selesai hari ini)**
DB lokal MySQL 8.4 setara production, `.env` lokal dipindah, fix SSR dev, dan README Local Development.

**Fase 1 — Perbaikan kecil berdampak besar** · **Selesai di lokal 18 Oktober 2026** (belum di-deploy ke production)
- SEC-002: tambah izin untuk asisten AI.
- DB-001: migration izin dasar + perintah aman membuat admin pertama.
- Selesai bila: database baru dari repo bisa langsung dipakai login, dan admin tanpa izin ditolak saat memakai asisten AI.
- Risiko: migration baru wajib diuji di database kosong **dan** di salinan database lama sebelum masuk production.

**Fase 2 — Jaring pengaman test** · **Selesai di lokal 18 Oktober 2026**
- Test browser untuk alur admin yang mengubah data, memakai akun test khusus (bukan akun asli).
- Selesai bila: simpan produk, upload media, dan publish artikel teruji otomatis.
- Hasil: `npm run test:write`, 4 skenario. Selama membangunnya ditemukan FE-005 sampai FE-008 dan DB-008.
- Lanjutan: skenario kantor, jabatan, dan akun admin. (FE-007 dan DB-008 selesai.)

**Fase 3 — Operasional** · **Selesai 18–19 Oktober 2026**
- OPS-001: salinan backup di luar VPS + satu kali latihan restore.
- DB-005: cek dan bersihkan izin percobaan di production lewat migration.
- Saran rutin: ulangi latihan restore setiap 3 bulan, dan setiap sebelum migration besar.

**Fase 4 — Kerapian bertahap**
- BE-001: pecah controller besar, masing-masing didahului test kontrak API. **`auth.ts` (4C), `office.ts` (4E), `admin-access.ts` (4F), `web-navigation.ts` (4G) selesai.** Struktur backend dirapikan di 4D. Rencana lanjutan ada di `docs/standar-kode.md`.
- FE-002: satu commit khusus format. **Selesai (4B).**
- FE-001: rapikan modul sisa Kartify per kelompok. **Selesai (4A).**
- FE-010: buat build CSS admin deterministik. **Selesai (4B).**

**Fase 5 — Lanjut fitur**
Fitur baru v1, lalu persiapan v2 (commerce), aplikasi mobile, dan keputusan semi-open-source.

---

## Bagian 8 — Titik mulai yang disarankan

**Mulai dari DB-001 (izin dasar sebagai migration), digabung dengan SEC-002.**

- **Kenapa:** dua-duanya kecil, menutup risiko nyata (pemulihan bencana dan biaya AI), dan membuat database test bisa dibuat kapan saja. Itu syarat untuk Fase 2 (test otomatis).
- **Persiapan:** daftar izin lengkap diambil dari database lokal `matex_dev` (salinan `mia`). Hardyness perlu memutuskan izin percobaan mana ("Contoh", "Test Module", dan seterusnya) yang dibuang.
- **File yang kemungkinan berubah:** migration baru di `backend/database/migrations/`, `backend/src/ctrl/admin/content-assistant.ts`, skrip kecil baru di `backend/scripts/` untuk membuat admin pertama, dan README.
- **Risiko kalau dikerjakan tanpa persiapan:** migration izin yang salah bisa menggandakan atau menghapus izin di production. Karena itu migration harus memakai pola "tambah kalau belum ada" dan diuji di salinan database production terlebih dahulu.
- **Kriteria berhasil:** (1) database kosong + migration + skrip admin menghasilkan admin yang bisa login dengan menu lengkap; (2) migration yang sama di salinan `matex_dev` tidak mengubah data yang sudah ada; (3) admin tanpa izin mendapat 403 saat memakai asisten AI; (4) semua test dan build tetap lulus.
