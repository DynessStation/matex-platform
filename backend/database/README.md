# Database MATEX

## Menjalankan migration

Isi koneksi database melalui environment, lalu jalankan:

```bash
npm run db:migrate:status
npm run db:migrate
```

Runner memakai lock database agar dua proses deployment tidak menjalankan migration secara bersamaan. Setiap file SQL dicatat bersama checksum di tabel `schema_migrations`. File migration yang sudah tercatat tidak boleh diedit; perubahan berikutnya harus dibuat sebagai migration baru.

## Database kosong

`npm run db:migrate` pada database kosong menjalankan baseline struktur inti, lalu seluruh migration fitur sesuai urutan nama file. Baseline hanya berisi struktur tabel. Data akun, password hash, dan data operasional dari dump development tidak disalin.

Setelah struktur selesai, data perusahaan dan akun admin awal harus dipulihkan dari backup produksi yang sudah diverifikasi atau dibuat melalui prosedur bootstrap terpisah. Jangan menyalin akun contoh dari dump development.

## Mengadopsi database lama

Database development yang sudah memiliki struktur MATEX tetapi belum mempunyai riwayat migration akan dilaporkan sebagai `adoption_required`. Buat backup terlebih dahulu, tinjau tabel dan kolomnya, lalu jalankan satu kali:

```bash
npm run db:migrate:adopt
```

Perintah ini memvalidasi tabel serta kolom target, kemudian mencatat migration yang sudah ada tanpa menjalankan ulang SQL dan tanpa mengubah data aplikasi. Setelah itu `npm run db:migrate:status` harus menunjukkan `current`.

Jangan memakai opsi adopsi untuk database kosong atau schema yang berasal dari aplikasi lain.
