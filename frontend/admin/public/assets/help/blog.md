# Halaman Artikel

> **Untuk apa:** menulis, mengedit, dan menerbitkan artikel blog di website.
> **Izin yang dibutuhkan:** article.view, .create, .update, .delete.
> **Perlu diperhatikan:** jadwal tayang belum diproses otomatis; artikel yang dihapus hanya diarsipkan; unggah gambar lewat menu Media dahulu.

## Gambaran Umum

Halaman **Artikel** digunakan untuk mengelola artikel edukatif dan informatif yang dipublikasikan pada website MATEX, misalnya pengetahuan mengenai lateks dan produk berbahan dasar lateks. Artikel mendukung upaya penguatan citra merek dan optimalisasi SEO.

Setiap artikel disusun dalam dua bahasa, yaitu Bahasa Indonesia dan English, serta dilengkapi pengaturan SEO, gambar, dan jadwal tayang.

URL: https://internal.matexindo.com/blog

## Menampilkan dan Mencari Data Artikel

Daftar artikel tampil dalam tabel dengan kolom **Gambar**, **Judul**, **Dibuat Pada**, dan **Status**. Gunakan kolom **Cari** untuk mencari berdasarkan kunci internal atau judul, serta pilihan **Tampilkan** untuk mengatur jumlah baris per halaman. Artikel yang diberi tanda **Sematkan** tampil lebih atas pada daftar, diikuti artikel terbaru.

Kolom **Status** menampilkan nilai apa adanya, yaitu:

- **draft:** artikel belum tampil kepada pengunjung.
- **published:** artikel sudah diterbitkan.
- **scheduled:** artikel dijadwalkan (lihat catatan pada bagian Pengaturan Publikasi).
- **archived:** artikel disembunyikan dari website.

Pada kolom **Aksi** tersedia **Edit**, **Delete**, dan **View**. **View** membuka artikel pada website publik di tab baru. Tersedia pula kotak centang untuk menghapus beberapa artikel sekaligus.

## Menambahkan Artikel Baru

Klik tombol **Tambah Artikel**. Formulir **Buat Artikel** terdiri atas lima tab. Gunakan tombol **Lanjut ke …** dan **Kembali ke …** untuk berpindah antartab, lalu klik **Simpan Artikel** pada akhir pengisian.

### Tab Umum

Isi **Kunci internal** (wajib, maksimal 120 karakter) dengan huruf kecil, angka, dan tanda hubung, misalnya manfaat-latex-alami. Kunci ini dipakai sistem untuk mengenali artikel dan tidak tampil sebagai judul. Kunci tidak boleh sama dengan artikel lain.

Pilihan **Unggulan** menonjolkan artikel pada blok artikel pilihan, sedangkan **Sematkan** memprioritaskan artikel pada urutan daftar.

### Tab Konten & Bahasa

Tersedia dua sub-tab, yaitu **Bahasa Indonesia (Utama)** dan **English**. Untuk setiap bahasa isi:

- **Slug URL** (wajib): bagian akhir alamat artikel, ditulis manual dengan huruf kecil, angka, dan tanda hubung. Sistem tidak membuatnya otomatis dari judul.
- **Judul** (wajib, maksimal 500 karakter).
- **Ringkasan** (opsional, maksimal 2.000 karakter) yang tampil pada kartu dan daftar artikel.
- **Isi artikel** (wajib) menggunakan editor teks. Gunakan Heading 2 untuk bagian utama, Heading 3 untuk subbagian, dan teks tautan yang menjelaskan tujuan tautan.
3. Tab SEO

Seluruh kolom bersifat opsional untuk setiap bahasa: **Judul SEO**, **Canonical URL**, **Deskripsi SEO**, **Judul saat dibagikan**, dan **Deskripsi saat dibagikan**. Apabila dikosongkan, judul dan ringkasan artikel digunakan.

### Tab Media

**Gambar utama** (wajib) ditampilkan pada kartu, daftar, dan bagian atas artikel. **Gambar berbagi sosial** (opsional) dipakai ketika tautan artikel dibagikan ke WhatsApp dan media sosial.

Gambar dipilih dari Media Library. Unggah gambar terlebih dahulu melalui menu **Media**, kemudian pilih melalui tab **Pilih File** pada formulir artikel.

### Tab Publikasi

Pilih salah satu status: **Simpan sebagai Draf**, **Publikasikan Sekarang**, **Jadwalkan Publikasi**, atau **Arsipkan**. Pada pilihan jadwal, isi **tanggal** dan **waktu** mulai tayang. **Berhenti tayang** bersifat opsional dan dapat dibatalkan dengan **Hapus jadwal**.

**Contoh simulasi (bukan data aktual MATEX)**

Kunci internal: mengenal-lateks-alam

Slug (ID): mengenal-lateks-alam | Slug (EN): getting-to-know-natural-latex

Judul (ID): Mengenal Lateks Alam dan Manfaatnya

Status: Publikasikan Sekarang

## Mengelola Artikel yang Sudah Ada

- **Edit:** membuka formulir **Edit Artikel** dengan tab yang sama. Simpan dengan **Perbarui Artikel**.
- **Delete:** memindahkan artikel ke tempat sampah sehingga tidak lagi tampil pada daftar dan website. Sistem meminta konfirmasi sebelum tindakan dilakukan.
- **View:** melihat tampilan artikel pada website publik.

## Ketentuan Penting dalam Pengelolaan Artikel

- Artikel hanya tampil pada website apabila berstatus **published**, versi bahasa yang dibuka tersedia, serta waktu tayang belum berakhir.
- Kedua bahasa wajib dilengkapi sebelum artikel disimpan. Isi artikel yang memuat kode skrip akan ditolak oleh sistem.
- Apabila kunci internal sudah dipakai artikel lain, sistem menampilkan pesan duplikat dan mengembalikan pengguna ke tab **Umum**.
- Setiap perubahan artikel tercatat pada **Log Aktivitas**.

Catatan**:** pada versi 1.0.10, status **scheduled** belum diproses otomatis menjadi **published** ketika waktu tayang tiba. Agar artikel tampil, gunakan pilihan **Publikasikan Sekarang** pada waktu yang diinginkan. Pengguna disarankan menguji pilihan **Jadwalkan Publikasi** terlebih dahulu dan memastikan hasilnya pada website sebelum mengandalkannya.

Informasi**:** Kategori Artikel dan Tag yang terdapat pada struktur sistem belum tersedia sebagai fitur pada versi 1.0.10 dan tidak digunakan pada formulir artikel.

## Praktik Pengelolaan Artikel yang Disarankan

- Gunakan judul yang jelas dan memuat kata kunci yang relevan dengan topik.
- Susun isi dengan heading yang berurutan agar mudah dibaca dan dipahami mesin pencari.
- Lengkapi deskripsi SEO dan gambar berbagi sosial untuk artikel penting.
- Periksa kembali fakta, istilah teknis, dan klaim produk sebelum mempublikasikan.
- Gunakan bantuan penulisan otomatis hanya sebagai draf awal dan tinjau hasilnya. Judul, nama, label, dan slug harus ditulis sendiri oleh pengguna.
