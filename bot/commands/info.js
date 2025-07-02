async function handleInfo(text, isGroup, sock, remoteJid) {
  if (!isGroup) return;
  const cmd = text.trim().toLowerCase();
  if (cmd !== "/info" && cmd !== "/help" && cmd !== "/start") return;

  const infoText = `🤖📘 *Fitur BowieBot v1.0:*

📝 *1. Mencatat Transaksi* — \`/catat\`
Format umum:
  \`/catat sumber_dana deskripsi nominal\`
  Tambah \`@dd-mm-yyyy\` untuk tanggal manual
  Tambah \`masuk\` di akhir untuk transaksi pemasukan

Contoh:
  ➤ \`/catat rekening gaji 5000000 masuk\`
  ➤ \`/catat dompet makan siang 15000\`
  ➤ \`/catat cash pulsa 20000 @28-06-2025\`

🛠️ *2. Ubah Data* — \`/ubah\`
Format umum:
  \`/ubah nomor_baris deskripsi_baru\`
  \`/ubah nomor_baris nominal_baru\`
  Bisa gabung deskripsi & nominal

Contoh:
  ➤ \`/ubah 129 beli pulsa 20000\`
  ➤ \`/ubah 130 beli pulsa\`
  ➤ \`/ubah 131 20000\`

🧹 *3. Hapus Catatan Terakhir* — \`/hapus\`
Menghapus baris terakhir di sheet *Jurnal*

💰 *4. Cek Saldo* — \`/saldo\`
Menampilkan saldo per sumber dana

🔎 *5. Cari Transaksi* — \`/cari kata_kunci\`
Mencari transaksi berdasarkan deskripsi
Minimal kata kunci 3 karakter

📆 *6. Ringkasan Keuangan* — \`/ringkas\`
Format:
  ➤ \`/ringkas hari\` → hari ini
  ➤ \`/ringkas minggu\` → minggu ini
  ➤ \`/ringkas bulan\` → bulan ini
  ➤ \`/ringkas hari 01-06-2025 - 07-06-2025\` → rentang tanggal
  ➤ \`/ringkas bulan juni\` → bulan tertentu

📊 *7. Laporan Bulanan* — \`/laporan\`
Format:
  ➤ \`/laporan juni 2025\` atau \`/laporan 06 2025\`

ℹ️ *8. Info & Bantuan* — \`/help\`, \`/info\`, atau \`/start\`

—

💡 *Tips Tambahan:*
- Sumber dana bisa: \`dompet\`, \`cash\`, \`rekening\`, \`gopay\`, \`jenius\`, \`emoney\`, dll
- Tanggal opsional: \`@dd-mm-yyyy\`
- Transaksi \`masuk\` wajib disebut di akhir
- Nominal hanya angka tanpa titik/koma

—
*Bot by @agriesc 🤖*`;

  await sock.sendMessage(remoteJid, { text: infoText });
}

module.exports = handleInfo;
