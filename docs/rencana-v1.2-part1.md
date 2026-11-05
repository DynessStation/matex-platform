# Rencana MATEX V1.2 Part 1 (versi 1.2.11A)

Sumber: dokumen pemilik `MATEX-V1211A-PART1.pdf` (9 halaman, 6 November 2026), catatan pemilik di chat, dan pengecekan kode. Pemilik mengizinkan penyesuaian di luar PDF, jadi butir yang bertanda **(tambahan)** adalah usulan di luar PDF.

Status: **disetujui pemilik 6 November 2026, sedang dikerjakan.** Termasuk default: follower manual opsional, cek ejaan per artikel, Email lengkap, commit lokal per tahap.

## Prinsip

- Pola yang dipakai berulang dibuat sekali sebagai komponen bersama, lalu dipasang per halaman. SCSS tetap global dulu.
- Gaya compact: tabel padat, edit di baris, label seminimal mungkin.
- Spec dulu, baru ubah. Setiap tahap ditutup dengan test yang lolos dan commit lokal. Push dan deploy tetap izin per kali.
- Data lama tidak dihapus. Kolom kunci internal tetap ada di database, hanya pengisiannya yang otomatis.

## Tahap 0: Komponen bersama

**Selesai 6 November (lokal).** Contohnya di `/ui-kit` (hanya build non-production), test `form-kit.spec.ts` dan `slug-redirect-api.spec.ts`. Komponen belum terpasang di halaman: dipasang mulai Tahap 1. G-2 baru punya aturan per form saat formnya dikerjakan.

| ID | Isi | Dipakai di |
| --- | --- | --- |
| G-1 | Kerangka form: judul data tampil di atas tab pada tab mana pun, `(<!> Tanpa Judul)` kalau kosong, tooltip kalau panjang; tombol simpan di bawah daftar tab beserta pesan "Periksa kembali" | Artikel, Produk, Kategori (menyesuaikan tab atas) |
| G-2 | Penanda status per tab: hijau lengkap, oranye perlu dilihat, merah wajib diperbaiki. Aturannya di satu file per form | Artikel, Produk, Kategori; berikutnya Kantor, Akun Admin, Halaman Website |
| G-3 | Input judul + slug: slug dibuat dari judul dan readonly, tombol ikon saja untuk membuka mode custom, dengan validasi unik | Artikel, Kategori, Produk |
| G-4 | Tabel edit di baris: kolom nomor jadi tombol hapus saat edit, ikon pensil jadi ceklis simpan, baris naik/turun, baris bisa dilipat | Kontak, Spesifikasi, Harga, Kanal marketplace |
| G-5 | Panel insight 3 kolom: dibuka lewat tombol ikon grafik, pilihan 1H/7H/1B per kolom, garis oranye di kiri, status buka/tutup diingat | Artikel, Kontak, Kategori, Produk |
| G-6 | Tampilan "Fitur masih dalam pengembangan" yang bisa dipakai ulang | Tab Dasbor |
| G-7 **(tambahan)** | Pengalihan slug lama: slug yang diubah setelah terbit dicatat di tabel baru, website menjawab 301 ke alamat baru. Sekarang belum ada, jadi fitur slug custom akan membuat tautan lama 404 | Artikel, Kategori, Produk |
| G-8 **(tambahan)** | Canonical otomatis: kolom dikosongkan berarti alamat halaman itu sendiri. Di website perilaku ini sudah ada (`public-seo.service.ts`, `canonicalUrl`); isian manual dijadikan mode custom seperti slug | Artikel, Kategori, Produk |

Kunci internal otomatis: server membuat dari judul atau nama saat data dibuat, menambah akhiran kalau bentrok, dan menolak bentrok persis. Kalau judulnya mirip data lain, form memberi peringatan tanpa memblokir. Kunci tampil kecil dan readonly di bawah slug.

## Tahap 1: Dasbor dan Hak Akses

**Selesai 6 November (lokal).** Migration 028 (tabel grup). Test `admin-permission-page.spec.ts` dan `admin-permission-group-api.spec.ts`. Store NGXS hak akses dibuang: halaman memakai service langsung, dan datanya satu endpoint `/api/v1/admin-permission-group` (grup beserta hak aksesnya). Tambahan di luar PDF: grup kosong bisa dihapus; satu grup bisa punya beberapa awal kunci (Catalog punya `product.` dan `product_category.`), jadi awal kunci jadi pilihan kalau lebih dari satu. Kotak centang dan Pilih Semua dibaca sebagai hapus massal untuk baris yang boleh dihapus.

**Dasbor** (`/dashboard`)

- Tab Website, Inventaris (SOON), CRM & CLV (SOON), Finance (SOON). Tab aktif tersimpan di URL (`?tab=`).
- Isi Dasbor sekarang pindah ke tab Website, tanpa perubahan data.
- Ilustrasi "Fitur masih dalam pengembangan" dibuat sendiri (SVG). Gambar di PDF kelihatannya dari pencarian Google, jadi lisensinya tidak jelas.

**Hak Akses** (`/admin-permission`)

- Satu halaman dua panel: grup di kiri, hak akses grup terpilih di kanan. Form tambah dan edit menempel di panel.
- Halaman `/create` dan `/edit/:id` dibuang; alamat lamanya dialihkan ke halaman ini.
- Semua keadaan ada di URL: `?searchgroup=office&searchpermission=creat&group=...&edit=...`.
- Grup bisa ditambah dan diganti nama. Sekarang grup hanya kolom teks `permission_group`, jadi grup kosong tidak bisa ada. Perlu tabel grup baru (migration).
- Kunci hak akses: awalan dari grup, sisanya diketik, tetap tidak bisa diubah setelah dibuat. Contoh yang sudah ada tampil di bawah input.
- Hapus hanya untuk yang Tidak Aktif dan dipakai 0 profil, sesuai mockup.
- **Catatan:** hak akses baru dari layar ini tidak berpengaruh sampai kodenya memeriksa kunci tersebut. Ini dijelaskan di tip "?".

## Tahap 2: Artikel (`/blog`)

- Tab Umum dibuang. Penanda Unggulan dan Sematkan pindah ke Publikasi. Kunci internal otomatis.
- Pakai G-1, G-2, G-3, G-8.
- **Tag** (baru, tabel `article_tag` sudah ada sejak migration 004 tapi belum dipakai): multi-select dengan tambah tag baru langsung, jumlah artikel per tag terlihat di daftar, nama tag ID dan EN.
- **Tag yang berpengaruh ke SEO nyata:** tag `keywords` diabaikan Google, jadi yang dibangun adalah halaman arsip tag (`/artikel/tag/...`, `/en/articles/tag/...`) masuk sitemap, tautan internal dari artikel, dan `keywords` di JSON-LD. Arsip dengan artikel terlalu sedikit diberi `noindex` agar tidak dianggap halaman tipis. Sekarang API publik mengembalikan `tags: []`.
- **Author** (baru): default nama user, bisa diganti nama pena. Identitas asli tetap `id_created_by`. Dipakai juga di tampilan artikel dan JSON-LD.
- **Panel insight:**
  - 5 Artikel Teratas per view, dengan pintasan "Lihat tag teratas".
  - Grafik: publikasi baru, view, share, jangkauan.
  - Skor konsistensi, usulan rumus: persentase minggu dalam 8 minggu terakhir yang ada artikel terbit, dibanding periode sebelumnya.
  - Audit: jumlah per status, artikel tanpa tag, tanpa konten EN, tanpa gambar, meta terlalu panjang, masing-masing dengan tombol Perbaiki.

Yang disesuaikan dari PDF:

- "Artikel tanpa canonical" tidak ikut audit, karena canonical jadi otomatis.
- "Share" butuh event baru: daftar event analitik sekarang belum punya share, dan hitungannya mulai dari nol sejak dipasang.
- "Jangkauan" didefinisikan sebagai pengunjung unik halaman artikel.
- "Artikel mengandung typo": tidak dihitung otomatis karena butuh AI per artikel dan ada biaya OpenAI. Usulan: tombol "Cek ejaan" per artikel, memakai asisten konten yang sudah ada.

## Tahap 3: Pengaturan Kontak (`/public-contact`)

- **Sosial Media** (baru): Platform, Nama Akun, URL, Status, Publikasi, maksimal 3 per platform. Inaktif memaksa Hidden, dan hapus hanya untuk yang Inaktif. Dipakai di header, footer, kontak, dan `sameAs` SEO.
- **Kanal Kontak:** tabel compact dengan label ID/EN yang bisa dilipat, tautan otomatis dari nilai, Utama/Biasa, Displayed/Hidden, naik/turun. Nomor WhatsApp boleh tanpa `+`, server yang merapikan (validasi sekarang mewajibkan `+`).
- **Topik Pesan:** tabel compact dengan validasi email di baris. Alamat penerima tetap hanya di database, tidak masuk seed atau repo.
- Nama internal ketiganya otomatis.
- **Penyimpanan:** PDF menampilkan ceklis per baris dan tombol simpan global sekaligus. Usulan: ceklis langsung menyimpan baris itu, tombol global dibuang, supaya tidak ada perubahan yang hilang karena lupa menekan simpan.
- **Pelacakan klik (tambahan, wajib untuk panel):** sekarang klik keluar hanya menyimpan nama host (`public-analytics.service.ts`), jadi 3 akun Facebook atau 2 nomor WhatsApp tidak bisa dibedakan. Perlu menyimpan id kanal atau akun. Data lama tidak bisa dipisah, hitungan per akun mulai dari nol.
- **Panel insight:**
  - Sosial Media: klik per akun (kolom "Kunjungan" di mockup artinya klik dari website).
  - Kanal Kontak: klik per kanal.
  - Audit Funnel: pesan dibaca, dibalas, belum dibaca dari Mail API, dengan peringatan dan tautan "Buka email".
- **Follower dan jumlah konten:** API Meta dan TikTok butuh aplikasi dan review, jadi tidak realistis untuk Part 1. Usulan: isian manual opsional di baris yang dilipat, dengan tanggal terakhir diperbarui.

## Tahap 4: Kategori dan Produk

**Kategori** (`/category`): kunci otomatis, slug otomatis dan bisa custom, urutan input ditukar dengan Nama, penanda status di tab atas, panel insight. Isi panel usulan: view tertinggi per kategori; jumlah produk terbit dibanding total; audit kategori kosong, tanpa gambar, tanpa konten EN, tanpa SEO.

**Produk** (`/product`)

- Kunci otomatis, slug otomatis dan bisa custom, urutan ditukar dengan Nama, canonical otomatis.
- Nama produk di atas tab, tombol simpan di bawah tab, penanda status per tab.
- **Spesifikasi** jadi tabel compact di Konten & Bahasa, menggantikan isian sekarang (`specifications` per bahasa).
- **Harga** jadi dua tabel compact, IDR dan USD (judul "Rupiah (USD / $)" di PDF dibaca sebagai Dollar).
- **Kanal marketplace** dibuat compact.
- **Panel insight**, isi usulan: produk paling banyak dilihat; klik marketplace per kanal; audit status (terbit, arsip, draf), tanpa gambar, tanpa harga tampil, tanpa konten EN, tanpa kanal beli.

## Tahap 5: Menu Email

**Integrasi:** Hostinger Mail API resmi (`api.mail.hostinger.com`, SDK `hostinger-mail-api-sdk`) dipanggil dari backend saja.

Yang sudah dipastikan dari dokumentasi Hostinger: folder, daftar, cari, baca, lampiran, flag, pindah, hapus, kirim, balas, dan terusan. Token dibuat di Agentic Mail > Akses API, bisa dibatasi per mailbox, dan token API hPanel biasa tidak berlaku.

Yang belum pasti: fitur masih berlabel Beta di hPanel, batas rate dan batas kirim tidak disebut angkanya, plan yang didukung tidak dirinci, dan skema tanda tangan webhook belum jelas. Halaman npm tidak bisa dibuka, jadi versi SDK belum dicek. Karena itu pemanggilan dibungkus satu service `mail-provider`, supaya bisa diganti ke IMAP/SMTP kalau perlu.

**Tampilan:** Email di sidebar, tiga panel (folder, daftar, isi), cari, tandai dibaca, balas, tulis baru, lampiran.

**Keamanan (tambahan):**

- Token hanya di `.env` VPS, tidak pernah lewat chat atau repo.
- HTML email dirender di iframe sandbox, gambar eksternal diblokir sampai diizinkan.
- Izin baru `email.view`, `email.send`, dan audit log setiap pengiriman.
- Isi email tidak disalin ke database MATEX, sumber datanya tetap Hostinger.

**Bertahap:**

1. Baca dan cari.
2. Balas dan tulis.
3. Angka untuk panel Kontak.
4. Webhook untuk pembaruan langsung, setelah skemanya dites.

**Tindakan pemilik saat tahap ini mulai:** buat token dengan mailbox terpilih dan isi sendiri ke `.env` VPS. Cek juga mailbox pengirim form yang disebut di PDF sudah ada.

**Tambahan terkait:** pesan form kontak sudah tersimpan di `contact_inquiry` (ada status `new`, `in_progress`, `resolved`, `spam`, `closed`), tapi belum ada halamannya di admin. Dicatat untuk nanti, tidak masuk Part 1.

## Tahap 6: Rilis 1.2.11A

- Buang nama parameter list lama (`paginate`, `ord/srt`, `field/sort`, `sortBy`), sesuai catatan rilis lalu.
- Perbarui panduan bantuan, `APP_VERSION`, `changelog.ts`, dan peta jalan.
- Latihan migration pada salinan backup production, karena ada beberapa migration (pengalihan slug, tag dan author, sosial media, grup hak akses, event analitik).
- Deploy API, admin, dan website sekaligus atas izin pemilik. `96fef45` ikut terbawa kalau memang belum sampai production.

## Ancang-ancang: Part 2 Produk, HPP, dan internal (belum dikerjakan)

Catatan dari screenshot Excel produksi (`KATEGORI PRODUCT MATEX - 05 NOVEMBER 2026`):

- **Rantai harga terbaca dari sheet KATEGORI:** Net MIA = HPP / (1 - GPM 20%), Affiliate = Net / (1 - 5%), E-commerce = Affiliate / (1 - APL 20%). Contoh baris pertama: 880.550 → 1.100.688 → 1.158.618 → 1.448.273.
- **Harga di website sudah mengikuti rantai ini, setidaknya untuk satu produk:** Contour Pillow Gress HPP 158.188 menghasilkan 260.178, sama dengan harga Bantal Contour di admin. Produk lain belum dicocokkan semua. Bantal Flat Recon misalnya tidak cocok (Rp 195.175 di admin, rantai dari HPP 123.667 memberi sekitar 203.400), bisa jadi datanya beda versi.
- **Sheet DETAIL HITUNGAN adalah bill of material:** rebondid, gress atau topper, inner cover, outer cover, jasa jahit, kemasan, sampai HPP.
- **Forecast** per produk: Qty, Total HPP, Net MIA, November sampai Desember.
- Nomor urut 19 sampai 24 di sheet KATEGORI dobel (baris 24–29 dan 30–35), belum tentu berpengaruh.

Yang dijaga mulai sekarang supaya Part 2 mulus:

- Data biaya berada di tabel terpisah dengan izin sendiri, dan tidak pernah ikut query publik.
- Harga bahan berubah dari waktu ke waktu, jadi HPP perlu riwayat bertanggal, bukan satu angka.
- Tingkat harga (Net, Affiliate, E-commerce) dan persentasenya sebaiknya data, bukan rumus tertanam.
- SKU menjadi penghubung ke produk. Perlu pemetaan, karena nama di Excel dan nama di katalog berbeda.
- Tab Finance dan Inventaris di Dasbor sudah disiapkan sebagai rumahnya.

Untuk Part 2, file Excel aslinya lebih berguna daripada screenshot, karena sheet MOCO dan PRODUCT belum terlihat.
