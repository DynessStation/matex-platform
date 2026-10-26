# Halaman Navigasi Header Website

> **Untuk apa:** mengatur teks dan urutan tautan menu pada bagian atas website publik.
> **Izin yang dibutuhkan:** web_navigation.view, .update, .publish, dll.
> **Perlu diperhatikan:** Header terdiri atas enam tautan tetap; perubahan tampil di website setelah disimpan.

## Gambaran Umum

Halaman **Navigasi Header Website** digunakan untuk mengatur menu yang tampil pada bagian atas (header) website publik https://matexindo.com. Header terdiri atas **enam bagian tetap**, yaitu Beranda, Tentang MATEX, Kategori, Produk, Artikel, dan Hubungi.

Pengguna dapat mengubah teks label, menampilkan atau menyembunyikan setiap bagian, serta mengatur urutannya. Tujuan tautan setiap bagian ditentukan otomatis oleh sistem agar tautan Bahasa Indonesia dan English tidak rusak, sehingga pengguna tidak perlu dan tidak dapat mengubah alamat tujuan.

URL: https://internal.matexindo.com/menu

## Status Header dan Cara Kerja Menu

Pada bagian atas halaman terdapat lencana status **Tampil** beserta keterangan bahwa menu header sedang tampil pada website publik. Header website selalu tampil dan tidak bisa dimatikan; yang bisa disembunyikan hanya tiap bagian menu lewat sakelar **Tampilkan di header**. Kotak informasi **Cara kerja menu header** merangkum ketentuan bahwa label, visibilitas, dan urutan dapat diubah, sedangkan tujuan halaman dijaga otomatis.

Dropdown **Kategori** dan **Produk** pada header website terisi otomatis dari data katalog yang sudah dipublikasikan. Pengguna tidak mengatur isi dropdown tersebut pada halaman ini; perubahannya dilakukan melalui halaman **Kategori Produk** dan **Produk**.

Bila karena data lama header tercatat **Disembunyikan**, tombol **Aktifkan** (bagi pengguna yang berwenang) menampilkannya kembali. Tombol ini hanya muncul pada kondisi tersebut dan tidak dapat digunakan apabila belum ada satu pun bagian yang berstatus tampil.

Catatan**:** apabila menu header belum pernah disiapkan, halaman menampilkan pesan **Menu header belum disiapkan** beserta tombol **Siapkan menu header**. Pada kondisi normal menu sudah tersedia sejak awal sehingga pesan ini tidak muncul.

## Daftar Urutan Menu

Panel **Urutan menu** menampilkan keenam bagian header sesuai urutan tampil. Bagian yang disembunyikan diberi lencana **Tidak tampil**.

- **Mengubah urutan:** seret dan lepas bagian menu ke posisi yang diinginkan, kemudian klik **Simpan urutan**. Perubahan urutan baru berlaku setelah tombol tersebut ditekan.
- **Pencarian:** kolom **Cari menu...** membantu menyaring daftar. Selama kolom pencarian terisi, fitur seret-lepas dan tombol **Simpan urutan** tidak dapat digunakan. Kosongkan pencarian terlebih dahulu sebelum mengatur urutan.
- **Mengubah satu bagian:** klik ikon pensil (**Atur item menu**) pada bagian yang ingin diubah.

## Mengubah Label dan Visibilitas Bagian Header

1. Klik ikon pensil pada bagian menu yang ingin diubah. Formulir **Atur bagian header** tampil pada panel di sebelah kanan.
2. Pada **Bagian menu**, pengguna dapat melihat bagian yang dipilih (tidak dapat diganti saat mengubah).
3. Periksa kotak **Hasil di website publik** untuk memahami halaman yang dibuka oleh menu tersebut.
4. Ubah **Teks yang tampil di header** untuk **Bahasa Indonesia** dan **English**. Kedua bahasa wajib diisi (maksimal 255 karakter).
5. Atur sakelar **Tampilkan di header**. Matikan apabila bagian tersebut belum siap ditampilkan kepada pengunjung.
6. Klik **Simpan perubahan**. Klik **Batal** apabila tidak jadi mengubah.

### Bagian menu

Satu dari enam bagian tetap header (Beranda, Tentang MATEX, Kategori, Produk, Artikel, Hubungi). Tidak bisa diganti saat mengubah; tujuan tautannya diatur sistem agar alamat Bahasa Indonesia dan English tidak rusak.

### Teks yang tampil di header

Label menu yang dilihat pengunjung, wajib untuk Bahasa Indonesia dan English, paling banyak 255 karakter. Usahakan singkat supaya tetap rapi di layar ponsel.

### Urutan

Hanya informasi, misalnya "Posisi 3 dari 6". Ubah urutan dengan menyeret bagian menu di panel **Urutan menu**, lalu klik **Simpan urutan**.

### Tampilkan di header

Matikan untuk menyembunyikan bagian ini dari header website tanpa menghapusnya, misalnya saat halaman tujuannya belum siap.

| Bagian | Label awal (ID / EN) | Perilaku pada website |
| --- | --- | --- |
| Beranda | Beranda / Home | Membuka halaman beranda sesuai bahasa situs. |
| Tentang MATEX | Tentang MATEX / About MATEX | Membuka halaman Tentang MATEX sesuai bahasa situs. |
| Kategori | Kategori / Category | Membuka katalog dan menampilkan dropdown kategori dari data katalog. |
| Produk | Produk / Product | Membuka katalog dan menampilkan dropdown produk dari data katalog. |
| Artikel | Artikel / Blog | Membuka daftar artikel yang sudah dipublikasikan. |
| Hubungi | Hubungi / Contact | Membuka halaman kontak sesuai bahasa situs. |

Apabila suatu bagian pernah dihapus dari daftar sehingga belum lengkap, formulir **Tambahkan bagian header** dapat digunakan untuk memilih bagian yang belum tersedia, kemudian klik **Tambahkan ke header**. Apabila keenam bagian sudah tersedia, sistem menampilkan pesan **Semua bagian header sudah tersedia.**

## Ketentuan Penting dalam Pengaturan Navigasi

- Header hanya mendukung enam bagian tetap. Menambahkan menu baru, tautan bebas, submenu, ikon, atau lencana tidak tersedia.
- Label Bahasa Indonesia dan English wajib diisi bersama. Label dapat disesuaikan, tetapi sebaiknya tetap mencerminkan tujuan menu agar tidak membingungkan pengunjung.
- Daftar urutan harus tersimpan lengkap; sistem menolak penyimpanan urutan apabila daftar tidak lengkap. Muat ulang halaman apabila hal ini terjadi.
- Tombol dan tindakan pada halaman ini tampil sesuai hak akses pengguna (melihat, menambah, mengubah, dan mengaktifkan kembali header).
- Setiap perubahan tercatat pada **Log Aktivitas**.

## Praktik Pengelolaan Navigasi yang Disarankan

- Gunakan label yang singkat sehingga tetap nyaman dibaca pada layar kecil.
- Periksa tampilan header pada website setelah perubahan disimpan, baik pada Bahasa Indonesia maupun English.
- Sembunyikan bagian tertentu hanya apabila halaman tujuannya memang belum siap.
- Hindari menyembunyikan seluruh header kecuali untuk keperluan pemeliharaan.
