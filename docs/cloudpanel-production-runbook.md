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
- Site User: gunakan nama khusus seperti `matex-public`
- Password: buat password acak yang kuat dan simpan di password manager

Tambahkan `www.matexindo.com` sebagai alias domain setelah site selesai dibuat.

### Admin

- Domain Name: `internal.matexindo.com`
- Node.js Version: **Node 22 LTS**
- App Port: `9202`
- Site User: gunakan nama khusus seperti `matex-admin`
- Password: buat password acak yang berbeda dan simpan di password manager

Port pada CloudPanel harus sama dengan `PORT` proses SSR yang dijalankan PM2.

## 3. Proses aplikasi

Gunakan tiga proses Node terpisah:

| Proses | Perintah produksi | Environment utama |
| --- | --- | --- |
| API | `npm run start:prod` dari folder `backend` | `NODE_ENV=production`, `PORT=9200`, `PUBLIC_COMPANY_ID=1`, `PUBLIC_SITE_URL=https://matexindo.com` |
| Public SSR | `npm run serve:ssr` dari folder `frontend/public` | `NODE_ENV=production`, `PORT=9201`, `MATEX_API_INTERNAL_URL=http://127.0.0.1:9200`, `MATEX_PUBLIC_INTERNAL_URL=http://127.0.0.1:9201` |
| Admin SSR | `npm run serve:ssr` dari folder `frontend/admin` | `NODE_ENV=production`, `PORT=9202` |

Jalankan proses API dengan site user public (`matex-public`) atau user aplikasi khusus yang hanya diberi akses ke folder backend dan storage MATEX. Jangan menjalankannya sebagai user milik site lama.

Build sebelum proses dijalankan:

```text
backend: npm ci lalu npm run build
frontend/public: npm ci lalu npm run build
frontend/admin: npm ci lalu npm run build
```

Jalankan dengan PM2 sebagai site user, bukan `root`. Simpan konfigurasi PM2 setelah ketiga proses sehat agar otomatis kembali setelah reboot. Nilai rahasia API disimpan pada file environment di server dan tidak dimasukkan ke Git atau bundle Angular.

## 4. Reverse proxy API pada kedua domain

Public dan admin memakai same-origin API. Pada Vhost Nginx kedua site, tambahkan lokasi khusus `/api/` yang meneruskan request ke:

```text
http://127.0.0.1:9200
```

Tambahkan lokasi `/files/` ke port yang sama jika `FILE_SERVE_LOCAL=true`. Letakkan aturan `/api/` dan `/files/` sebelum fallback SSR. Teruskan `Host`, `X-Real-IP`, `X-Forwarded-For`, dan `X-Forwarded-Proto`. Fallback public tetap ke `127.0.0.1:9201`, sedangkan fallback admin tetap ke `127.0.0.1:9202`. Public SSR meneruskan `/robots.txt` dan `/sitemap.xml` ke API melalui `MATEX_API_INTERNAL_URL`, sehingga endpoint SEO tidak bergantung pada DNS publik dari dalam server.

API sudah dikonfigurasi untuk mempercayai proxy loopback dan menerima origin:

```text
https://matexindo.com
https://www.matexindo.com
https://internal.matexindo.com
```

## 5. Database dan file

Sebelum deployment pertama, jalankan `npm run db:migrate:status` dari backend. Database baru memakai `npm run db:migrate`. Database lama yang belum memiliki tabel riwayat harus dibackup dan ditinjau sebelum satu kali `npm run db:migrate:adopt`; jangan menjalankan migration biasa secara paksa pada database lama.

- Buat database dan user khusus MATEX; jangan memakai user database milik site lain.
- Database tidak dibuka ke internet.
- Isi `DB_HOST=127.0.0.1`, nama database, user, password, dan `DB_PORT=3306` pada environment backend.
- Simpan unggahan di `/var/lib/matex/files` atau storage persisten lain yang dimiliki proses API.
- Siapkan backup database dan file, lalu uji restore sebelum go-live.
- Baseline database kosong sudah lulus uji lokal; tetap jalankan backup dan restore drill pada salinan produksi sebelum migration pertama di VPS.

## 6. TLS dan pengamanan jaringan

Terbitkan Let's Encrypt untuk:

- `matexindo.com`
- `www.matexindo.com`
- `internal.matexindo.com`

Aktifkan pengalihan HTTP ke HTTPS. Firewall publik cukup membuka SSH sesuai kebijakan server, HTTP 80, HTTPS 443, dan port CloudPanel 8443 yang dibatasi ke IP pengelola bila memungkinkan. Jangan membuka `9200`, `9201`, atau `9202`.

## 7. Pemeriksaan proses

- API hidup: `http://127.0.0.1:9200/health/live`
- API dan database siap: `http://127.0.0.1:9200/health/ready`
- Public SSR hidup: `http://127.0.0.1:9201/health/ssr`
- Admin SSR hidup: `http://127.0.0.1:9202/health/ssr`
- SEO public: `https://matexindo.com/robots.txt` dan `https://matexindo.com/sitemap.xml`

Health endpoint internal dipakai oleh PM2, monitor uptime, dan pemeriksaan deployment. Jangan menganggap proses siap menerima trafik hanya karena port terbuka; API wajib mengembalikan status `ready` setelah koneksi database berhasil.

## 8. Pemeriksaan sebelum DNS go-live

1. `GET /health/live` pada API mengembalikan status hidup.
2. `GET /health/ready` berhasil terhubung ke database.
3. Public dan admin dapat dirender oleh SSR tanpa fallback error.
4. Login admin, edit/publish konten, media, produk, artikel, FAQ, kontak, dan pergantian bahasa lulus smoke test.
5. Canonical, hreflang, `robots.txt`, sitemap, dan respons 404 sudah benar.
6. Cookie login memiliki `Secure`, `HttpOnly`, dan `SameSite` yang sudah ditetapkan.
7. Port 9200–9202 hanya bisa diakses dari server sendiri.
8. Backup dan prosedur rollback release sudah diuji.

## Tindakan manual pemilik akun

- Mendaftarkan atau mengarahkan DNS domain.
- Membuat database serta kredensial di CloudPanel.
- Menerbitkan sertifikat TLS setelah DNS aktif.
- Merotasi Google Maps key lama di Google Cloud Console karena pernah tercatat dalam Git.
- Nantinya menghubungkan Search Console dan GA4 setelah domain dapat diverifikasi.
