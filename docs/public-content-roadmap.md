# MATEX public content roadmap

Dokumen ini menetapkan batas antara desain Kartify, data MATEX, dan fitur commerce yang belum aktif. Nama `gadget-store` hanya penanda tema internal dan tidak boleh muncul sebagai label bisnis di UI publik atau Admin.

## Prinsip yang dipakai

- Kartify tetap menjadi sumber struktur visual, responsivitas, grid, spacing, dan komponen halaman publik.
- Backend dan database menjadi sumber data publik. File JSON Kartify hanya contoh bentuk tampilan selama integrasi belum selesai.
- Admin memakai pola form, tabel, tab, media picker, dan permission yang sudah ada pada template Admin.
- Konten Indonesia (`id-ID`) dan Inggris (`en-US`) disimpan terpisah. Data operasional yang tidak perlu diterjemahkan tetap berada di tabel induk.
- Semua data publik dibatasi oleh `id_master_comp`. Public API mengambil company dari konfigurasi server, bukan dari input browser.
- Commerce internal belum diaktifkan pada v1. Struktur katalog tetap menyediakan sambungan yang bersih untuk harga, stok, shipping, order, dan manufacturing pada tahap berikutnya.

## Pemetaan halaman dan template

| Halaman | Komponen Kartify yang dipertahankan | Sumber data MATEX |
| --- | --- | --- |
| Home | `components/home/gadget` dan widget yang dipakai tema | `cms_page` template `home`, attachment roles sesuai slot template |
| Tentang Kami | `components/page/about-us` | `cms_page` template `about`, attachment roles untuk hero, nilai/capability, team/testimonial bila dipakai |
| Kontak | `components/page/contact-us` | `cms_page` untuk judul/pengantar/SEO, `office` untuk alamat/map/jam, contact channel untuk WA/email/telepon, inquiry untuk form |
| FAQ | `components/page/faq` | `cms_page` untuk pengantar/SEO, tabel FAQ terstruktur untuk accordion |
| Terms/Privacy/policy | `components/page/page` | `cms_page` standard; tidak membutuhkan tabel khusus |
| Artikel | `components/blog` dan `components/blog/blog-details` | tabel article, category, tag, translation, media |
| Kategori produk | `components/shop/category` dan collection grid | tabel product category dan translation |
| Produk | `components/shop/product` dan product box | product, variant, specification, media, price, sales channel |

## Kepemilikan data

### Tetap memakai tabel yang ada

- `cms_page*`: halaman editorial, SEO, OG, schema JSON, translation, dan attachment halaman.
- `attachment`: pustaka media tunggal untuk halaman, artikel, dan produk.
- `office*`: lokasi publik, alamat, koordinat, Google Maps URL, jam operasional, dan foto lokasi. Gudang fisik dapat direferensikan oleh modul inventory nanti; alamat yang sama tidak disalin ke tabel kontak.
- `web_navigation*`: menu header/footer yang mengarah ke halaman, artikel, kategori, atau path internal.

### Fondasi tahap 1

Migration `20260923_003_create_public_contact_and_faq.sql` menambahkan:

- contact channel per company untuk WhatsApp, email, phone, dan social link tanpa hardcode;
- label channel per bahasa;
- topik form kontak per bahasa;
- contact inquiry beserta status penanganannya;
- kategori FAQ dan FAQ per bahasa.

Nomor WhatsApp `62 858-1418-0370` nantinya disimpan sebagai nilai E.164 `+6285814180370` melalui Admin. Migration tidak menanam nomor tersebut agar konfigurasi lingkungan dan data bisnis tetap terpisah dari source code.

### Tahap 2: artikel

Tabel yang akan dibuat setelah fondasi kontak selesai:

- `article`, `article_i18n`, `article_attachment`;
- `article_category`, `article_category_i18n`, `article_category_map`;
- `article_tag`, `article_tag_i18n`, `article_tag_map`.

Translation artikel memuat slug, title, excerpt, body, meta title/description, canonical, OG, dan schema JSON. Tabel induk memuat author, status, featured/sticky, waktu publish/unpublish, dan timestamps. Struktur ini langsung melayani list, detail, recent posts, category, tag, sitemap, serta blok artikel di Home.

### Tahap 3: katalog

Katalog dipisah menjadi domain berikut agar form Admin tetap mudah dibaca:

- identitas: `product`, `product_i18n`, `product_category*`, category map;
- pilihan barang: `product_variant`, SKU/barcode, option/attribute;
- presentasi: product media, localized specification, SEO/OG/schema;
- harga: `price_list` dan `product_price` untuk harga publik, end-user, marketplace, wholesale, special, mata uang, minimum quantity, dan masa berlaku;
- kanal: `sales_channel` dan `product_sales_channel` untuk URL listing Shopee, Tokopedia, TikTok Shop, serta external listing ID dan status sinkronisasi;
- fulfillment: package weight/dimensions dan shipping class;
- inventory: warehouse, stock balance, reservation, dan movement;
- manufacturing: hubungan produk/variant ke struktur produksi dibuat sebagai modul terpisah saat proses produksi MATEX sudah dipetakan, bukan kolom bebas di tabel product.

Integrasi API marketplace diputuskan per platform setelah biaya, akses partner, batas penggunaan, dan manfaat sinkronisasinya diverifikasi. Tautan marketplace tetap dapat dipakai tanpa menunggu API.

## Urutan implementasi

1. Review dan jalankan migration fondasi pada database development.
2. Buat Admin Pengaturan Kontak dan FAQ memakai form/table template yang sudah ada.
3. Sambungkan Contact dan FAQ publik ke API serta tambahkan map dan floating WhatsApp dari konfigurasi.
4. Adaptasi About dan legal pages ke template Kartify memakai `cms_page`.
5. Bangun artikel end-to-end, kemudian katalog end-to-end.
6. Setelah data pengganti sudah aktif dan diuji responsive/SSR, bersihkan header/footer dari fitur commerce demo yang tidak dipakai.

## Folder `backend/tests`

Folder ini berisi contract/regression test dengan Node test runner. File tersebut tidak dimuat oleh `src/app.ts`, tidak menjadi endpoint, dan tidak menjadi sumber data aplikasi. Test menjaga batas tenant, published-only, sanitasi media, serta kontrak navigation/CMS. Karena fungsinya mendeteksi kerusakan sebelum deploy, folder tetap dipertahankan dan jumlah test ditambah hanya untuk kontrak yang berisiko.
