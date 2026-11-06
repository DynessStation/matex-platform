// What changed in each MATEX version, written for the team (admin users), not for developers.
// The newest version comes first; its number matches APP_VERSION.

export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  summary: string;
  sections: ChangelogSection[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.11B',
    date: '7 November 2026',
    summary:
      'Menu HPP & Harga baru: bahan, resep, tarif, biaya per kanal, kalkulator, dan impor Excel. Ditambah popup Detail Produk dan API publik yang lebih rapat.',
    sections: [
      {
        title: 'HPP & Harga',
        items: [
          'Daftar 83 item Excel beserta HPP, GPM, Net MIA, Affiliate, E-commerce, dan bedanya dengan harga website.',
          'Harga bahan bertanggal, resep berversi, dan dampak harga baru bisa dilihat sebelum disimpan.',
          'Biaya tiap kanal diisi manual dan bertanggal, jadi perubahan tarif tidak perlu mengubah aplikasi.',
          'Kalkulator menghitung uang diterima, laba, margin, dan harga minimum di semua kanal sekaligus.',
          'Impor Excel menampilkan laporan dulu, termasuk data yang perlu dicek tim, dan menyimpan setelah diminta.',
          'Harga website hanya berubah lewat tombol Terapkan harga, dan tercatat di Log Aktivitas.',
          'Akses diatur dengan izin Lihat HPP & Harga, Kelola HPP & Harga, dan Terapkan Harga.',
        ],
      },
      {
        title: 'Produk',
        items: [
          'Menu baris produk punya Detail: semua data produk di satu layar, dan biaya bagi yang punya izin.',
          'Barcode, HS code, asal produk, ukuran, dan stok sekarang diperiksa formatnya saat disimpan.',
          'Harga grosir di atas harga konsumen memunculkan peringatan.',
        ],
      },
      {
        title: 'Website dan tampilan',
        items: [
          'Footer di HP bisa dibuka, dan Produk Unggulan tampil dua kolom.',
          'ID database tidak lagi tampil di respons publik, dan data internal dibuang dari sana.',
          'Halaman pertama lebih ringan karena datanya ikut bersama halaman.',
          'Tab Halaman Website dan Kantor punya titik status, input waktu satu baris, dan tombol Isi otomatis jadi teks.',
        ],
      },
    ],
  },
  {
    version: '1.2.11A',
    date: '6 November 2026',
    summary:
      'Menu Email baru di admin, form yang lebih ringkas, dan panel ringkasan di halaman Artikel, Produk, Kategori, dan Kontak.',
    sections: [
      {
        title: 'Email',
        items: [
          'Menu Email: baca, cari, balas, teruskan, dan tulis email langsung dari admin. Emailnya tetap tersimpan di Hostinger.',
          'Membuka pesan menandainya sudah dibaca, dan ini juga terlihat di webmail. Tombol "Tandai belum dibaca" mengembalikannya.',
          'Gambar dari luar diblokir sampai "Tampilkan gambar" ditekan. Lampiran selalu terunduh, jadi periksa dulu sebelum membuka file dari pengirim yang tidak dikenal.',
          'Yang belum bisa: mengirim email dengan lampiran, dan menghapus permanen dari admin.',
          'Akses diatur dengan tiga izin di Hak Akses: Lihat Email, Kirim Email, dan Kelola Email.',
        ],
      },
      {
        title: 'Dasbor dan Hak Akses',
        items: [
          'Dasbor punya tab. Isi yang lama ada di tab Website; Inventaris, CRM & CLV, dan Finance menyusul.',
          'Hak Akses sekarang satu halaman: grup di kiri, hak akses grup itu di kanan, tanpa pindah halaman untuk menambah atau mengubah.',
        ],
      },
      {
        title: 'Artikel',
        items: [
          'Tab Umum dihapus. Unggulan dan Sematkan pindah ke tab Publikasi, dan kunci internal terisi otomatis.',
          'Artikel bisa diberi Tag, dan tiap tag punya halaman sendiri di website. "Kelola Tag" untuk menambah dan mengganti nama.',
          'Isian Penulis untuk nama yang tampil di artikel.',
          'Panel ringkasan: artikel teratas, tag teratas, dan daftar yang perlu dibenahi. Pembaca website juga bisa membagikan artikel lewat WhatsApp, Facebook, X, atau salin tautan.',
        ],
      },
      {
        title: 'Pengaturan Kontak',
        items: [
          'Sosial Media punya tabel sendiri, paling banyak 3 akun per platform, dengan pengikut dan jumlah konten yang boleh diisi manual. Tautan sosial media di header website sekarang mengikuti data ini.',
          'Kanal Kontak dan Topik Pesan jadi tabel ringkas yang disunting langsung di barisnya.',
          'Panel ringkasan: klik per akun dan kanal, serta jumlah pesan di mailbox yang dibaca, dibalas, dan belum dibaca.',
        ],
      },
      {
        title: 'Produk dan Kategori',
        items: [
          'Form lebih ringkas: nama di atas tab, Simpan di bawah, dan tiap tab menunjukkan statusnya.',
          'Spesifikasi, harga Rupiah dan Dollar, serta kanal marketplace jadi tabel ringkas. Baris yang masih terbuka perlu diselesaikan sebelum Simpan.',
          'Panel ringkasan: produk paling dilihat, klik per marketplace, dan daftar yang perlu dibenahi.',
        ],
      },
      {
        title: 'Website dan alamat halaman',
        items: [
          'Slug artikel, produk, atau kategori yang diganti tetap membawa pengunjung ke alamat barunya, jadi tautan lama tidak mati.',
          'Kunci internal dibuat otomatis oleh sistem.',
        ],
      },
    ],
  },
  {
    version: '1.1.10',
    date: '27 Oktober 2026',
    summary:
      'Sejak website dan admin MATEX online pada 14 Oktober, semuanya dirapikan: tampilan admin, website, dan fondasi sistem di belakangnya. Ini yang berubah dan perlu diketahui.',
    sections: [
      {
        title: 'Admin: lebih mudah dipakai',
        items: [
          'Tabel baru di semua daftar: cari, urutkan, atur jumlah per halaman, dan lihat "menampilkan x dari y". Teks yang terlalu panjang dipotong rapi; arahkan kursor untuk membaca lengkapnya.',
          'Tanda "?" di judul dan isian form menjelaskan gunanya. Panduan lengkap tiap halaman bisa dibuka di panel samping, dan isinya sesuai dengan aplikasi yang sekarang.',
          'Tombol "Kembali" di form membuka daftar seperti terakhir ditinggalkan, lengkap dengan pencarian dan urutannya.',
          'Tombol "Perbarui" memuat ulang daftar, dengan jeda supaya tidak tertekan berkali-kali.',
          'Klik gambar untuk melihatnya besar; foto galeri bisa digeser.',
          'Halaman Profil Saya: ganti nama, foto, kontak cadangan, dan kata sandi sendiri. Mengganti kata sandi otomatis mengeluarkan akun itu dari perangkat lain.',
          'Huruf area isi sedikit lebih kecil, warna kotak isian dan pilihan seragam, dan mode gelap lebih mudah dibaca.',
        ],
      },
      {
        title: 'Admin: per halaman',
        items: [
          'Urutan tidak lagi diketik angka. FAQ dan Kantor diatur lewat "Atur urutan" dengan digeser; kategori digeser di pohonnya; kanal dan topik kontak dinaikkan atau diturunkan; posisi ditampilkan sebagai "Posisi x dari n".',
          'Produk: centang "Tampilkan di depan katalog" lalu atur urutannya di "Produk di depan" (paling banyak 12). Daftar produk punya panel kategori untuk menyaring.',
          'Kategori Produk: pohon dan form dalam satu halaman, dengan jumlah produk di tiap kategori.',
          'Media: tiap file menunjukkan "Dipakai: n". File yang masih dipakai tidak bisa dihapus.',
          'Navigasi header website selalu tampil di website.',
          'Isian nomor telepon diperbaiki, dan tombol Simpan di halaman website tetap terlihat saat halaman digulir.',
          'Dasbor tidak lagi menampilkan pesan error untuk akun yang tidak punya izin dasbor.',
        ],
      },
      {
        title: 'Website matexindo.com',
        items: [
          'Ikon akun, favorit, dan keranjang di header berlabel "Segera" dan membuka panel "MATEX Market segera hadir".',
          'Bagian "Tag populer" di beranda bisa diatur dari editor Beranda di admin (label Indonesia dan Inggris, menuju kategori atau kata cari). Bagian ini tampil setelah diisi.',
          'Katalog menampilkan produk pilihan di depan lebih dulu.',
          'Artikel terjadwal tayang sendiri pada waktunya.',
          'Produk, kategori, atau artikel yang tidak ada menampilkan halaman "tidak ditemukan" yang benar.',
        ],
      },
      {
        title: 'Di balik layar',
        items: [
          'Data dibackup otomatis setiap malam dan disimpan terenkripsi di luar server; pemulihan dari backup sudah diuji.',
          'Data yang dihapus disimpan dengan waktu hapusnya, dengan cara yang sama di semua bagian admin, sehingga tetap bisa ditelusuri.',
          'Lebih dari 200 tes otomatis dijalankan sebelum setiap pembaruan dipasang.',
          'Kode admin, website, dan server dirapikan supaya fitur berikutnya lebih cepat dan aman dibuat.',
        ],
      },
    ],
  },
  {
    version: '1.0',
    date: '14 Oktober 2026',
    summary:
      'Website matexindo.com, admin, dan server MATEX pertama kali online.',
    sections: [],
  },
];
