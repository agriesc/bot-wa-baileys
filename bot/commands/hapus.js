const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
};

async function hapusBarisTerakhir() {
  const doc = new GoogleSpreadsheet(
    "1nb-kfGUkoYMHSEgqOVU_peP9iSKbqs2GgjcRjoI50cU"
  );
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle["Jurnal"];
  if (!sheet) throw new Error("Sheet 'Jurnal' tidak ditemukan");

  const rows = await sheet.getRows();
  const lastRow = rows[rows.length - 1];
  if (!lastRow) throw new Error("Tidak ada data untuk dihapus");

  await lastRow.delete();
  console.log("🗑️ Baris terakhir berhasil dihapus.");
}

async function handleHapus(text, isGroup, sock, remoteJid) {
  if (text.trim() !== "/hapus" || !isGroup) return;

  try {
    await hapusBarisTerakhir();
    await sock.sendMessage(remoteJid, {
      text: "🧹 Catatan terakhir sudah Bowie hapus dari Jurnal.",
    });
  } catch (err) {
    await sock.sendMessage(remoteJid, {
      text: `❌ Gagal menghapus data. ${err.message}`,
    });
  }
}

module.exports = handleHapus;
