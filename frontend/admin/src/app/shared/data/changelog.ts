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
