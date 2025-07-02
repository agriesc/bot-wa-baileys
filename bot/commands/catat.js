const { formatIDR } = require("../utils/formatIDR");
const { parseNominal } = require("../utils/nominal");
const { parseDateFromCell } = require("../utils/tanggal");

const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
};

const { tulisKeSheet } = require("../utils/sheetUtils");
const { getTodayWIB } = require("../utils/tanggal");

const sumberDanaMap = {
  dompet: "Dompet",
  cash: "Dompet",
  rekening: "Rekening",
  jenius: "Rekening",
  qris: "Rekening",
  gopay: "Gopay",
  emoney: "e-money",
  "e-money": "e-money",
};

async function handleCatat(text, isGroup, sock, remoteJid) {
  if (!text.startsWith("/catat") || !isGroup) return;

  try {
    const match = text
      .trim()
      .match(
        /^\/catat\s+(\w+)\s+(.+?)\s+(\d+)(?:\s+@(\d{2})[-/](\d{2})[-/](\d{4}))?(?:\s+(masuk))?$/i
      );

    if (!match) throw new Error("Format kurang lengkap");

    const sumberDanaInput = match[1].toLowerCase();
    const sumberDana = sumberDanaMap[sumberDanaInput];
    if (!sumberDana) throw new Error("Sumber dana tidak valid");

    let deskripsi = match[2].trim();
    const nominal = parseInt(match[3]);

    let tanggalManual = null;
    if (match[4] && match[5] && match[6]) {
      const [d, m, y] = [match[4], match[5], match[6]];
      tanggalManual = `${d}/${m}/${y}`;
    }

    const tanggal = tanggalManual || getTodayWIB();

    const isMasuk = match[7] && match[7].toLowerCase() === "masuk";
    let masuk = "";
    let keluar = nominal;

    if (isMasuk) {
      masuk = nominal;
      keluar = "";
    }

    const kategori = (() => {
      const lower = deskripsi.toLowerCase();
      const daftarKategori = [
        {
          nama: "Makan",
          kata: ["makan", "kantin", "warteg", "warsun", "warung"],
        },
        { nama: "Transportasi", kata: ["bensin", "parkir", "tol", "ojek"] },
        { nama: "Entertainment", kata: ["cafe", "nonton", "hiburan", "film"] },
        {
          nama: "Keperluan Pribadi",
          kata: ["skincare", "baju", "cukur", "potong rambut", "aml"],
        },
        {
          nama: "Banking",
          kata: [
            "notification fee",
            "admin",
            "atm",
            "stamp duty fee",
            "biaya bank",
            "feesible",
          ],
        },
        {
          nama: "Keluarga",
          kata: [
            "anak",
            "istri",
            "fey",
            "ortu",
            "orang tua",
            "mamah",
            "bapa",
            "nde",
            "ayah",
            "ibu",
          ],
        },
      ];
      for (const item of daftarKategori) {
        if (item.kata.some((k) => lower.includes(k))) return item.nama;
      }
      return "Lain-lain";
    })();

    const barisKe = await tulisKeSheet({
      tanggal,
      kategori,
      sumberDana,
      deskripsi,
      keluar,
      masuk,
    });

    await sock.sendMessage(remoteJid, {
      text: `📝 Transaksi sudah Bowie tambahkan di baris ${barisKe}!`,
    });
  } catch (err) {
    console.error("❌ Gagal mencatat:", err.message);
    await sock.sendMessage(remoteJid, {
      text:
        "⚠️ Bowie tidak bisa membaca pesanmu. Mohon gunakan format:\n" +
        "/catat sumber_dana deskripsi nominal\n" +
        "Contoh: /catat cash makan siang 15000\n" +
        "Contoh: /catat dompet pulsa 10000 @25-06-2025",
    });
  }
}

module.exports = handleCatat;
