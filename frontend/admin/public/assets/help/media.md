# Halaman Media

> **Untuk apa:** mengunggah dan mengelola gambar yang dipakai di website, kantor, artikel, dan profil.
> **Izin yang dibutuhkan:** attachment.view (wajib), attachment.create, attachment.delete.
> **Perlu diperhatikan:** gambar yang sedang dipakai tidak dapat dihapus, kecuali pemakaian pada produk/kategori yang belum diperiksa sistem — cek manual.

## Gambaran Umum

Halaman **Media** (**Pustaka Media**) digunakan untuk mengunggah dan mengelola gambar yang dipakai pada konten website, seperti gambar banner, artikel, kategori, produk, dan kantor. Gambar yang diunggah dapat dipilih kembali pada berbagai formulir tanpa perlu diunggah ulang.

URL: https://internal.matexindo.com/media

## Menampilkan dan Mencari Media

- **Cari file...:** mencari berdasarkan nama berkas.
- **Urutan:** pilihan **Terbaru**, **Terlama**, **Ukuran Terkecil**, atau **Ukuran Terbesar**.
- **Kisi gambar:** setiap kartu menampilkan miniatur, nama berkas, dan dimensi gambar. Halaman memuat 20 gambar per halaman.

Selain gambar unggahan Pustaka Media, kisi juga menampilkan berkas dari galeri produk, termasuk video (MP4, WebM, OGG), dan berkas lama yang namanya masih berakhiran .jpg, .jpeg, atau .png.

Pengguna yang bukan pemilik akses penuh hanya melihat media yang dimiliki kantornya.

## Mengunggah Media Baru

1. Klik tombol **Tambah Media**.
2. Pada jendela **Pilih Media**, buka tab **Unggah Baru**.
3. Letakkan berkas pada area **Letakkan file di sini** atau pilih berkas dari komputer.
4. Tunggu hingga proses selesai. Media yang berhasil diunggah tampil pada kisi.

| Ketentuan | Nilai |
| --- | --- |
| Format berkas | JPEG, PNG, dan WebP |
| Jumlah berkas per unggah | Maksimal 5 berkas |
| Ukuran per berkas | Maksimal 12 MB |
| Pemrosesan otomatis | Gambar diperkecil hingga maksimal 1920 × 1920 piksel dan disimpan dalam format WebP |

Galeri produk menggunakan koleksi tersendiri yang juga menerima video (MP4, WebM, OGG) dengan batas ukuran lebih besar. Pengaturan tersebut berlaku pada formulir produk.

## Menghapus Media

Klik ikon tempat sampah pada kartu untuk menghapus satu berkas. Untuk menghapus beberapa berkas, centang kartu yang dimaksud lalu gunakan ikon hapus pada bagian atas halaman (**Dipilih (n)**). Tindakan ini hanya tersedia bagi pengguna yang memiliki izin hapus.

- Media yang sedang digunakan pada foto profil admin, kantor, halaman website, atau artikel tidak dapat dihapus, dan sistem menampilkan pesan bahwa media sedang digunakan.
- Pemeriksaan penggunaan **belum mencakup** gambar pada produk dan kategori produk. Pastikan gambar tidak sedang dipakai pada produk atau kategori sebelum dihapus agar tampilan katalog tidak terganggu.

## Memilih Media dari Formulir Lain

Pada formulir yang membutuhkan gambar, tombol pilih gambar membuka jendela **Pilih Media** dengan tab **Pilih File** (memilih dari pustaka) dan **Unggah Baru** (bagi pengguna yang berwenang). Gambar yang sudah dipakai pada slot lain diberi tanda **Sudah digunakan pada slot lain**. Setelah memilih, klik **Pilih Media**.

Catatan**:** pada formulir artikel, unggahan baru dari jendela pemilih dapat gagal. Unggah gambar melalui menu **Media** terlebih dahulu, lalu pilih pada formulir artikel.

## Praktik Pengelolaan Media yang Disarankan

- Gunakan nama berkas yang deskriptif sebelum mengunggah.
- Siapkan gambar sesuai ukuran rekomendasi slot yang akan digunakan.
- Hindari menghapus media yang kemungkinan masih digunakan pada konten.
- Pastikan Anda memiliki hak penggunaan atas gambar yang diunggah.

**Kendala yang diketahui (diperbaiki pada versi 1.1):** Pustaka Media masih memuat beberapa berkas ganda, misalnya banner-home-samping-atas-latex-mattress.webp. Jangan menghapusnya sendiri, karena pemeriksaan pemakaian belum mencakup produk dan kategori produk; pembersihan akan dilakukan developer.
