require("dotenv").config();
const express = require("express");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const unzipper = require("unzipper");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const P = require("pino");
const { GoogleSpreadsheet } = require("google-spreadsheet");

// 🔐 Kredensial Google Sheets
const creds = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
    process.env.GOOGLE_CLIENT_EMAIL
  )}`,
  universe_domain: "googleapis.com",
};

// 🔧 Modular utils & commands
const { formatIDR } = require("./bot/utils/formatIDR");
const { parseNominal } = require("./bot/utils/nominal");
const { parseDateFromCell } = require("./bot/utils/tanggal");
const toProperCase = require("./bot/utils/toProperCase");
const { getDateRangeByType } = require("./bot/utils/tanggal");

const handleInfo = require("./bot/commands/info");
const handleCatat = require("./bot/commands/catat");
const handleUbah = require("./bot/commands/ubah");
const handleHapus = require("./bot/commands/hapus");
const handleSaldo = require("./bot/commands/saldo");
const handleCari = require("./bot/commands/cari");
const handleRingkas = require("./bot/commands/ringkas");
const handleLaporan = require("./bot/commands/laporan");

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

// ✅ Express setup
const app = express();
app.use(fileUpload());

// Endpoint utama
app.get("/", (req, res) => {
  res.send("Bot WA Aktif 🚀");
});

app.get("/ping", (req, res) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

// Endpoint upload auth_info.zip
app.post("/upload-auth", async (req, res) => {
  try {
    if (!req.files || !req.files.authZip) {
      return res.status(400).send("No file uploaded");
    }

    const zipBuffer = req.files.authZip.data;
    const tempPath = "auth_info.zip";
    fs.writeFileSync(tempPath, zipBuffer);

    await fs
      .createReadStream(tempPath)
      .pipe(unzipper.Extract({ path: "auth_info" }))
      .promise();

    fs.unlinkSync(tempPath);
    res.send("✅ auth_info berhasil diunggah & diekstrak");
  } catch (err) {
    console.error("❌ Upload auth_info gagal:", err);
    res.status(500).send("Upload gagal");
  }
});

// ✅ WhatsApp Socket
async function startSock() {
  console.log("🚀 Memulai koneksi ke WhatsApp...");

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`💡 WA Web Version: ${version}, is latest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  // Init Google Sheet
  const doc = new GoogleSpreadsheet(
    "1nb-kfGUkoYMHSEgqOVU_peP9iSKbqs2GgjcRjoI50cU"
  );
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle["Jurnal"];
  if (!sheet) {
    console.error("❌ Sheet 'Jurnal' tidak ditemukan!");
    return;
  }

  // Koneksi update
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("⛔ Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) startSock();
    } else if (connection === "open") {
      console.log("✅ WhatsApp terhubung!");
    }
  });

  // Pesan masuk
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    try {
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        "";

      const isGroup = msg.key.remoteJid.endsWith("@g.us");
      const remoteJid = msg.key.remoteJid;

      await handleInfo(text, isGroup, sock, remoteJid);
      await handleCatat(text, isGroup, sock, remoteJid);
      await handleUbah(text, isGroup, sock, remoteJid);
      await handleHapus(text, isGroup, sock, remoteJid);
      await handleSaldo(text, isGroup, sock, remoteJid, sheet);
      await handleCari(text, isGroup, sock, remoteJid);
      await handleRingkas(text, isGroup, sock, remoteJid);
      await handleLaporan(text, isGroup, sock, remoteJid);
    } catch (err) {
      console.error("❌ Error saat memproses pesan:", err);
    }
  });
}

// ✅ Jalankan Express dulu, baru WhatsApp socket
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Express server running on port ${PORT}`);

  // Start WhatsApp socket setelah server hidup
  startSock().catch((err) => {
    console.error("❌ Gagal start bot:", err);
  });
});
