const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../credentials.json");
const { parseDateFromCell, getDateRangeByType } = require("../utils/tanggal");
const { parseNominal } = require("../utils/nominal");
const { formatIDR } = require("../utils/formatIDR");

const EMOJI_KATEGORI = {
  makan: "🍽️",
  transportasi: "🚗",
  entertainment: "🎮",
  "keperluan pribadi": "🛍️",
  banking: "🏦",
  keluarga: "👨‍👩‍👧‍👦",
  "lain-lain": "📦",
};

async function handleLaporan(text, isGroup, sock, remoteJid) {
  if (!text.toLowerCase().startsWith("/laporan") || !isGroup) return;

  try {
    const args = text.trim().split(" ");
    const jenis = args[1]?.toLowerCase() || "bulan";
    const customArg = args.slice(2).join(" ");
    const { start, end } = getDateRangeByType(jenis, customArg);

    const doc = new GoogleSpreadsheet(
      "1nb-kfGUkoYMHSEgqOVU_peP9iSKbqs2GgjcRjoI50cU"
    );
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Jurnal"];
    await sheet.loadCells("A1:F20");

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

    const headerMap = {};
    for (let col = 0; col < 6; col++) {
      const header = (sheet.getCell(headerRow, col).value || "")
        .toString()
        .trim()
        .toLowerCase();
      headerMap[header] = col;
    }

    const tanggalCol = headerMap["tanggal"];
    const kategoriCol = headerMap["kategori"];
    const deskripsiCol = headerMap["deskripsi"];
    const keluarCol = headerMap["keluar"];
    const masukCol = headerMap["masuk"];

    const maxRows = sheet.rowCount;
    await sheet.loadCells(`A${headerRow + 2}:F${maxRows}`);

    const kategoriMap = {
      makan: 0,
      transportasi: 0,
      entertainment: 0,
      "keperluan pribadi": 0,
      banking: 0,
      keluarga: 0,
      "lain-lain": 0,
    };

    let totalPengeluaran = 0;
    let maxMasuk = { nominal: 0, deskripsi: "" };
    let maxKeluar = { nominal: 0, deskripsi: "" };

    for (let row = headerRow + 1; row < maxRows; row++) {
      const tanggal = parseDateFromCell({
        value: sheet.getCell(row, tanggalCol).value,
      });
      if (!tanggal || tanggal < start || tanggal > end) continue;

      const kategori = (sheet.getCell(row, kategoriCol).value || "lain-lain")
        .toString()
        .trim()
        .toLowerCase();
      const deskripsi = (
        sheet.getCell(row, deskripsiCol).value || ""
      ).toString();
      const keluar =
        parseNominal({ value: sheet.getCell(row, keluarCol).value }) || 0;
      const masuk =
        parseNominal({ value: sheet.getCell(row, masukCol).value }) || 0;

      if (keluar > 0) {
        const key = kategoriMap.hasOwnProperty(kategori)
          ? kategori
          : "lain-lain";
        kategoriMap[key] += keluar;
        totalPengeluaran += keluar;

        if (keluar > maxKeluar.nominal) {
          maxKeluar = { nominal: keluar, deskripsi };
        }
      }

      if (masuk > maxMasuk.nominal) {
        maxMasuk = { nominal: masuk, deskripsi };
      }
    }

    const formatter = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let hasil = `📊 *Laporan Per Kategori*\n📅 Periode: ${formatter.format(
      start
    )} – ${formatter.format(end)}\n\n`;

    for (const [kategori, nominal] of Object.entries(kategoriMap)) {
      if (nominal > 0) {
        const emoji = EMOJI_KATEGORI[kategori] || "❓";
        hasil += `${emoji} *${kategori.toUpperCase()}*: ${formatIDR(
          nominal
        )}\n`;
      }
    }

    hasil += `\n💵 *TOTAL*: ${formatIDR(totalPengeluaran)}\n\n`;
    hasil += `💰 *Pemasukan Terbesar*: ${formatIDR(maxMasuk.nominal)} (${
      maxMasuk.deskripsi
    })\n`;
    hasil += `💸 *Pengeluaran Terbesar*: ${formatIDR(maxKeluar.nominal)} (${
      maxKeluar.deskripsi
    })`;

    await sock.sendMessage(remoteJid, { text: hasil });
  } catch (err) {
    console.error("❌ Gagal laporan:", err.message);
    await sock.sendMessage(remoteJid, {
      text: "❌ Gagal membuat laporan. Gunakan format:\n/laporan [hari|minggu|bulan|range dd/mm/yyyy - dd/mm/yyyy]",
    });
  }
}

module.exports = handleLaporan;
