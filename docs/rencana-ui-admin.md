# Rencana Perapian UI/UX Admin

Turunan dari dokumen pemilik "PERAPIHAN UI-UX INTERNAL MATEX V1, TEMUAN 20 OKTOBER 2026" (PDF di luar repo, 11 halaman) dan dua keputusan pemilik di hari yang sama. Dokumen ini menjadi daftar kerja Fase 5D (aturan data) dan Fase 6D (UI/UX admin) di `peta-jalan.md`. Status tiap butir diperbarui di sini.

_Dibuat: 20 Oktober 2026._

## Prinsip

1. **Global dulu, per halaman belakangan.** Gaya ditulis sekali di style global (turunan template Kartify di `frontend/admin/public/assets/scss` dan `src/styles.scss`). SCSS di folder modul hanya untuk hal yang memang khas halaman itu. Kalau Kartify sudah punya gayanya, pakai atau ubah; kalau belum, tambahkan di global.
2. **Satu komponen untuk satu pola.** Tabel, kotak bantuan, tombol perbarui dengan jeda, dan tombol kembali masing-masing satu komponen bersama, dipakai semua halaman.
3. **Desain PDF adalah arah, bukan ukuran pasti.** Warna, ukuran, dan bentuk mengikuti token yang sudah ada di template.
4. **Backend dulu bila data belum tersedia.** Butir yang butuh data baru (jumlah produk per kategori, total tanpa filter, jumlah pemakaian media) dimulai dari API dan test kontraknya.
5. **Mengikuti alur kerja yang sudah ada.** Perubahan backend memakai test kontrak dan rekaman. Perubahan frontend memakai test browser untuk halaman yang disentuh.

## Fase 5D: aturan data (backend, sebelum UI)

| ID | Butir | Rencana | Status |
| --- | --- | --- | --- |
| D-1 | Kategori yang punya produk tidak boleh dinonaktifkan atau dihapus (keputusan pemilik) | Kategori yang masih dipakai produk (produk yang belum dihapus) ditolak saat diubah ke status selain `published` atau saat dihapus: 409 dengan jumlah produknya. Hapus juga melepas media kategori, supaya gambarnya bisa dihapus dari Media. Foreign key `RESTRICT` sudah ada, tapi tidak pernah terpicu karena hapus kategori hanya soft delete | Selesai 20 Okt. Berlaku untuk perubahan dari published; kategori draft tetap boleh diisi produk (untuk menyiapkan kategori sebelum terbit) |
| D-2 | Jumlah produk per kategori | List kategori admin membawa `product_count` (untuk tampilan di halaman kategori dan filter produk) | Selesai 20 Okt |
| D-3 | Navigasi "primary" tidak boleh dihapus (keputusan pemilik) | Navigasi `primary` ditolak saat dihapus, dinonaktifkan, atau diganti kuncinya: 409. Alur rapinya ada di U-9 | Selesai 20 Okt (tombol di admin dirapikan di U-9) |
| D-4 | Format list seragam (5D lama) | Satu bentuk pagination untuk semua list: data, `total` (sesuai filter), `total_all` (tanpa filter, untuk teks "Menampilkan x dari y"), `page`, `limit`. Dikerjakan bersama tabel baru (U-3), modul per modul | Sebagian 20 Okt: semua list admin yang berhalaman menjawab `total_all` (field baru, tidak ada yang dihapus). Penyeragaman bentuk penuh bersama U-3 |
| D-5 | Jumlah pemakaian media | List media membawa jumlah pemakaian per tempat (beranda, produk, artikel, dan seterusnya), dari daftar `REFERENCES` yang sudah ada | Selesai 20 Okt: `usage` (per tempat) dan `usage_total` di tiap item |
| D-6 | Filter produk per kategori | List produk admin menerima `category` | Selesai 20 Okt: `?category=<id>`, cocok persis |

## Fase 6D: UI/UX admin

### Global (dikerjakan pertama, dipakai semua halaman)

| ID | Butir | Rencana | Status |
| --- | --- | --- | --- |
| U-1 | Huruf admin lebih kecil (permintaan khusus pemilik) | Rencana awal 13px hanya di area isi; diubah pemilik 25 Okt: seluruh admin (header, sidebar, isi, footer) turun sekitar 0,86 dengan rasio tetap | Selesai 25 Okt: satu skala huruf di `src/styles.scss` (token `--admin-text` 12px, `--admin-text-sm` 11px, `--admin-control` 13px, `--admin-subheading` 12,5px, `--admin-heading` 14px, `--admin-title` 18px, `--admin-control-height` 40px); variabel template (body, paragraf, tombol, input) ikut; ukuran di SCSS modul diskalakan ×0,86 (minimal 10px), tinggi kontrol 46→40px. Pendekatan `zoom` dicoba dan ditinggalkan (header, sidebar, dan backdrop modal yang memakai `100vw`/`100vh` jadi terpotong). Bukti: ukuran terukur per area di 5 halaman, screenshot sebelum/sesudah, `npm run test:write` 139 lolos |
| U-2 | Warna input dan select seragam | Satu set status untuk semua kontrol form: normal (isi putih), fokus (garis warna tema, bawaan Kartify), readonly/disabled (abu), error | Selesai 25 Okt: survei warna tiap kontrol di 10 halaman (terang dan gelap) menunjukkan input, select, select2, readonly, dan disabled sudah seragam; yang menyimpang dirapikan: kotak awalan/akhiran (`input-group-text`) jadi satu warna netral (tadinya krem, dan putih di form produk), kotak cari di dropdown select2 disamakan dengan input, editor teks kaya ikut warna input (di mode gelap tadinya putih dengan teks hitam; ikon toolbar kini terbaca) lewat variabel `--ngx-editor-*`. Suite penuh 139 lolos |
| U-3 | Tabel versi baru | Di komponen `app-table` bersama: (a) baris alat di samping tombol tambah: muat ulang dengan query yang sama, muat ulang dari awal (reset), impor dan unduh (tombol nonaktif dulu), ikon dengan tooltip, jeda 3 detik setelah dipakai; (b) teks "Menampilkan x dari y data, t detik"; (c) kotak cari dan jumlah per halaman yang ringkas tanpa label; (d) judul kolom paling banyak 2 baris, tombol urut berupa tombol kecil di header, bukan klik judul; (e) kolom aksi tanpa label, ikon roda gigi berisi pengaturan tabel: teks penuh, sembunyikan tombol urut, warna baris selang-seling (tersimpan per pengguna di browser); (f) aksi baris selalu menu titik tiga, tidak ada aksi dengan klik baris; (g) isi sel paling banyak 2 baris dengan "..." kecuali teks penuh aktif | Belum |
| U-4 | Kotak bantuan "?" | Komponen ikon "?" dengan kotak info singkat: muncul saat hover (hilang saat kursor menjauh) atau klik (hilang saat klik di luar), tidak menutupi isi, responsif; tautan "Selengkapnya" membuka drawer kanan | Belum |
| U-5 | Drawer bantuan | Drawer kanan berisi panduan admin per halaman dengan penanda (#), melompat ke bagian yang diklik. Isinya diambil dari panduan admin yang sudah ada (`docs/PANDUAN PENGGUNAAN ... 1.0.10`), disimpan sebagai file teks di frontend supaya mudah diperbarui | Belum |
| U-6 | Tombol perbarui dengan jeda | Satu komponen: indikator memuat saat ditekan, lalu hitung mundur di dalam tombol (nonaktif) selama jeda. Dasbor 2 menit, Analitik Publik dan SEO 5 menit (SEO memanggil Google, kuotanya terbatas) | Belum |
| U-7 | Tombol kembali di form | Satu komponen tombol "Kembali" di kepala form, menuju list asalnya (dengan query terakhir) | Belum |
| U-15 | Pratinjau gambar (tambahan pemilik 20 Okt) | Satu komponen lightbox: setiap gambar (kotak media, pustaka Media, gambar di tabel) saat di-hover menampilkan ikon mata; klik membuka gambar penuh di layar. Gambar dari kumpulan (galeri, Media) bisa digeser sebelum/berikutnya (carousel); gambar tunggal (misalnya foto profil di tabel akun) tampil sendiri tanpa navigasi. Tutup dengan Esc, klik di luar, atau tombol tutup; bisa dengan keyboard | Belum |
| U-16 | Profil saya (temuan FE-013) | Halaman "My account" diganti "Profil saya": nama, foto, dan kata sandi tersimpan lewat API; form detail toko sisa Kartify dibuang. Rancangan dikonfirmasi ke pemilik dulu | Belum |

### Per halaman

| ID | Halaman | Butir | Status |
| --- | --- | --- | --- |
| U-8 | Dasbor, Analitik Publik, SEO | Ikon "?" di kartu dan bagian yang perlu penjelasan; tombol perbarui berjeda (U-6) | Belum |
| U-9 | Navigasi Header Website | Navigasi `primary` diperlakukan sebagai navigasi bawaan: tidak ada tombol hapus atau nonaktif, kuncinya terkunci, dan menu sidebar langsung membuka pengelola item `primary` (navigasi lain tetap tersedia dari sana). Rincian alur dikonfirmasi ke pemilik sebelum dikerjakan | Belum |
| U-10 | Akun Admin dan form serupa | Bug input telepon: klik kotak nomor malah membuka pilihan kode negara (lapisan select menutupi input) | Belum |
| U-11 | Halaman website (Syarat, Karir, dan lainnya) | Tombol "Simpan Perubahan" di menu kiri ikut tergulung saat isi di kanan digulung; buat menunya tetap di tempat (sticky) dengan benar | Belum |
| U-12 | Kategori Produk | Tata letak kategori disamakan dengan halaman lain; tab form (Umum, Konten & Bahasa, SEO, Media) pindah ke atas supaya form tidak sempit; jumlah produk di tiap kategori (D-2); cek dan perbaiki bug di halaman ini satu per satu | Belum |
| U-13 | Produk | Panel kategori sebagai filter list (Semua dan tiap kategori, dengan pencarian kategori) (D-6) | Belum |
| U-14 | Media | Penanda "Dipakai: n" di tiap kartu, dengan rincian per tempat saat diarahkan (D-5) | Belum |

### Website publik

| ID | Butir | Rencana | Status |
| --- | --- | --- | --- |
| P-1 | Penanda market MATEX di header (akun, favorit, keranjang) | Keputusan pemilik 21 Okt: ketiganya tetap tampil sebagai penanda ke publik bahwa MATEX akan punya market internal. UI-nya dirapikan supaya jelas "segera hadir" dan seragam (sekarang: keranjang membuka panel "pratinjau, versi 2", favorit tersimpan di perangkat, akun membuka halaman "Fitur ini sedang disiapkan"). Rancangan dikonfirmasi ke pemilik sebelum dikerjakan | Belum |
| P-2 | Bagian tags di beranda (rencana pemilik) | Bagian tetap ada; sumber datanya dibuat di backend dan admin (sekarang kosong, sebelumnya tag demo). Toggle "tags" di admin halaman Beranda baru berguna setelah itu | Belum |

### Catatan

- Tombol impor dan unduh di U-3 sengaja nonaktif sampai fiturnya dibuat (sesuai permintaan pemilik). Fiturnya sendiri belum dijadwalkan.
- Bila di tengah pengerjaan ada butir yang ternyata tidak efisien, butir itu dicatat di sini dengan alasannya, lalu ditinggalkan.
- Temuan baru selama pengerjaan ditambahkan ke tabel di atas dengan ID berikutnya.
