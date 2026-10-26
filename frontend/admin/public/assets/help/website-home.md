# Halaman Beranda

> **Untuk apa:** mengelola isi halaman depan website (banner, bagian unggulan, teks, SEO) dalam dua bahasa.
> **Izin yang dibutuhkan:** website_page.update (juga untuk melihat menu ini).
> **Perlu diperhatikan:** lengkapi seluruh slot gambar sebelum menerbitkan; terbitkan hanya setelah kedua bahasa diperiksa.

## Gambaran Umum

Halaman **Beranda** digunakan untuk mengelola konten halaman utama website publik. Beranda merupakan salah satu **halaman tetap** website, yaitu halaman yang identitas, alamat, dan tampilan dasarnya diatur oleh sistem. Pengguna hanya mengelola isi yang tersedia, SEO, gambar, dan status publikasinya.

Halaman tetap lain yang menggunakan editor yang sama adalah **Tentang MATEX**, **Syarat dan Ketentuan**, dan **Karir**. Halaman **Kontak** dan **FAQ** juga memiliki pengaturan halaman, tetapi dibuka melalui halaman operasionalnya masing-masing.

URL: https://internal.matexindo.com/website-page/home

## Struktur Editor Halaman

Editor halaman terdiri atas tab vertikal di sisi kiri. Pengguna dapat berpindah antartab secara bebas atau menggunakan tombol **Lanjut ke …** dan **Kembali ke …** pada bagian bawah setiap tab. Tombol **Simpan Perubahan** selalu tersedia pada sisi kiri sehingga perubahan dapat disimpan tanpa membuka tab **Pratinjau**.

| Tab | Fungsi |
| --- | --- |
| Umum | Informasi halaman yang diatur sistem, hanya untuk dibaca: kode halaman, alamat tiap bahasa, dan status tayang saat ini. |
| Konten & Bahasa | Judul, ringkasan, dan isi khusus halaman untuk Bahasa Indonesia dan English. |
| SEO | Pengaturan tampilan halaman pada mesin pencari dan saat dibagikan. |
| Media | Pemilihan gambar halaman dari Media Library. Tab ini hanya tampil bagi pengguna yang memiliki akses Media. |
| Publikasi | Pengaturan status dan jadwal tayang halaman. |
| Pratinjau | Pemeriksaan tampilan dan ringkasan sebelum menyimpan. |

## Konten dan Bahasa

Setiap halaman memiliki dua versi bahasa, yaitu **Bahasa Indonesia** (bahasa utama) dan **English**. Pilih bahasa melalui tombol pada bagian atas tab, kemudian isi kolom berikut untuk masing-masing bahasa:

- **Judul Halaman** (wajib, maksimal 255 karakter).
- **Status Bahasa: Draf** atau **Dipublikasikan**.
- **Alamat halaman:** hanya dapat dibaca dan tidak dapat diubah pada halaman tetap. Teks bantuan di bawah kolom yang menyebut alamat dibuat otomatis dari judul tidak berlaku untuk halaman tetap.
- **Ringkasan:** keterangan singkat halaman. Pada Beranda, ringkasan menjadi cadangan deskripsi SEO apabila deskripsi SEO tidak diisi.

Tombol bantuan penulisan seperti **Isi ini otomatis** dan **Translate from Indonesian** tersedia pada beberapa kolom. Hasilnya berupa draf yang wajib diperiksa kembali oleh pengguna sebelum disimpan.

## Bagian yang Tampil di Beranda

Pada bagian **Bagian yang tampil di Beranda**, tersedia tujuh sakelar untuk setiap bahasa. Aktifkan bagian yang ingin ditampilkan; banner utama dikelola terpisah pada tab **Media**.

| Bagian | Keterangan | Kondisi awal |
| --- | --- | --- |
| Keunggulan lateks MATEX | Menampilkan keunggulan produk lateks beserta judul bagian dan daftar manfaat. | Aktif |
| Kategori produk | Menampilkan kategori produk dari katalog. | Aktif |
| Produk unggulan | Menampilkan produk pilihan dari katalog. | Aktif |
| Artikel terbaru | Menampilkan artikel yang sudah dipublikasikan. | Aktif |
| Tag populer | Pintasan berbentuk chip ke kategori produk atau pencarian katalog. | Tidak aktif |
| Langganan informasi | Disiapkan untuk pengembangan berikutnya (aktifkan setelah alur siap). | Tidak aktif |
| Banner promosi sebelum footer | Menampilkan banner promosi di atas bagian footer. | Tidak aktif |

### Keunggulan Lateks MATEX

Isi **Label kecil** (maksimal 80 karakter), **Judul bagian** (maksimal 180), dan **Deskripsi** (maksimal 700). Tambahkan daftar manfaat dengan **Judul manfaat** (maksimal 160) dan **Penjelasan manfaat** (maksimal 1.000). Pasangan judul dan penjelasan yang tidak lengkap tidak disimpan.

### Tag Populer

Daftar pintasan yang tampil sebagai chip di beranda, di desktop dan ponsel; paling banyak 12. Klik **Tambah tag**, lalu isi untuk tiap tag:

- **Teks Indonesia** dan **Teks English** (wajib, maksimal 60 karakter); teks tampil sesuai bahasa website.
- **Tujuan**: sebuah kategori produk (chip membuka halaman kategori itu) atau **Pencarian: teks tag** (chip membuka halaman pencarian dengan teks tag sebagai kata cari).

Urutan chip mengikuti urutan baris; ubah dengan tombol panah naik dan turun, dan hapus baris dengan tombol silang. Daftar tag sama untuk kedua bahasa, tetapi sakelar tampil tetap per bahasa. Tag dengan kategori yang dihapus atau belum Dipublikasikan tidak ditampilkan di website. Halaman tidak bisa disimpan selama ada tag yang teks atau tujuannya belum lengkap.

### Banner Promosi Sebelum Footer

Isi **Label promosi** (maksimal 80), **Judul promosi** (maksimal 180), **Deskripsi** (maksimal 700), **Teks tombol** (maksimal 80), dan **Tujuan tombol** (maksimal 500 karakter, berupa alamat halaman seperti /kontak atau tautan https://). Gambar promosi dipilih pada tab **Media**.

Catatan**:** bagian yang tidak diaktifkan tidak tampil pada website, walaupun isinya sudah diisi.

## Pengaturan SEO

Tab **SEO** mengatur bagaimana halaman dikenali oleh mesin pencari dan tampil ketika dibagikan. Pengaturan dilakukan per bahasa, dan bagian **Pratinjau hasil pencarian** membantu pengguna melihat gambaran tampilannya.

| Kolom | Maks. | Keterangan |
| --- | --- | --- |
| Judul SEO | 255 | Opsional. Apabila kosong, judul halaman digunakan. |
| Deskripsi SEO | 500 | Opsional. Apabila kosong, ringkasan digunakan sebagai cadangan. |
| Alamat utama untuk mesin pencari (canonical) | 500 | Opsional. Harus diawali http:// atau https://. |
| Meta Robots | 100 | Nilai awal index,follow. Gunakan noindex hanya bila halaman memang tidak ingin dimunculkan di mesin pencari. |
| Kata Kunci | 500 | Opsional, dipisahkan koma. |
| Judul saat dibagikan | 255 | Opsional. Judul pada tautan yang dibagikan ke media sosial. |
| Deskripsi saat dibagikan | 500 | Opsional. Deskripsi pada tautan yang dibagikan. |

Pengaturan lanjutan (Meta Robots, Kata Kunci, dan tampilan saat dibagikan) berada pada bagian **Pengaturan SEO Lanjutan**. Ubah hanya apabila memahami dampaknya terhadap pencarian.

## Pengelolaan Media Beranda

Tab **Media** digunakan untuk memilih gambar dari Media Library. Gambar harus berformat **JPEG**, **PNG**, atau **WebP**. Untuk setiap gambar dapat diisi **Keterangan** dan **Teks Alternatif** (maksimal 500 karakter) menurut bahasa, serta pilihan **Publik**.

Beranda memiliki **delapan slot tetap, ditambah satu slot gambar berbagi sosial yang bersifat opsional.** Setiap slot memiliki ukuran rekomendasi dan ukuran minimum. Gambar yang terlalu kecil atau rasionya tidak sesuai akan ditolak oleh sistem.

| Slot | Ukuran rekomendasi (px) | Ukuran minimum (px) |
| --- | --- | --- |
| Banner utama | 3528 × 1956 | 1299 × 720 |
| Banner samping atas | 1400 × 984 | 700 × 492 |
| Banner samping bawah | 1400 × 984 | 700 × 492 |
| Banner kotak 1 | 1172 × 984 | 586 × 492 |
| Banner kotak 2 | 1172 × 984 | 586 × 492 |
| Banner kotak 3 | 1172 × 984 | 586 × 492 |
| Banner kotak 4 | 1172 × 984 | 586 × 492 |
| Banner promosi sebelum footer | 1600 × 500 | 960 × 300 |
| Gambar berbagi sosial (opsional) | 1200 × 630 | — |

Rasio gambar harus sesuai dengan rasio rekomendasi slot, dengan toleransi sekitar 5 persen (20 persen untuk banner promosi). Sistem dapat menampilkan pesan seperti **Gambar terlalu kecil**, **Rasio gambar tidak sesuai slot**, atau **Format harus JPEG, PNG, atau WebP**. Gunakan gambar dengan ukuran rekomendasi agar tampil tajam pada layar besar.

Setiap banner dapat diberi **aksi saat diklik**:

| Pilihan aksi | Isi tujuan | Ketentuan |
| --- | --- | --- |
| Tanpa aksi | Dikosongkan | Banner tidak dapat diklik. |
| Halaman website | Alamat halaman, misalnya /kontak | Harus diawali /, tidak boleh memuat "..". |
| Produk | Bagian akhir alamat produk (slug) | Huruf kecil, angka, dan tanda hubung. |
| Kategori produk | Bagian akhir alamat kategori (slug) | Huruf kecil, angka, dan tanda hubung. |
| Tautan eksternal | Alamat lengkap | Harus berupa alamat HTTPS lengkap. |

Catatan**:** slot yang belum terisi boleh disimpan selama halaman masih berstatus Draf. Namun gambar yang sudah dipilih tetap diperiksa format, ukuran, dan rasionya saat disimpan. Pastikan seluruh slot, termasuk banner promosi, terisi sebelum halaman diterbitkan atau dijadwalkan; apabila sistem menolak publikasi dengan pesan bahwa gambar wajib belum lengkap, periksa kembali setiap slot.

## Pengaturan Publikasi

Tab **Publikasi** menampilkan **Status Saat Ini** halaman (**Draf**, **Terjadwal**, **Dipublikasikan**, atau **Kedaluwarsa**) beserta waktu mulai dan waktu berakhir apabila ada. Pilih salah satu tindakan berikut:

| Pilihan | Akibat |
| --- | --- |
| Jangan Ubah Status (bawaan) | Menyimpan perubahan konten tanpa mengubah status publikasi. |
| Simpan sebagai Draf | Halaman tidak ditampilkan kepada pengunjung. |
| Publikasikan Sekarang | Halaman tersedia segera setelah disimpan. Waktu berhenti dapat diisi opsional. |
| Jadwalkan Publikasi | Halaman tampil mulai tanggal dan waktu yang ditentukan. |

- **Mulai Publikasi** diisi tanggal dan waktu, dan harus berada di masa mendatang.
- **Berhenti Publikasi** (opsional) membuat halaman otomatis berhenti tampil setelah waktu tersebut, dan harus setelah waktu mulai. Gunakan **Kosongkan tanggal dan waktu** untuk membatalkan.
- Halaman baru dapat diterbitkan apabila versi **Bahasa Indonesia** (bahasa utama) berstatus **Dipublikasikan**. Versi English boleh tetap berstatus Draf dan akan tampil pada tahap selanjutnya.
- Status **Kedaluwarsa** menunjukkan bahwa waktu berhenti publikasi telah terlewati.

## Pratinjau dan Penyimpanan

Tab **Pratinjau** menampilkan gambaran halaman untuk bahasa terpilih dan ukuran layar **Sesuaikan**, **Desktop** (1200 px), **Tablet** (768 px), atau **Mobile** (390 px). Pratinjau bersifat internal dan tidak mengubah status publik. Bagian **Ringkasan Sebelum Menyimpan** merangkum identitas, bahasa, jumlah media, dan rencana publikasi.

Setelah semua isian diperiksa, klik **Simpan Perubahan**. Sistem menampilkan notifikasi hasil penyimpanan dan memuat ulang data halaman.

**Contoh simulasi (bukan data aktual MATEX)**

Banner utama: gambar 3528 × 1956 px, aksi **Kategori produk**, tujuan sarung-tangan-lateks

Judul SEO (ID): MATEX — Produk Berbahan Lateks | Status: Publikasikan Sekarang

## Praktik Pengelolaan Beranda yang Disarankan

- Siapkan seluruh gambar dengan ukuran rekomendasi sebelum membuka editor, lalu unggah terlebih dahulu ke Media Library.
- Isi **Teks Alternatif** pada setiap gambar agar mudah dipahami pembaca layar dan mesin pencari.
- Lengkapi Bahasa Indonesia dan English agar tampilan kedua bahasa konsisten.
- Gunakan **Pratinjau** pada ukuran Desktop dan Mobile sebelum menerbitkan.
- Periksa halaman website setelah publikasi untuk memastikan perubahan tampil sesuai harapan.
