# Runbook deployment MATEX v1 di CloudPanel

Target produksi:

- Website publik: `https://matexindo.com` dan `https://www.matexindo.com`
- Admin: `https://internal.matexindo.com`
- IPv4 VPS: `72.60.77.35`
- API internal: `127.0.0.1:9200`
- Public Angular SSR: `127.0.0.1:9201`
- Admin Angular SSR: `127.0.0.1:9202`

Port `9000` dan `9100` yang sudah dipakai site lain tidak bertabrakan dengan MATEX. Port MATEX tidak boleh dibuka ke internet; Nginx CloudPanel menerima trafik pada port 80/443 lalu meneruskannya ke proses Node di loopback.

> Jangan arahkan DNS atau menerima trafik publik sebelum baseline migration database, backup/restore, dependency frontend, smoke test, robots, dan sitemap dinyatakan lulus pada audit kesiapan produksi.

## 1. DNS

Setelah domain aktif, buat record berikut pada penyedia DNS:

| Jenis | Nama | Nilai |
| --- | --- | --- |
| A | `@` | `72.60.77.35` |
| A | `www` | `72.60.77.35` |
| A | `internal` | `72.60.77.35` |

Hapus record lama yang mengarah ke server lain. Tunggu sampai ketiga nama tersebut mengarah ke `72.60.77.35` sebelum menerbitkan sertifikat Let's Encrypt.

## 2. Buat dua Node.js Site

Di CloudPanel buka **Sites → Add Site → Create a Node.js Site**.

### Public

- Domain Name: `matexindo.com`
- Node.js Version: **Node 22 LTS**
- App Port: `9201`
- Site User: `matexindo`
- Password: buat password acak yang kuat dan simpan di password manager

Tambahkan `www.matexindo.com` sebagai alias domain setelah site selesai dibuat.

### Admin

- Domain Name: `internal.matexindo.com`
- Node.js Version: **Node 22 LTS**
- App Port: `9202`
- Site User: `matexadmin`
- Password: buat password acak yang berbeda dan simpan di password manager

Port pada CloudPanel harus sama dengan `PORT` proses SSR yang dijalankan PM2.

## 3. Proses aplikasi

Gunakan tiga proses Node terpisah:

| Proses | Perintah produksi | Environment utama |
| --- | --- | --- |
| API | `npm run start:prod` dari folder `backend` | `NODE_ENV=production`, `PORT=9200`, `PUBLIC_COMPANY_ID=1`, `PUBLIC_SITE_URL=https://matexindo.com` |
| Public SSR | `npm run serve:ssr` dari folder `frontend/public` | `NODE_ENV=production`, `PORT=9201`, `MATEX_API_INTERNAL_URL=http://127.0.0.1:9200`, `MATEX_PUBLIC_INTERNAL_URL=http://127.0.0.1:9201` |
| Admin SSR | `npm run serve:ssr` dari folder `frontend/admin` | `NODE_ENV=production`, `PORT=9202`, `MATEX_API_INTERNAL_URL=http://127.0.0.1:9200`, `MATEX_ADMIN_INTERNAL_URL=http://127.0.0.1:9202` |

Jalankan proses API dengan site user public (`matexindo`). Jangan menjalankannya sebagai `root` atau user milik site lama.

Build sebelum proses dijalankan:

```text
backend: npm ci lalu npm run build
frontend/public: npm ci lalu npm run build
frontend/admin: npm ci lalu npm run build
```

Jalankan dengan PM2 sebagai site user, bukan `root`. Satu user aplikasi dapat mengelola ketiga proses karena semuanya berasal dari satu release MATEX; user site admin hanya dipakai CloudPanel untuk kepemilikan vhost. Nilai rahasia API disimpan pada `backend/.env` di server dan tidak dimasukkan ke Git atau bundle Angular.

Instal PM2 sekali sebagai user aplikasi pada versi Node yang dipilih CloudPanel:

```bash
npm install --global pm2
cd /path/ke/repository/MATEX
pm2 start ops/ecosystem.config.cjs
node ops/verify-runtime.cjs
pm2 save
```

`ops/ecosystem.config.cjs` mengunci proses ke loopback `9200`–`9202`, satu instance per layanan, batas memori, restart delay, dan waktu shutdown. Satu instance API dipertahankan karena rate limiter v1 masih memakai memori proses.

CloudPanel menjalankan Node melalui Site User dan dokumentasi resminya memakai cron untuk memulihkan daftar PM2 setelah reboot. Catat PATH dari sesi SSH user aplikasi, lalu edit crontab user itu:

```bash
echo "$PATH"
crontab -e
```

Tambahkan dua baris berikut, dengan nilai PATH persis dari perintah sebelumnya:

```cron
PATH=/home/matexindo/.nvm/versions/node/v22.x.x/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
@reboot pm2 resurrect &> /dev/null
```

Jalankan `pm2 save`, reboot VPS pada jendela pemeliharaan, lalu pastikan `pm2 status` dan `node ops/verify-runtime.cjs` tetap lulus. Jangan menyalin contoh versi `v22.x.x` apa adanya; gunakan PATH nyata dari server.

Untuk deployment berikutnya, build seluruh aplikasi dahulu lalu muat ulang hanya setelah semua build lulus:

```bash
pm2 startOrReload ops/ecosystem.config.cjs --update-env
node ops/verify-runtime.cjs
pm2 status
```

Jika verifikasi gagal, jangan arahkan trafik baru. Buka `pm2 logs --lines 200`, pulihkan release/commit terakhir yang sudah lulus, build ulang release tersebut, jalankan `startOrReload`, lalu ulangi `verify-runtime.cjs`. Backup database tidak dipulihkan untuk kegagalan kode biasa; restore database hanya dipakai jika migration atau data memang berubah dan prosedur restore sudah diputuskan.

Deployment rutin dari branch `main` dijalankan sebagai user aplikasi dengan:

```bash
cd /home/matexindo/htdocs/matexindo.com
bash ops/deploy-production.sh
```

Script hanya menerima fast-forward, menolak tracked file yang berubah di VPS,
berhenti jika menemukan migration baru, lalu memasang dependency, membangun,
dan me-restart proses yang memang berubah. Nilai khusus admin production disimpan
pada `frontend/admin/.env.production` dengan izin `0600`; file ini diabaikan Git
dan dipakai untuk menghasilkan environment Angular saat build.

## 4. Reverse proxy API pada kedua domain

Public dan admin memakai same-origin API. Pada Vhost Nginx kedua site, tambahkan lokasi khusus `/api/` yang meneruskan request ke:

```text
http://127.0.0.1:9200
```

Tambahkan lokasi `/files/` ke port yang sama jika `FILE_SERVE_LOCAL=true`. Letakkan aturan `/api/` dan `/files/` sebelum fallback SSR. Teruskan `Host`, `X-Real-IP`, `X-Forwarded-For`, dan `X-Forwarded-Proto`. Fallback public tetap ke `127.0.0.1:9201`, sedangkan fallback admin tetap ke `127.0.0.1:9202`. Public SSR meneruskan `/robots.txt` dan `/sitemap.xml` ke API melalui `MATEX_API_INTERNAL_URL`, sehingga endpoint SEO tidak bergantung pada DNS publik dari dalam server.

Blok yang siap disalin tersedia di `ops/nginx/matex-api-locations.conf`. Untuk masing-masing site buka **Sites → Manage → Vhost**, sisipkan kedua blok `location` tersebut di atas blok `location /` bawaan CloudPanel, lalu simpan. Jangan mengganti placeholder sertifikat, log, atau fallback `location /` yang dibuat CloudPanel. Pada Vhost public, blok pengalihan pertama sudah menangani `www.matexindo.com`; `server_name` pada blok aplikasi utama harus cukup `matexindo.com`. Hapus alias salah `www1.matexindo.com` dan jangan menduplikasi `www.matexindo.com` pada blok kedua. Editor CloudPanel menjalankan pemeriksaan sintaks dan mengembalikan konfigurasi lama bila konfigurasi baru invalid.

Ukuran request `/api/` disetel `55m` agar upload maksimum backend `50 MB` tidak ditolak Nginx lebih awal. Route lain tetap memakai batas bawaan Vhost.

Public dan admin SSR juga mengambil API serta aset terjemahan melalui loopback. Browser pengunjung tetap memakai domain HTTPS. API sudah dikonfigurasi untuk mempercayai proxy loopback dan menerima origin:

```text
https://matexindo.com
https://www.matexindo.com
https://internal.matexindo.com
```

## 5. Database dan file

Sebelum deployment pertama, jalankan `npm run db:migrate:status` dari backend. Database baru memakai `npm run db:migrate`. Database lama yang belum memiliki tabel riwayat harus dibackup dan ditinjau sebelum satu kali `npm run db:migrate:adopt`; jangan menjalankan migration biasa secara paksa pada database lama.

- Buat database dan user khusus MATEX; jangan memakai user database milik site lain.
- Identitas produksi yang sudah dibuat di CloudPanel: database `mia`, user `matexapp`, host `127.0.0.1`, port `3306`, dan hak **Read and Write**. Password tetap hanya disimpan di server/password manager.
- Database tidak dibuka ke internet.
- Isi `DB_HOST=127.0.0.1`, nama database, user, password, dan `DB_PORT=3306` pada environment backend.
- Simpan unggahan di `/home/matexindo/storage/files`, di luar checkout aplikasi dan dimiliki proses API.
- Simpan backup di `/home/matexindo/backups/matex`, di luar `FILE_STORAGE_ROOT`, dengan hak akses hanya untuk user proses MATEX.
- Baseline database kosong sudah lulus uji lokal; tetap jalankan backup dan restore drill pada salinan produksi sebelum migration pertama di VPS.

Karena proses API dijalankan sebagai `matexindo`, direktori persisten produksi disiapkan di dalam home site user agar tidak membutuhkan akses `root`:

```bash
install -d -m 0700 /home/matexindo/storage/files
install -d -m 0700 /home/matexindo/backups/matex
```

## 6. Backup dan restore drill

Perintah backup membutuhkan client MySQL/MariaDB, `tar`, dan `git`. Cek dahulu sebagai user proses API dari folder `backend`:

```bash
npm run backup:check -- --env-file .env --output-dir /home/matexindo/backups/matex
```

Jika `mysqldump` atau `mysql` belum tersedia pada Ubuntu, instal paket client saja. Jangan memasang database server kedua:

```bash
sudo apt update
sudo apt install --no-install-recommends default-mysql-client
```

Setelah pemeriksaan lulus, buat backup database dan seluruh media lokal:

```bash
npm run backup:create -- \
  --env-file .env \
  --output-dir /home/matexindo/backups/matex \
  --retention-days 14
```

Setiap backup disimpan pada direktori bernama `matex-<waktu UTC>` dan berisi dump database terkompresi, arsip media, serta `manifest.json` dengan checksum SHA-256. Kredensial database ditulis sementara ke file berizin `0600`, tidak dimasukkan ke argumen proses, dan dihapus setelah perintah selesai. Backup yang belum selesai memakai akhiran `.partial` dan tidak dianggap valid.

Verifikasi backup terbaru tanpa mengubah database atau file:

```bash
LATEST_BACKUP="$(find /home/matexindo/backups/matex -maxdepth 1 -type d -name 'matex-*' | sort | tail -n 1)"
npm run backup:verify -- --backup "$LATEST_BACKUP"
```

Produksi MATEX menjalankan backup otomatis setiap hari pukul 02.15 WIB melalui
crontab Site User. Job memakai `flock` pada
`/home/matexindo/tmp/matex-backup.lock`, mempertahankan backup selama 14 hari,
dan menulis hasil eksekusi terakhir ke
`/home/matexindo/backups/matex/backup-last.log`. Jadwal lokal ini tidak
menggantikan kebutuhan salinan backup di luar VPS.

Untuk drill, buat database kosong bernama `mia_restore_drill` dan beri user database MATEX akses ke database itu. Gunakan direktori file drill yang kosong dan berada di luar storage aktif:

```bash
npm run backup:restore -- \
  --backup "$LATEST_BACKUP" \
  --env-file .env \
  --target-db mia_restore_drill \
  --target-files /home/matexindo/storage-restore-drill/files \
  --confirm RESTORE:mia_restore_drill
```

Setelah restore, jalankan pemeriksaan jumlah tabel/record penting pada `mia_restore_drill`, cek beberapa file media dan checksum, lalu arahkan instance API sementara ke database dan storage drill untuk smoke test baca. Hapus target drill hanya setelah hasilnya dicatat. Script menolak target database/file aktif secara bawaan; opsi live hanya untuk prosedur pemulihan insiden yang sudah mematikan proses aplikasi dan memiliki persetujuan operasional terpisah.

Jadwalkan backup harian setelah satu backup manual dan restore drill lulus. Salin backup ke lokasi lain di luar VPS dengan enkripsi dan uji pemulihan dari salinan tersebut; backup yang hanya berada di VPS tidak melindungi dari kehilangan seluruh server.

## 7. TLS dan pengamanan jaringan

Terbitkan Let's Encrypt untuk:

- `matexindo.com`
- `www.matexindo.com`
- `internal.matexindo.com`

Aktifkan pengalihan HTTP ke HTTPS. Firewall publik cukup membuka SSH sesuai kebijakan server, HTTP 80, HTTPS 443, dan port CloudPanel 8443 yang dibatasi ke IP pengelola bila memungkinkan. Jangan membuka `9200`, `9201`, atau `9202`.

## 8. Pemeriksaan proses

- API hidup: `http://127.0.0.1:9200/health/live`
- API dan database siap: `http://127.0.0.1:9200/health/ready`
- Public SSR hidup: `http://127.0.0.1:9201/health/ssr`
- Admin SSR hidup: `http://127.0.0.1:9202/health/ssr`
- SEO public: `https://matexindo.com/robots.txt` dan `https://matexindo.com/sitemap.xml`

Health endpoint internal dipakai oleh PM2, monitor uptime, dan pemeriksaan deployment. Jangan menganggap proses siap menerima trafik hanya karena port terbuka; API wajib mengembalikan status `ready` setelah koneksi database berhasil.

Sesudah ketiga proses hidup dan vhost aktif, jalankan pemeriksaan pra-rilis dari root repository sebagai Site User:

```bash
MATEX_API_ORIGIN=http://127.0.0.1:9200 \
MATEX_PUBLIC_ORIGIN=https://matexindo.com \
MATEX_ADMIN_ORIGIN=https://internal.matexindo.com \
MATEX_EXPECTED_PUBLIC_ORIGIN=https://matexindo.com \
node ops/preflight-smoke.cjs
```

Perintah ini hanya melakukan request baca. Pemeriksaan mencakup live/ready API, kedua SSR, halaman utama dan canonical, aset statis, robots, sitemap, status/noindex 404, halaman login admin, serta kebocoran label Kartify. Sebelum DNS publik dipindah, arahkan sementara kedua hostname ke `72.60.77.35` melalui file hosts komputer penguji agar jalur Nginx dan TLS yang sama ikut diperiksa.

### Pemeriksaan browser release candidate

Pengujian browser berada di `ops/e2e` dengan dependency dan lockfile sendiri. Pemisahan ini menjaga alat pengujian agar tidak mengubah dependency runtime public maupun admin.

Pada komputer penguji yang sudah memiliki Google Chrome:

```bash
cd ops/e2e
npm ci

MATEX_PUBLIC_ORIGIN=https://matexindo.com \
MATEX_ADMIN_ORIGIN=https://internal.matexindo.com \
MATEX_EXPECTED_PUBLIC_ORIGIN=https://matexindo.com \
MATEX_E2E_BROWSER_CHANNEL=chrome \
npm test
```

Suite tanpa kredensial memeriksa halaman public ID/EN, canonical, 404/noindex, penanda versi 2 untuk account/cart/wishlist, login admin, route admin lama, dan kebocoran label template. Untuk menambahkan alur login baca-saja, isi kredensial akun staging melalui environment pada shell yang sama:

```bash
MATEX_E2E_ADMIN_IDENTITY="$STAGING_ADMIN_IDENTITY" \
MATEX_E2E_ADMIN_PASSWORD="$STAGING_ADMIN_PASSWORD" \
npm run test:admin
```

Jangan menyimpan kredensial tersebut di source, history deployment, atau file environment yang ikut Git. Di runner Linux tanpa Chrome, instal browser Playwright sekali dengan `npx playwright install --with-deps chromium`, lalu set `MATEX_E2E_BROWSER_CHANNEL=chromium`.

## 9. Pemeriksaan sebelum DNS go-live

1. `GET /health/live` pada API mengembalikan status hidup.
2. `GET /health/ready` berhasil terhubung ke database.
3. `node ops/preflight-smoke.cjs` lulus melalui domain staging/production target.
4. Browser E2E tanpa kredensial lulus dan alur login staging lulus dengan kredensial dari environment.
5. Login admin, edit/publish konten, media, produk, artikel, FAQ, kontak, dan pergantian bahasa lulus smoke test manual.
6. Canonical, hreflang, `robots.txt`, sitemap, dan respons 404 sudah benar.
7. Cookie login memiliki `Secure`, `HttpOnly`, dan `SameSite` yang sudah ditetapkan.
8. Port 9200–9202 hanya bisa diakses dari server sendiri.
9. Backup dan prosedur rollback release sudah diuji.

## Tindakan manual pemilik akun

- Mendaftarkan atau mengarahkan DNS domain.
- Membuat database serta kredensial di CloudPanel.
- Menerbitkan sertifikat TLS setelah DNS aktif.
- Merotasi Google Maps key lama di Google Cloud Console karena pernah tercatat dalam Git.
- Menghubungkan Search Console dan PageSpeed setelah domain dapat diverifikasi dengan langkah berikut.

### Hubungkan Search Console dan PageSpeed

1. Buat atau pilih Google Cloud project khusus MATEX.
2. Di **APIs & Services → Library**, aktifkan **Google Search Console API** dan **PageSpeed Insights API**.
3. Di Google Search Console, tambahkan property tipe **Domain** untuk `matexindo.com`, lalu pasang record DNS TXT verifikasi dari Google pada pengelola DNS domain.
4. Di Google Cloud **IAM & Admin → Service Accounts**, buat service account khusus pembacaan laporan SEO. Buat satu key JSON dan unduh sekali ke perangkat pemilik akun.
5. Di Search Console buka property `matexindo.com` → **Settings → Users and permissions**, lalu tambahkan email service account sebagai pengguna yang dapat membaca property. Backend MATEX sendiri memakai OAuth scope read-only.
6. Salin hanya `client_email` dan `private_key` dari JSON ke `backend/.env` pada VPS. Untuk satu baris environment, ganti line break private key dengan literal `\n` dan apit seluruh nilainya dengan tanda kutip. Jangan mengunggah file JSON ke Git atau folder public.
7. Buat API key terpisah untuk PageSpeed. Batasi key tersebut hanya untuk **PageSpeed Insights API** dan, bila pengaturan Google Cloud mendukungnya, batasi pemanggilan dari IP VPS `72.60.77.35`.
8. Isi konfigurasi berikut lalu reload proses API dengan `pm2 startOrReload ops/ecosystem.config.cjs --update-env`:

```dotenv
GOOGLE_SEARCH_CONSOLE_SITE_URL=sc-domain:matexindo.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=nama-service-account@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PAGESPEED_API_KEY=isi-api-key-pagespeed
```

9. Login ke `internal.matexindo.com`, buka **SEO & Mesin Pencari**, pastikan status property tampil, lalu jalankan audit mobile dan desktop satu kali. Search Console bukan realtime; console MATEX sengaja meminta data final sampai tiga hari sebelum hari berjalan.

Jika salah satu dari tiga nilai Search Console terisi sementara yang lain kosong, API production akan berhenti saat startup dengan pesan konfigurasi tidak lengkap. Ini disengaja agar deployment tidak terlihat sehat ketika credential sebenarnya rusak.
