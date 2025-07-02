const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../credentials.json");

async function ubahBarisKeSheet(noBaris, deskripsiBaru, nominalBaru) {
  const doc = new GoogleSpreadsheet(
    "1nb-kfGUkoYMHSEgqOVU_peP9iSKbqs2GgjcRjoI50cU"
  );
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle["Jurnal"];
  if (!sheet) throw new Error("Sheet 'Jurnal' tidak ditemukan");

  const rowIndex = parseInt(noBaris) - 1;
  await sheet.loadCells(`D${noBaris}:F${noBaris}`);

  if (deskripsiBaru) {
    sheet.getCell(rowIndex, 3).value = deskripsiBaru;
  }

  if (nominalBaru !== null && nominalBaru !== undefined) {
    const nilaiKeluar = sheet.getCell(rowIndex, 4).value;
    const nilaiMasuk = sheet.getCell(rowIndex, 5).value;

    if (nilaiMasuk && !nilaiKeluar) {
      sheet.getCell(rowIndex, 4).value = "";
      sheet.getCell(rowIndex, 5).value = nominalBaru;
    } else {
      sheet.getCell(rowIndex, 4).value = nominalBaru;
      sheet.getCell(rowIndex, 5).value = "";
    }
  }

  await sheet.saveUpdatedCells();
  return noBaris;
}

async function handleUbah(text, isGroup, sock, remoteJid) {
  if (!text.startsWith("/ubah") || !isGroup) return;

  try {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 3) throw new Error("Format /ubah kurang lengkap");

    const noBaris = parts[1];
    const angkaIdx = parts.findIndex((p, i) => i > 1 && /^\d+$/.test(p));

    let deskripsi = null;
    let nominal = null;

    if (angkaIdx === -1) {
      deskripsi = parts.slice(2).join(" ");
    } else if (angkaIdx === 2 && parts.length === 3) {
      nominal = parseInt(parts[2]);
    } else {
      deskripsi = parts.slice(2, angkaIdx).join(" ");
      nominal = parseInt(parts[angkaIdx]);
    }

    const row = await ubahBarisKeSheet(noBaris, deskripsi, nominal);

    await sock.sendMessage(remoteJid, {
      text: `🛠️ Jurnal baris ${row} sudah Bowie perbarui!`,
    });
  } catch (err) {
    console.error("❌ Gagal ubah:", err.message);
    await sock.sendMessage(remoteJid, {
      text:
        "❌ Format salah. Gunakan:\n" +
        "/ubah nomor_baris deskripsi nominal\n" +
        "Contoh: /ubah 129 beli pulsa 20000\n" +
        "Contoh: /ubah 129 beli pulsa\n" +
        "Contoh: /ubah 129 20000",
    });
  }
}

module.exports = handleUbah;
