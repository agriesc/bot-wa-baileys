const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../credentials.json");
const { parseDateFromCell, getDateRangeByType } = require("../utils/tanggal");
const { parseNominal } = require("../utils/nominal");
const { formatIDR } = require("../utils/formatIDR");
const toProperCase = require("../utils/toProperCase");

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
}

async function handleRingkas(text, isGroup, sock, remoteJid) {
  if (!text.toLowerCase().startsWith("/ringkas") || !isGroup) return;

  try {
    const args = text.trim().split(" ");
    const jenis = args[1]?.toLowerCase() || "hari";
    const customArg = args.slice(2).join(" ");
    const { start, end } = getDateRangeByType(jenis, customArg);

    console.log(
      `📅 Rentang pencarian: ${start.toISOString()} - ${end.toISOString()}`
    );

    const doc = new GoogleSpreadsheet(
      "1nb-kfGUkoYMHSEgqOVU_peP9iSKbqs2GgjcRjoI50cU"
    );
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle["Jurnal"];
    await sheet.loadCells("A1:F20");

    // Temukan baris header
    let headerRow = 0;
    for (let i = 0; i < 20; i++) {
      const val = (sheet.getCell(i, 0).value || "")
        .toString()
        .trim()
        .toLowerCase();
      if (val === "tanggal") {
        headerRow = i;
        break;
      }
    }
    if (!headerRow && headerRow !== 0)
      throw new Error("Header 'Tanggal' tidak ditemukan.");

    // Buat peta kolom berdasarkan header
    const headerMap = {};
    for (let col = 0; col < 6; col++) {
      const header = (sheet.getCell(headerRow, col).value || "")
        .toString()
        .trim()
        .toLowerCase();
      headerMap[header] = col;
    }

    const tanggalCol = headerMap["tanggal"];
    const keluarCol = headerMap["keluar"];
    const masukCol = headerMap["masuk"];

    if ([tanggalCol, keluarCol, masukCol].includes(undefined)) {
      throw new Error("Kolom penting (Tanggal/Keluar/Masuk) tidak ditemukan.");
    }

    // Load semua data baris setelah header
    const maxRows = sheet.rowCount;
    await sheet.loadCells(`A${headerRow + 2}:F${maxRows}`);

    let totalMasuk = 0;
    let totalKeluar = 0;

    for (let row = headerRow + 1; row < maxRows; row++) {
      const tanggalCell = sheet.getCell(row, tanggalCol);
      const rawDate = tanggalCell.value;
      console.log(`👉 Baris ${row + 1} rawDate:`, rawDate);

      const tanggal = parseDateFromCell({ value: rawDate });
      if (!tanggal || isNaN(tanggal.getTime())) {
        console.log(
          `⏩ Lewat baris ${row + 1}: tanggal tidak valid →`,
          rawDate
        );
        continue;
      }

      if (tanggal < start || tanggal > end) continue;

      const keluar =
        parseNominal({ value: sheet.getCell(row, keluarCol).value }) || 0;
      const masuk =
        parseNominal({ value: sheet.getCell(row, masukCol).value }) || 0;

      if (keluar || masuk) {
        console.log(
          `✅ Baris ${row + 1}: ${tanggal.toLocaleDateString(
            "id-ID"
          )} - Keluar: ${keluar} - Masuk: ${masuk}`
        );
      }

      totalKeluar += keluar;
      totalMasuk += masuk;
    }

    const neraca = totalMasuk - totalKeluar;
    const formatter = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // const jenisFormatted =
    //   jenis === "bulan" && customArg
    //     ? `Bulan ${toTitleCase(customArg)}`
    //     : jenis === "bulan"
    //     ? "Bulan Aktif"
    //     : toTitleCase(jenis.replace("_", " "));

    const jenisFormatted =
      jenis === "bulan"
        ? customArg
          ? `Bulan ${toProperCase(customArg)}`
          : "Bulan Aktif"
        : jenis === "7hari"
        ? "7 Hari Terakhir"
        : toProperCase(jenis.replace("_", " "));

    const hasil =
      `*Ringkasan ${jenisFormatted}*\n` +
      `📅 Periode: ${formatter.format(start)} – ${formatter.format(end)}\n\n` +
      `📥 Pemasukan: ${formatIDR(totalMasuk)}\n` +
      `📤 Pengeluaran: ${formatIDR(totalKeluar)}\n` +
      `🧮 Neraca: ${formatIDR(neraca)}`;

    await sock.sendMessage(remoteJid, { text: hasil });
  } catch (err) {
    console.error("❌ Gagal ringkas:", err.message);
    await sock.sendMessage(remoteJid, {
      text: "❌ Gagal membuat ringkasan. Gunakan format:\n/ringkas [hari|minggu|bulan|range dd/mm/yyyy - dd/mm/yyyy]",
    });
  }
}

module.exports = handleRingkas;
