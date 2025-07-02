const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../credentials.json");

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
