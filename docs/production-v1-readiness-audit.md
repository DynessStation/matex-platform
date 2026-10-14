# Audit kesiapan pra-produksi MATEX v1

Tanggal audit: 14 Oktober 2026

Target publik: `https://matexindo.com` dan `https://www.matexindo.com`  
Target admin: `https://internal.matexindo.com`

## Keputusan audit

Status saat ini adalah **belum siap dipublikasikan ke produksi**, tetapi fondasi lokal utamanya sudah selesai: build ketiga aplikasi, baseline migration, hardening API, SSR/SEO, backup tooling, analitik first-party, dan console SEO dapat diverifikasi. Blocker yang tersisa terutama berada pada rotasi key, pengujian alur browser terautentikasi, serta rehearsal nyata di VPS sebelum DNS diarahkan.

Audit ini sengaja belum menghapus file, rute, package, atau tabel. Penghapusan baru dilakukan setelah rute v1 dikunci, pemakaian runtime dibuktikan, backup diuji, dan ada migration yang dapat ditinjau serta dibatalkan.

## Progress setelah audit

### Checkpoint produksi — 14 Oktober 2026

- Public `matexindo.com`, admin `internal.matexindo.com`, dan API sudah aktif di VPS melalui CloudPanel/Nginx dengan proses PM2 terpisah pada port loopback 9201, 9202, dan 9200.
- Database dan media produksi sudah dimigrasikan. Backup terbaru setelah pembaruan konten tersimpan di `/home/matexindo/backups/matex/matex-20261014T072525Z`; checksum database serta arsip media lulus verifikasi.
- Preflight melalui domain produksi lulus 23 dari 23 pemeriksaan. Browser E2E melalui domain produksi lulus 24 dari 25 skenario; satu skenario login terautentikasi dilewati karena kredensial admin tidak disimpan di repository.
- Sertifikat TLS kedua domain valid. HTTP dialihkan ke HTTPS, canonical/hreflang/robots/sitemap dan status 404 produksi lulus pemeriksaan.
- File media dapat dipakai oleh public dan subdomain admin melalui `Cross-Origin-Resource-Policy: cross-origin`; API selain jalur file tetap memakai kebijakan Helmet bawaan.
- File verifikasi Google `google2d6b672547ebc9cd.html` sudah diterbitkan melalui build public dan merespons 200 dengan isi verifikasi yang tepat.
- Sisa gerbang operasional: uji tulis terautentikasi yang terstruktur, salinan backup di luar VPS serta restore drill terbaru, keputusan aktivasi analitik setelah pemberitahuan privasi, koneksi credential Search Console/PageSpeed, dan bukti rotasi Google Maps key lama.

### Tahap 2 — batch hardening pertama

Selesai diterapkan dan diverifikasi pada 12 Oktober 2026:

- Environment production public dan admin sudah memakai `matexindo.com` dan `internal.matexindo.com`, tanpa URL localhost.
- Google Maps key yang terlanjur berada di environment terlacak sudah dikeluarkan dari source aktif. Key lama tetap harus dirotasi di Google Cloud karena pernah tercatat dalam Git.
- Cookie autentikasi memakai `Secure` secara default saat `NODE_ENV=production`, serta mempertahankan `HttpOnly`, `SameSite=Lax`, dan path yang konsisten ketika login/logout.
- Empat endpoint `generate-hash*` tanpa autentikasi sudah dihapus.
- API mendapat Helmet, compression, global API rate limit, login rate limit, body-size limit, controlled proxy trust, structured request completion log, health/readiness endpoint, startup database check, fail-fast route loading, loopback bind, dan graceful shutdown.
- Backend sekarang memiliki build khusus production dan perintah untuk menjalankan JavaScript hasil compile.
- Dependency audit produksi backend turun dari 3 advisory menjadi 0.
- Typecheck, backend production build, 39 contract test, public SSR build, dan admin SSR build kembali lulus setelah perubahan.

Temuan lanjutan: rangkaian migration saat ini belum dapat membuat database kosong secara mandiri. Migration pertama masih mengandalkan tabel dasar lama seperti company/admin/attachment yang berasal dari dump awal. Karena itu migration runner tidak boleh dianggap selesai hanya dengan menambahkan tabel history; tahap berikutnya harus membentuk baseline schema yang dapat direproduksi, lalu menguji bootstrap database kosong dan upgrade database berisi data.

### Tahap 2 — batch identitas, scope v1, dan dependency

Selesai diterapkan dan diverifikasi pada 13 Oktober 2026:

- Identitas package, output build, judul, favicon, logo admin, URL, timezone, SKU, dan copyright sudah memakai MATEX serta domain produksi.
- Istilah vendor template dan tautan demo eksternal sudah dikeluarkan dari source serta bundle produksi. Konten legal, seller, tim, dan testimoni contoh dinonaktifkan agar tidak menjadi klaim MATEX.
- Filter rating dan atribut dinamis disembunyikan dari katalog publik. Filter kategori dan harga tetap tersedia.
- Cart, wishlist, dan account dipertahankan sebagai pratinjau versi 2. Checkout, compare, seller, order, dan route commerce lain diarahkan ke halaman versi 2.
- Public/admin SSR hanya bind ke `127.0.0.1`. Port produksi ditetapkan menjadi API `9200`, public `9201`, dan admin `9202`, sehingga tidak bentrok dengan site lama pada `9000` dan `9100`.
- Angular diperbarui ke `21.2.25`, Express dan Swiper diperbarui, dan dependency audit produksi backend, public, serta admin kini masing-masing 0 advisory.
- Public dan admin berhasil dibuild ulang setelah upgrade dependency. Bundle hasil build juga lulus pemindaian istilah vendor lama dan pola secret yang diketahui.
- Proses SSR public dan admin berhasil dijalankan pada `127.0.0.1:9201` dan `127.0.0.1:9202`; route utama, katalog, account/v2, checkout/v2, serta admin merespons HTTP 200. Pengambilan data production-domain belum dapat dinyatakan lulus sampai DNS, TLS, reverse proxy `/api`, dan API staging benar-benar tersedia.
- Runbook CloudPanel untuk `72.60.77.35`, DNS, Node.js site, PM2, reverse proxy, database, TLS, firewall, serta checklist go-live tersedia di `docs/cloudpanel-production-runbook.md`.

### Tahap 2 — baseline database dan discovery SEO

Selesai diterapkan dan diverifikasi pada 13 Oktober 2026:

- Baseline struktur inti tanpa data akun atau password hash sekarang tersedia sebagai migration pertama.
- Migration runner memakai lock database, checksum, tabel `schema_migrations`, status, dan jalur adopsi database lama yang memvalidasi target sebelum mencatat history.
- Seluruh 20 migration berhasil dijalankan berurutan pada database sementara yang benar-benar kosong, menghasilkan 46 tabel termasuk tabel history. Database uji langsung dihapus setelah verifikasi.
- Database development lama berhasil diadopsi tanpa menjalankan ulang SQL dan tanpa mengubah data aplikasi; statusnya sekarang `current` dengan 20 migration tercatat.
- Cacat nama kolom ambigu pada migration normalisasi halaman Tentang ditemukan oleh fresh bootstrap dan diperbaiki.
- `robots.txt` dan sitemap XML dinamis hanya memuat route public v1 serta produk, kategori, artikel, dan halaman yang terpublikasi. Route commerce versi 2 dikeluarkan dari discovery mesin pencari.
- Public dan admin SSR sekarang memiliki health endpoint khusus proses. API tetap menyediakan liveness serta readiness yang memeriksa database.
- Backend typecheck dan 42 contract/regression test lulus setelah perubahan.
- Smoke test proses lokal lulus untuk API live/ready, public SSR, admin SSR, robots, dan sitemap. Sitemap dari data development berisi 134 URL publik dan tidak memasukkan route commerce versi 2.

### Tahap 3 — kunci router admin v1

Selesai diterapkan dan diverifikasi pada 13 Oktober 2026:

- Router admin production dipersempit dari 41 menjadi 18 root route yang benar-benar dipakai MATEX: dashboard/analitik/SEO, administrasi, konten website, katalog, media, FAQ, dan akun admin sendiri.
- Route demo order, user toko, role template, attribute/tag/brand produk template, store, wallet, commission, payout, coupon, shipping, refund, review, subscription, theme, dan settings template dilepas dari graph build. Source yang masih mungkin berguna untuk versi 2 belum dihapus massal.
- Shortcut header sekarang hanya membuka tambah produk, tambah artikel, dan pustaka media dengan permission MATEX yang benar.
- Notifikasi demo yang membaca fixture JSON sudah dihapus dari startup, header, state, route, dan aset production. Screenshot theme-option, fixture wallet/notifikasi, serta stylesheet khusus halaman demo terkait juga dihapus.
- Fixture JSON yang tidak lagi direferensikan bundle production juga dibuang. Direktori data admin turun menjadi delapan fixture yang masih dipakai (`badge`, `country`, `menu`, `self`, `settings`, `state`, `store`, dan `tag`); 36 fixture lain yang tidak memiliki referensi bundle dihapus.
- Admin production build lulus setelah pemangkasan. Initial browser bundle turun dari sekitar 2,17 MB raw / 366,77 KB transfer menjadi 2,02 MB raw / 330,53 KB transfer; lazy browser chunk turun dari sekitar 262 menjadi sekitar 105.
- Pemindaian artefak build tidak lagi menemukan `order.json`, `notifications.json`, `theme-option`, `coupon.json`, `withdrawal.json`, `license-key.json`, `vendor-wallet`, Kartify, atau Pixelstrap.
- Smoke SSR admin membuktikan health dan login tetap merespons, sedangkan URL demo langsung seperti `/order` dan `/theme-option` sekarang menampilkan halaman tidak ditemukan tanpa label vendor lama.

### Tahap 4 — kontrak SEO dan status SSR

Selesai diterapkan dan diverifikasi pada 13 Oktober 2026:

- Produk, kategori, artikel, dan halaman website sekarang memakai satu pengelola metadata yang membersihkan tag lama ketika navigasi, membatasi canonical ke origin MATEX, serta menghasilkan Open Graph dan Twitter metadata secara konsisten.
- Halaman bilingual menghasilkan canonical, `hreflang` Indonesia/English, dan `x-default`. Produk memakai schema `Product`, kategori memakai `CollectionPage`, artikel memakai `Article`, sedangkan halaman CMS memakai `WebPage` dan identitas organisasi pada beranda.
- Route client yang tidak dikenal menampilkan halaman 404. Route server yang tidak dikenal, route legacy `/page/:slug`, dan halaman error eksplisit mengirim status HTTP yang sesuai.
- Slug produk, kategori, atau artikel yang tidak ditemukan diarahkan secara internal ke halaman error lengkap sambil mempertahankan HTTP 404 dan `noindex, nofollow` pada URL asal.
- Request API saat SSR memakai `MATEX_API_INTERNAL_URL` dan request aset runtime memakai `MATEX_PUBLIC_INTERNAL_URL`, sehingga render server tidak bergantung pada DNS atau TLS publik dari dalam VPS.
- Pembacaan halaman CMS tetap melewati auth/loader/toast toko, tetapi tidak lagi melewati interceptor origin SSR. Ini menutup kegagalan 503 saat domain publik belum aktif dan memastikan halaman CMS dirender melalui API loopback.
- Build production public lulus. Smoke SSR lokal lulus untuk produk, kategori, artikel, route tidak dikenal, dan slug produk tidak dikenal. Detail terpublikasi merespons 200 dengan canonical, dua locale, `x-default`, dan JSON-LD; kedua kasus tidak ditemukan merespons 404 tanpa canonical serta dengan `noindex`.
- Pemeriksaan pra-rilis read-only tersedia di `ops/preflight-smoke.cjs`. Tool ini menguji health API/SSR, canonical home, cache aset, robots, sitemap, kontrak 404, halaman login admin, dan kebocoran label Kartify melalui origin yang dapat diarahkan ke loopback, staging, atau domain produksi.

### Tahap 5 — fondasi analitik first-party

Selesai diterapkan dan diverifikasi pada 13 Oktober 2026:

- Public dapat mengambil konfigurasi analitik dari API. Pencatatan tetap nonaktif secara default sampai pemberitahuan privasi dan keputusan aktivasi produksi selesai ditinjau.
- Event `page_view`, `outbound_click`, `contact_start`, `contact_submit`, dan Core Web Vitals (`LCP`, `INP`, `CLS`) memiliki allowlist serta batas payload yang ketat. Browser menghormati Do Not Track dan Global Privacy Control.
- Sesi anonim hanya disimpan sementara di `sessionStorage`; backend menyimpan HMAC hash dan tidak menyimpan alamat IP mentah. Referrer dipangkas menjadi hostname agar query atau path sensitif tidak tersimpan.
- Endpoint ingestion mengabaikan bot umum, menolak waktu dan path tidak valid, serta memakai UUID event unik agar retry tidak menggandakan data.
- Endpoint admin berizin `dashboard.view` menyediakan ringkasan maksimal 90 hari: page view, pengunjung anonim, pengunjung aktif 5 menit terakhir, klik keluar, awal/kirim kontak, tren harian, halaman, sumber, dan negara bila trusted proxy header kelak diaktifkan.
- Migration baru berhasil diterapkan pada database development lama. Uji endpoint nyata membuktikan event pertama tersimpan, retry UUID yang sama tidak menggandakan baris, dan data smoke-test kemudian dihapus.
- Backend typecheck, production build, serta 50 contract/regression test lulus. Dashboard admin dan halaman Analitik Publik sudah memakai endpoint MATEX nyata.

### Tahap 6 — Search Console dan PageSpeed

Selesai diterapkan dan diverifikasi secara lokal pada 13 Oktober 2026:

- Halaman admin **SEO & Mesin Pencari** memakai endpoint backend MATEX dan permission `dashboard.view`; tidak menempelkan halaman Google melalui iframe.
- Search Console memakai service account, scope baca saja, property yang ditetapkan server, rentang 7/28/90 hari, dan hanya meminta data final sampai tiga hari sebelum tanggal berjalan.
- Ringkasan menampilkan klik, impresi, CTR, posisi berbobot impresi, kueri teratas, dan halaman teratas. Saat kredensial belum tersedia, endpoint mengembalikan status belum terhubung tanpa membuat admin gagal dimuat.
- PageSpeed Insights berjalan hanya atas perintah admin, dibatasi ke path same-origin `matexindo.com`, serta memisahkan audit mobile dan desktop.
- Konfigurasi Google tetap opsional. Production startup menolak konfigurasi Search Console yang hanya terisi sebagian agar kesalahan secret tidak tersembunyi.
- Backend typecheck, production build, 56 contract/regression test, targeted lint halaman admin, admin SSR build, dan dependency audit produksi backend lulus. Integrasi live tetap menunggu domain property, API, service account, dan API key milik pemilik akun.

## Hasil pemeriksaan yang sudah dijalankan

| Area | Hasil | Catatan |
| --- | --- | --- |
| Backend TypeScript | Lulus | `npm run typecheck` berhasil. |
| Backend contract/regression test | Lulus | 56 dari 56 test berhasil. |
| Public production build | Lulus | Angular SSR menghasilkan browser dan server bundle. |
| Admin production build | Lulus | Angular SSR menghasilkan browser dan server bundle. |
| Public lint | Lulus | 0 error dan 125 warning. Warning tersisa menjadi utang kualitas yang tidak memblokir build. |
| Admin lint | Lulus | 0 error dan 17.236 warning; mayoritas warning format/line ending dari template lama dan perlu dinormalisasi bertahap agar diff tetap dapat ditinjau. |
| Frontend browser E2E | Lulus sebagian | 24 dari 25 skenario release-candidate lulus lokal; 1 alur login admin dilewati karena kredensial staging tidak disimpan di repository. |
| Dependency audit backend | Lulus | 0 advisory produksi. |
| Dependency audit public | Lulus | 0 advisory produksi setelah patch Angular/Express/Swiper dan dedupe lockfile. |
| Dependency audit admin | Lulus | 0 advisory produksi setelah patch Angular/Express/Swiper dan override ProseMirror yang kompatibel. |
| Database lokal | Lulus | 47 tabel aplikasi dan 23 migration tercatat; fresh bootstrap seluruh 23 migration serta upgrade database lama sudah lulus. |
| Preflight lintas aplikasi lokal | Lulus | 23 dari 23 pemeriksaan lulus dengan origin/canonical production: API live/ready, health kedua SSR, seluruh halaman wajib dua bahasa, katalog, artikel, aset/cache, robots, sitemap, kontrak 404, dan login admin. |

Build yang lulus membuktikan bahwa source dapat dikompilasi. Itu belum membuktikan keamanan, konfigurasi domain, kesehatan proses, perilaku browser, dan kesiapan operasi produksi.

## Blocker sebelum go-live

### P0 — wajib selesai sebelum server menerima trafik publik

1. **E2E terautentikasi dan alur tulis belum diuji di staging.** Suite browser read-only lokal sudah lulus 24 skenario dengan 1 login terautentikasi dilewati. Login admin, publish konten, upload media, cookie HTTPS, reverse proxy, dan alur edit perlu diuji melalui domain staging dengan akun khusus.
2. **Backup/restore dan penyimpanan file belum diuji di VPS.** Tool backup database/media, manifest checksum, retensi aman, verifikasi, dan restore bertarget sudah tersedia. Kepemilikan storage, backup terjadwal, salinan di luar VPS, restore drill, serta rollback release tetap harus lulus pada data staging sebelum DNS dipindah.
3. **Google Maps key lama belum dirotasi oleh pemilik akun.** Key baru hanya boleh dipakai setelah dibatasi ke referrer MATEX dan API yang benar.

### P1 — selesai sebelum release candidate

- Selesaikan strategi backup/restore, retensi log, alerting health, dan pengukuran compression/cache di staging.
- Kurangi warning lint secara bertahap dan pisahkan perubahan format/line ending dari perubahan perilaku agar lint tetap berguna sebagai quality gate.
- Perluas E2E browser staging ke create/edit/publish konten, upload multi-media, produk detail nyata, serta respons mobile. Public navigation, halaman wajib ID/EN, account/cart/wishlist versi 2, 404/noindex, login admin tanpa autentikasi, dan route admin lama sudah dicakup secara otomatis.
- Tinjau kebijakan cache. Seluruh endpoint publik utama saat ini mengirim `Cache-Control: no-store`; ini aman dari stale content tetapi membuang peluang cache untuk katalog dan CMS yang jarang berubah.
- Terapkan rate limit yang menyadari reverse proxy. Rate limit kontak saat ini disimpan di memori satu proses, sehingga hilang saat restart dan tidak sinkron bila proses diperbanyak.
- Tentukan penyimpanan file produksi, backup, batas ukuran, malware scanning bila diperlukan, dan lifecycle file yatim.

## Batas v1 dan legacy template

Keputusan scope publik sudah diterapkan pada router dan diverifikasi melalui SSR lokal. Account, cart, dan wishlist tetap dapat dibuka sebagai pratinjau dengan keterangan versi 2. Checkout, compare, seller, brand, tracking order, dan route commerce langsung lain masuk ke halaman generik versi 2 serta tidak muncul pada navigasi, robots, atau sitemap. Katalog SSR hanya menampilkan filter kategori dan harga; rating, brand, serta atribut dinamis tidak tampil. Halaman yang diuji tidak lagi memuat label Kartify/Pixelstrap.

Source legacy yang mungkin masih bernilai untuk versi 2 tetap disimpan di repository, tetapi route, state provider, shortcut, stylesheet halaman, preview, dan fixture demo yang terbukti tidak dipakai sudah dikeluarkan dari graph build production. Source tersisa tetap perlu diaudit per kelompok sebelum dihapus permanen; keberadaannya bukan alasan untuk menghapus modul atau tabel database secara massal.

Karena route lazy tetap masuk graph build, menyembunyikan menu saja belum mengeluarkan legacy dari artefak produksi. Prosedur yang aman:

1. Kunci matriks route **v1 aktif / v2 diparkir / demo dihapus**.
2. Putuskan route yang bukan v1 dari production router dan navigation.
3. Pindahkan source v2 yang masih bernilai ke area archive yang tidak dikompilasi, atau pertahankan di branch/tag rilis v1.
4. Hapus fixture JSON, gambar, font, translation, interface, store, dan package hanya setelah pemeriksaan import statis dan smoke test.
5. Ukur ulang bundle dan aset setelah setiap kelompok penghapusan.

Data ukuran yang menjadi baseline audit:

- Public initial browser bundle sekitar 1,77 MB raw / 289 KB estimated transfer.
- Admin initial browser bundle sekitar 2,02 MB raw / 331 KB estimated transfer setelah route dan aset demo tahap pertama dilepas.
- Public assets sekitar 20,65 MB, didominasi font, gambar, CSS, dan fixture data.
- Admin assets sekitar 21,32 MB, didominasi font, gambar, fixture data, dan SCSS.
- Admin menghasilkan sekitar 105 lazy browser chunks setelah pemangkasan router tahap pertama; public sekitar 46 lazy browser chunks.

Target bukan menghapus Kartify secara membabi buta. Komponen layout, responsivitas, tabel, form, chart, spacing, dan visual yang sudah baik tetap dipakai. Demo commerce, data palsu, route tidak relevan, dan aset tanpa pemakai harus keluar dari build v1.

## Audit tabel database

Tabel operasional inti memiliki referensi langsung di backend dan harus dipertahankan: admin/access/permission, audit log, attachment, company, office, navigation, website page, contact/inquiry, FAQ, article, product category, product catalog, translation, media, price, dan marketplace.

Tabel berikut belum boleh langsung di-drop:

| Tabel | Temuan | Keputusan tahap ini |
| --- | --- | --- |
| `article_category*` | Baru muncul di migration, belum dipakai controller | Parkir sampai organizer artikel v1 diputuskan. |
| `article_tag*` | Baru muncul di migration, belum dipakai controller | Parkir sampai tag/internal-link artikel diputuskan. |
| `faq_category*` | Dipakai public FAQ walau datanya dapat kosong | Pertahankan. |
| `comp_category` | Memuat dua lookup kategori perusahaan; `master_comp.id_comp_category` aktif memakai ID 1, walau schema lama belum memiliki foreign key | Pertahankan. Migration restorasi memastikan fresh bootstrap memiliki lookup yang sama tanpa menimpa data lama. |

Sebelum drop apa pun, buat laporan pemakaian yang mencakup query backend, foreign key, trigger/view, row count, data unik, import script, serta kebutuhan v2. Penghapusan dilakukan lewat migration baru, bukan perintah manual langsung ke database produksi.

## Desain analitik publik untuk admin

Menempelkan Google Analytics atau Search Console dengan iframe bukan rancangan yang stabil. Data harus diambil server MATEX melalui API resmi, disimpan sebagai cache/agregat seperlunya, lalu ditampilkan memakai card, chart, table, filter tanggal, dan warna Kartify yang sudah konsisten.

### Sumber data yang direkomendasikan

| Sumber | Kegunaan di admin | Sifat data |
| --- | --- | --- |
| GA4 Data API | Pengunjung aktif, page view, event, device, negara/kota, referral, key event | Realtime GA4 mencakup sekarang sampai sekitar 30 menit terakhir. |
| First-party MATEX events | Klik marketplace, klik kontak/WhatsApp, pencarian, filter, download, error UI, Web Vitals | Dapat tampil mendekati realtime dan definisinya dikendalikan MATEX. |
| Google Search Console API | Click, impression, CTR, posisi, query, landing page, country/device, sitemap, status index URL | Bukan realtime; data Search Analytics lazimnya baru tersedia 2–3 hari kemudian. |
| PageSpeed Insights API | Audit lab performance, accessibility, best practices, dan SEO | Dijalankan berkala atau atas permintaan; jangan setiap page view. |
| CrUX API | LCP, INP, CLS dan pengalaman pengguna nyata | Agregat 28 hari, diperbarui harian, dan hanya tersedia jika sampelnya cukup. |
| Bing Webmaster REST API / IndexNow | Statistik Bing, crawl/index, sitemap, notifikasi URL berubah | Opsional setelah Google stabil; jangan memakai SOAP/POX legacy. |

### Event first-party v1

Event minimal yang berguna dan tidak membanjiri database:

- `page_view`
- `product_view`
- `article_view`
- `search`
- `category_filter`
- `marketplace_click`
- `contact_click`
- `contact_submit`
- `language_change`
- `web_vital` untuk LCP, INP, dan CLS
- `frontend_error` yang sudah dibersihkan dari data sensitif

Gunakan session identifier acak, consent state, timestamp, route, referrer domain, locale, device class, campaign UTM, dan lokasi agregat. Jangan menyimpan raw IP sebagai identitas pengunjung. Untuk realtime v1, polling 15–30 detik lebih sederhana dan stabil daripada WebSocket; SSE dapat ditambahkan bila kebutuhan operasional terbukti.

### Struktur halaman admin

**Dashboard utama** tetap memakai bahasa visual Kartify, tetapi datanya diganti dari demo e-commerce menjadi:

- Pengunjung aktif sekarang
- Pengunjung dan page view hari ini
- Klik marketplace
- Pesan kontak baru
- Konten published/draft yang butuh perhatian
- Status API, SSR public, database, file storage, email, dan sinkronisasi Google
- Grafik trafik 7/30 hari
- Top produk, artikel, halaman, referrer, device, dan lokasi
- Ringkasan Search Console terbaru dengan label waktu pembaruan yang jelas

**Analitik Publik** sudah tersedia untuk tren, funnel kontak, lokasi agregat, referrer, halaman populer, dan pengalaman pengguna nyata melalui LCP/INP/CLS. Device, campaign, rincian event, dan export ditambahkan setelah kontrak event serta kebutuhan operasionalnya ditetapkan.

**SEO & Mesin Pencari** sudah menyediakan Search Console dan PageSpeed melalui API resmi dengan rentang tanggal, loader, status gagal, status konfigurasi, audit mobile/desktop, serta keterangan bahwa data pencarian tidak realtime. Sitemap, URL Inspection, CrUX, scheduled cache/sync, serta Bing/IndexNow tetap menjadi perluasan setelah koneksi Google dasar terbukti di staging.

Dashboard sekarang membaca endpoint MATEX nyata dan menampilkan trafik, pengunjung aktif 5 menit terakhir, funnel kontak, status produk/artikel/FAQ, halaman teratas, serta sumber trafik. Angka store/order/revenue/review dan copy demo Kartify sudah dikeluarkan dari komponen dashboard. Dashboard dan halaman Analitik Publik memperbarui data setiap 30 detik serta menyediakan filter 7/30/90 hari.

## Topologi production yang disarankan

MATEX public dan admin adalah **Node.js site**, bukan PHP dan bukan static-only, karena keduanya memakai Angular SSR.

```text
Internet
   |
CloudPanel Nginx + TLS
   |-- matexindo.com ----------> Public Angular SSR 127.0.0.1:9201
   |       |-- /api -----------> MATEX API 127.0.0.1:9200
   |       |-- /files ---------> MATEX API 127.0.0.1:9200
   |       `-- /robots.txt + /sitemap.xml -> MATEX API 127.0.0.1:9200
   |
   `-- internal.matexindo.com --> Admin Angular SSR 127.0.0.1:9202
           |-- /api -----------> MATEX API 127.0.0.1:9200
           `-- /files ---------> MATEX API 127.0.0.1:9200

MATEX API 127.0.0.1:9200 ------> MySQL/MariaDB via private/local connection
```

PM2 menjaga tiga proses Node tetap hidup dan menghidupkannya setelah reboot. Nginx menangani TLS, redirect HTTP ke HTTPS, canonical redirect `www`, request limits, static cache, dan proxy. API tidak perlu diekspos lewat port 3000 ke internet.

CloudPanel mendukung Node.js site, pemilihan versi Node dan app port, serta menjalankan aplikasi dengan PM2. Sertifikat Let's Encrypt baru diterbitkan setelah DNS domain sudah menunjuk ke VPS.

## Registrasi yang harus dilakukan pemilik akun

Belum perlu dilakukan sebelum hardening lokal selesai. Saat masuk tahap integrasi dan deployment, pemilik akun perlu:

1. Membuat atau memilih Google Cloud project khusus MATEX.
2. Membuat GA4 property dan Web Data Stream untuk `matexindo.com`; simpan Measurement ID dan Property ID.
3. Menambahkan domain property `matexindo.com` di Google Search Console dan memverifikasinya lewat DNS TXT.
4. Mengaktifkan Google Analytics Data API, Search Console API, PageSpeed Insights API, dan CrUX API sesuai fitur yang dipilih.
5. Membuat credential server dengan hak minimum, memberi akun tersebut akses baca ke GA4/Search Console, lalu menyimpan secret hanya di server/secret store.
6. Merotasi Google Maps key, membatasi HTTP referrer ke domain admin yang memakai peta, serta membatasi API yang boleh dipanggil.
7. Opsional: membuat Bing Webmaster Tools, mengimpor property dari Search Console, lalu menyalakan REST API/IndexNow.
8. Menyiapkan record DNS `A` untuk apex, `www`, dan `internal` ke IP VPS setelah release candidate lolos.

Refresh token, service-account JSON, API secret, SMTP password, JWT secret, dan database password tidak boleh masuk Git atau bundle Angular.

## Tahapan kerja yang aman

### Tahap 1 — audit dan pemetaan (dokumen ini)

- Inventaris build, lint, test, dependency, route, asset, table, security, SEO, dan deployment.
- Tidak ada penghapusan source atau database.

### Tahap 2 — hardening fondasi produksi

- Perbaiki production environment dan same-origin API.
- Amankan cookie/auth, hapus endpoint development, pasang security middleware, health/readiness, graceful shutdown, log, dan fail-fast startup.
- Buat backend production build/start serta migration runner dengan history table.
- Upgrade dependency rentan secara terkendali.

### Tahap 3 — kunci scope v1 dan bersihkan legacy template

- Scope route public dan admin sudah dikunci; route demo admin sudah dilepas dari graph production.
- Fixture notifikasi/wallet, preview theme-option, source notifikasi demo, dan 36 fixture lain tanpa referensi bundle sudah dibersihkan; delapan fixture yang masih direferensikan tetap dipertahankan.
- Lanjutkan pembersihan aset, package, state, dan source tidak terpakai per kelompok dengan build/smoke setelah setiap kelompok.
- Buat migration drop hanya untuk tabel yang terbukti yatim.

### Tahap 4 — SEO teknis dan observability dasar

- Dynamic sitemap, robots, canonical/hreflang, structured data produk/kategori/artikel/CMS, dan status SSR 404 sudah diterapkan dan lulus smoke lokal.
- Tool backup database/media, checksum, verifikasi arsip, retensi, dan restore bertarget sudah diterapkan; restore drill pada salinan VPS masih wajib.
- Cache, log rotation, uptime monitor eksternal, dan alerting masih perlu diselesaikan serta diuji di staging.

### Tahap 5 — analytics dan dashboard MATEX

- First-party event ingestion, penyimpanan aman, deduplikasi, dan endpoint ringkasan sudah diterapkan; perlu smoke ulang melalui domain staging.
- Dashboard demo sudah diganti dengan ringkasan MATEX dan filter 7/30/90 hari; perlu smoke ulang dengan akun staging.
- Halaman Analitik Publik untuk tren, funnel, lokasi, sumber, dan halaman populer sudah ditambahkan; perlu smoke ulang dengan akun staging.
- Integrasikan GA4 realtime/historical.

### Tahap 6 — Search Console, performance, dan Bing

- Search Analytics dan PageSpeed on-demand sudah diterapkan dengan server credential serta state aman saat belum dikonfigurasi.
- Hubungkan credential nyata di staging, lalu tambahkan scheduled cache/sync, retry/quota handling, sitemap, URL Inspection, dan CrUX setelah pola penggunaan terbukti.
- Bing/IndexNow tetap opsional setelah integrasi Google stabil.

### Tahap 7 — release candidate dan CloudPanel

- Konfigurasi PM2 tiga proses dan verifikasi health loopback sudah tersedia; tetap uji startup setelah reboot dan rollback release pada VPS.
- Smoke pra-rilis read-only lintas API, public, dan admin sudah tersedia; tetap jalankan melalui hostname staging/produksi setelah Nginx dan TLS aktif.
- Suite browser Playwright sudah dipisahkan ke `ops/e2e` agar dependency pengujian tidak mengubah lockfile runtime. Hasil lokal terakhir 24 lulus dan 1 dilewati karena kredensial staging tidak tersedia. Pengujian ini juga menemukan lalu memverifikasi perbaikan metadata canonical yang sempat hilang setelah hydration pada beranda dan halaman CMS; alur login admin aktif hanya bila kredensial diberikan melalui environment.
- Staging rehearsal, data migration, backup restore, build bersih, smoke/E2E, performance/accessibility/security checks.
- Buat Node.js sites, vhost proxy, database/user, environment secret, DNS, TLS, redirect, firewall, dan monitoring.

## Gate siap produksi v1

Release hanya boleh dilanjutkan bila seluruh kondisi berikut terpenuhi:

- Semua build, typecheck, lint error, contract test, smoke test, dan alur v1 lulus.
- Tidak ada critical/high advisory produksi yang belum dinilai dan diterima secara eksplisit.
- Tidak ada localhost, development endpoint, secret, atau data demo pada artefak production.
- Cookie dan proxy HTTPS benar; login/logout/expiry diuji melalui domain staging.
- Route publik hanya berisi scope v1 yang diputuskan.
- Migration dapat dijalankan sekali, dicatat, diverifikasi, dan dipulihkan dari backup.
- Sitemap, robots, canonical, locale, 404/status, dan structured data tervalidasi.
- Upload/media, email kontak, audit log, health check, log rotation, backup, dan restore diuji.
- Dashboard memakai data MATEX nyata dan selalu menampilkan waktu pembaruan/sumber data.
- DNS/TLS/PM2/Nginx/CloudPanel diuji dengan rollback yang tertulis.

## Referensi resmi

- [Angular deployment](https://angular.dev/tools/cli/deployment)
- [CloudPanel Node.js deployment dengan PM2](https://www.cloudpanel.io/docs/v2/nodejs/deployment/pm2/)
- [CloudPanel Node.js settings dan app port](https://www.cloudpanel.io/docs/v2/frontend-area/settings/)
- [CloudPanel TLS/Let's Encrypt](https://www.cloudpanel.io/docs/v2/frontend-area/tls/)
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Google Search Console API](https://developers.google.com/webmaster-tools/v1/api_reference_index)
- [Google Search Console authorization](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing)
- [Google Search Console data availability](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data)
- [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)
- [Chrome UX Report API](https://developer.chrome.com/docs/crux/api)
- [Bing Webmaster API](https://learn.microsoft.com/en-us/bingwebmaster/)

