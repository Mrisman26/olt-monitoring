Integrasi ZTE C320 ke Mikroin Monitor

Ringkasan:

- Profil OID `zte-c320` telah ditambahkan ke aplikasi.
- Polling ONUs untuk ZTE C320 menggunakan indeks ter-enkode (mis. `285278465.23`).

Cara pakai singkat:

1. Pada UI tambah OLT baru dengan vendor `ZTE`.
2. Atur `SNMP Port` (default 161) dan `Read Community`.
3. `OID Profile` akan otomatis terset ke `zte-c320` jika vendor dipilih.
4. Gunakan fitur `Test Connection` atau `Poll ONU` pada halaman OLT.

SNMP Trap:

- ZTE C320 juga mengirim trap pada perubahan status ONU. Untuk menerima trap, aktifkan listener pada variabel lingkungan atau di konfigurasi server (aplikasi backend harus menjalankan trap listener pada port default/yang Anda pilih).

OLT dengan 2 kartu GTGH (dua kartu GPON 16 port):

- ZTE C320 yang terpasang 2 kartu GTGH memakai dua rentang indeks ter-enkode:
  - Kartu/slot 1 (GTGH pertama): `285278465` s.d. `285278480` (PON 1-16).
  - Kartu/slot 2 (GTGH kedua): `285278721` s.d. `285278736` (PON 1-16).
- Polling membaca kedua kartu sekaligus via walk pada tabel ONU dan tabel optik.
- Kolom PON menampilkan lokasi lengkap kartu/port, contoh:
  - ONU di GTGH slot 1 PON 3: `1/3:13`.
  - ONU di GTGH slot 2 PON 3: `2/3:13`.
- `decodeZteIndex` menerjemahkan indeks ter-enkode menjadi `{ board, pon, onuId }`; `mapZteOnus` memakai `board` agar PON dari dua kartu tidak tercampur.

Catatan teknis:

- Kode polling ZTE ada di `src/lib/snmp.ts` (fungsi polling menggunakan walk + `assignByColumn` + `assignOpticalColumn` + `mapZteOnus`).
- Profil OID ada di `src/lib/oid-catalog.ts`.
- Jika Anda menggunakan server backend terpisah, pastikan `net-snmp` tersedia dan server menjalankan API yang mengakses `src/lib/snmp.ts`.

Environment and trap listener

- Copy `.env.example` to `.env` at the project root and adjust values for your environment.
- To enable trap listener inside the app, set `TRAP_ENABLED=true` and configure `TRAP_WEBHOOK_URL`/`TRAP_WEBHOOK_TYPE`/`TRAP_WEBHOOK_CHAT_ID` as needed.
- The `.env.example` includes sensible defaults for development (SNMP community `public`, trap port `1620`).

Quick test

- With a running app and `TRAP_ENABLED=true`, you can simulate traps using the reference repo `go-snmp-olt-zte-c320-main/scripts/test-trap.sh` (adapt target host/port). Ensure `TRAP_WEBHOOK_URL` points to a reachable HTTP endpoint to receive translated trap events.
