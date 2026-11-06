# Halaman Email

> **Untuk apa:** membaca dan membalas email mailbox MATEX dari dalam admin.
> **Izin yang dibutuhkan:** email.view untuk membaca dan menandai; email.send untuk mengirim, membalas, dan meneruskan; email.manage untuk memindah ke sampah.
> **Perlu diperhatikan:** email tetap tersimpan di Hostinger, bukan di database MATEX. Layanan Hostinger ini masih Beta.

## Gambaran Umum

Tiga panel: folder di kiri, daftar pesan di tengah, dan isi pesan di kanan. Mailbox yang muncul mengikuti cakupan token Hostinger di server. Kalau token belum dipasang, halaman ini memberi tahu.

Folder, pesan yang dibuka, pencarian, dan halaman tersimpan di alamat halaman, jadi bisa dibuka lagi atau dibagikan ke rekan yang punya izin.

URL: https://internal.matexindo.com/email

## Membaca Pesan

Membuka pesan menandainya sudah dibaca, dan ini juga terlihat di webmail. **Tandai belum dibaca** mengembalikannya.

Nama pengirim bisa diisi apa saja oleh siapa pun, jadi lihat juga alamat di kolom Dari sebelum menindaklanjuti.

Isi email ditampilkan di bingkai terkunci: skrip di dalamnya tidak jalan. Gambar dari luar diblokir sampai **Tampilkan gambar** ditekan, karena gambar seperti itu bisa memberi tahu pengirim bahwa email sudah dibuka.

Lampiran selalu terunduh, tidak dibuka di admin. Periksa dulu sebelum membuka file dari pengirim yang tidak dikenal.

## Menulis dan Membalas

**Tulis**, **Balas**, dan **Teruskan** membuka formulir di panel kanan. Beberapa alamat dipisah koma. Salinan pesan terkirim masuk ke folder Sent. Mengirim dengan lampiran belum tersedia dari sini.

Setiap pengiriman tercatat di Log Aktivitas (penerima dan subjek, tanpa isi pesan).

## Sampah

**Sampah** memindahkan pesan ke folder sampah mailbox. Menghapus permanen tidak tersedia dari sini.
