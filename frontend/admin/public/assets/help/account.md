# Profil Saya

> **Untuk apa:** mengubah foto, nama, kontak cadangan, dan kata sandi akun Anda sendiri.
> **Izin yang dibutuhkan:** tidak ada; cukup akun yang aktif.
> **Perlu diperhatikan:** email dan telepon utama (dipakai login), alias, kantor, jabatan, dan profil akses hanya bisa diubah admin berwenang lewat Akun Admin.

## Gambaran Umum

Halaman **Profil Saya** dibuka dari menu profil di kanan atas **Header** (klik nama Anda, lalu **Profil Saya**). Menu ini tidak tampil di Sidebar.

Kartu kiri menampilkan foto, nama, alias, dan data akun yang dikelola admin berwenang: email dan telepon utama, perusahaan, kantor, jabatan, serta profil akses. Kartu kanan berisi dua bagian yang disimpan terpisah: **Data diri** dan **Ganti kata sandi**.

URL: https://internal.matexindo.com/account

## Foto Profil

Klik **Ganti foto**, lalu pilih berkas JPG, PNG, atau WebP berukuran paling besar 8 MB. Foto langsung tersimpan dan tampil di Header. Arahkan kursor ke foto lalu klik ikon mata untuk melihatnya penuh. **Hapus foto** mengembalikan tampilan ke huruf awal nama.

Mengganti foto di halaman ini tidak memerlukan izin Media.

## Data Diri

Bagian ini memuat isian yang boleh Anda ubah sendiri:

- **Nama lengkap** (wajib): huruf, spasi, dan tanda . , ' - dengan panjang paling banyak 50 karakter.
- **Email cadangan** (opsional): alamat email yang valid dan belum dipakai akun lain.
- **Telepon cadangan** (opsional): format internasional, misalnya +6281234567890, dan belum dipakai akun lain.

Tekan **Simpan data diri**. Nama baru langsung tampil di Header. Mengosongkan email atau telepon cadangan lalu menyimpan akan menghapusnya.

## Ganti Kata Sandi

1. Isi **Kata sandi saat ini**.
2. Isi **Kata sandi baru**: 8 sampai 64 karakter, tanpa spasi, minimal satu angka atau simbol, dan berbeda dari kata sandi saat ini.
3. Ulangi kata sandi baru di **Ulangi kata sandi baru**.
4. Tekan **Ganti kata sandi**.

Ikon mata di samping kolom menampilkan atau menyembunyikan kata sandi yang diketik.

Setelah berhasil, perangkat lain yang sedang masuk dengan akun Anda otomatis keluar dan harus masuk lagi dengan kata sandi baru. Perangkat yang sedang Anda pakai tetap masuk sampai sesinya berakhir seperti biasa.

Bila kata sandi saat ini salah, muncul pesan **Kata sandi saat ini salah**. Percobaan dibatasi seperti login (10 kali per 15 menit dari satu alamat IP).

## Catatan Keamanan

- Semua perubahan tercatat di **Log Aktivitas**: perubahan data diri dan foto sebagai admin_account.profile_updated, kata sandi sebagai auth.password.changed (atau auth.password.change_failed bila kata sandi saat ini salah). Kata sandi tidak pernah dicatat.
- Lupa kata sandi dan tidak bisa masuk? Fitur Lupa Kata Sandi belum aktif; hubungi admin berwenang atau pengembang.
