const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
};

const { parseDateFromCell } = require("../utils/tanggal");
const { parseNominal } = require("../utils/nominal");
const { formatIDR } = require("../utils/formatIDR");

async function handleCari(text, isGroup, sock, remoteJid) {
  if (!text.toLowerCase().startsWith("/cari") || !isGroup) return;

  try {
    const keyword = text.trim().slice(6).toLowerCase();
    if (!keyword) throw new Error("Keyword kosong");

    const doc = new GoogleSpreadsheet(
      "1nb-kfGUkoYMHSEgqOVU_peP9iSKbqs2GgjcRjoI50cU"
    );
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Jurnal"];

    // Asumsi header selalu di baris 4
    const startRow = 5; // baris data dimulai dari row ke-5 (setelah header A4:F4)
    const maxRows = sheet.rowCount;
    const results = [];

    // Load semua sel di kolom A–F
    await sheet.loadCells(`A${startRow}:F${maxRows}`);

    for (let r = startRow - 1; r < maxRows; r++) {
      const tanggalCell = sheet.getCell(r, 0);
      const deskripsiCell = sheet.getCell(r, 3);

      const deskripsi = (deskripsiCell.value || "").toString().toLowerCase();
      if (!deskripsi.includes(keyword)) continue;

      const tanggal = parseDateFromCell(tanggalCell);
      if (!tanggal || isNaN(tanggal.getTime())) continue;

      const sumber = (sheet.getCell(r, 2).value || "-").toString();
      const keluar = parseNominal(sheet.getCell(r, 4));
      const masuk = parseNominal(sheet.getCell(r, 5));

      const nominal = keluar || masuk || 0;
      const nominalFormatted = keluar
        ? `-${formatIDR(keluar)}`
        : formatIDR(masuk);

      results.push(
        `#${r + 1} - ${tanggal.toLocaleDateString("id-ID")} | ${sumber} | ${
          deskripsiCell.value
        } | ${nominalFormatted}`
      );
    }

    if (results.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: `🔍 Tidak ada transaksi yang cocok dengan kata: *${keyword}*`,
      });
    } else {
      await sock.sendMessage(remoteJid, {
        text: `🔍 *Hasil pencarian "${keyword}":*\n\n${results.join(
          "\n"
        )}\n\nTotal: ${results.length}`,
      });
    }
  } catch (err) {
    console.error("❌ Gagal cari:", err.message);
    await sock.sendMessage(remoteJid, {
      text: "❌ Gagal mencari data. Gunakan format: /cari kata_kunci",
    });
  }
}

module.exports = handleCari;
