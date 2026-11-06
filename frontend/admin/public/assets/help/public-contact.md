# Halaman Pengaturan Kontak

> **Untuk apa:** mengatur kanal kontak (WhatsApp, email, dan lainnya) dan topik formulir kontak beserta email penerimanya.
> **Izin yang dibutuhkan:** public_contact.view untuk melihat; public_contact.update untuk mengubah.
> **Perlu diperhatikan:** belum ada halaman admin untuk membaca pesan masuk; pesan datang lewat email penerima, jadi pastikan email itu aktif.

## Gambaran Umum

Halaman ini mengatur akun sosial media, kanal kontak, dan pilihan topik di formulir kontak. Ketiganya tabel yang diedit di baris: ikon pensil membuka satu baris, ceklis langsung menyimpan baris itu, tanda silang atau Esc membatalkan, dan kolom nomor menjadi tombol hapus. Tidak ada tombol simpan lain. Nama internal dibuat otomatis.

Tombol ikon grafik di kanan atas membuka ringkasan: kunjungan per akun, klik per kanal, dan keadaan pesan formulir kontak. Klik dihitung per akun dan kanal sejak fitur ini aktif; data lama tidak bisa dipisah. Angka dibaca dan dibalas menyusul bersama menu Email.

URL: https://internal.matexindo.com/public-contact

## Sosial Media

Akun yang tampil di header, footer, dan halaman kontak website, maksimal 3 per platform. **Status** Aktif berarti akun masih dipakai; **Publikasi** Published berarti tampil di website. Akun Inaktif tidak pernah tampil, dan hanya akun Inaktif yang bisa dihapus.

Follower dan jumlah konten ada di bagian lipat baris, diisi manual dan opsional.

## Kanal Kontak

Nomor, email, dan tautan yang tampil di website. Tautan dibuat otomatis dari nilai. Nomor WhatsApp boleh ditulis 0812... atau 62812..., dan server yang merapikan. **Utama** menjadikan kanal itu pilihan pertama untuk jenisnya: satu jenis hanya punya satu kanal utama. Tombol panah mengatur urutan tampil dan langsung tersimpan.

Label dan keterangan per bahasa ada di bagian lipat baris. Label wajib untuk kedua bahasa.

## Topik Pesan

Pilihan topik di formulir kontak beserta email penerimanya. Email ini tidak tampil ke pengunjung. Topik Hidden tidak muncul di formulir. Formulir butuh minimal satu topik, dan pesan lama tetap tersimpan walau topiknya dihapus.

## Alur Pesan dari Pengunjung

Pengunjung memilih topik, mengisi nama, email atau telepon, dan pesan, lalu menyetujui ketentuan. Pesan disimpan sistem dengan nomor MSG-<nomor> dan dikirim ke email penerima topiknya. Pengiriman berulang dalam waktu singkat dibatasi untuk mencegah penyalahgunaan.

Jumlah pesan hari ini tampil di Dasbor. Isi pesan dan balasannya diurus lewat email; bila pengiriman email gagal, pesan tetap tersimpan di sistem.

## Aturan Penting

- Bila ada isian yang belum lengkap atau nama internal yang sama, kolomnya ditandai merah dan penyimpanan dibatalkan.
- Lengkapi label kedua bahasa agar tampil benar di website Bahasa Indonesia dan English.
- Periksa tautan WhatsApp dan email di website setelah menyimpan.
- Perubahan pengaturan kontak tercatat di Log Aktivitas.
