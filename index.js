const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const path = require("path");
const express = require("express");
const fileUpload = require("express-fileupload");
const unzipper = require("unzipper");
const { GoogleSpreadsheet } = require("google-spreadsheet");
require("dotenv").config();

// Import fitur
const handleInfo = require("./bot/commands/info");
const handleCatat = require("./bot/commands/catat");
const handleUbah = require("./bot/commands/ubah");
const handleHapus = require("./bot/commands/hapus");
const handleSaldo = require("./bot/commands/saldo");
const handleCari = require("./bot/commands/cari");
const handleRingkas = require("./bot/commands/ringkas");
const handleLaporan = require("./bot/commands/laporan");

const app = express();
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Jalankan Express Server
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`🚀 Server Express jalan di http://localhost:${port}`);
});

// Upload auth_info.zip dari Postman
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
      .pipe(unzipper.Extract({ path: "." }))
      .promise();

    fs.unlinkSync(tempPath);
    res.send("✅ auth_info berhasil diunggah & diekstrak");

    // Jika creds.json tersedia, langsung mulai koneksi WA
    const credPath = path.join(__dirname, "auth_info/creds.json");
    if (fs.existsSync(credPath)) {
      console.log(
        "✅ creds.json ditemukan setelah upload. Menjalankan WhatsApp socket..."
      );
      startSock();
    } else {
      console.log("⚠️ File creds.json tetap belum ditemukan setelah unzip");
    }
  } catch (err) {
    console.error("❌ Upload auth_info gagal:", err);
    res.status(500).send("Upload gagal");
  }
});

// Cek koneksi awal (hanya jika sudah ada auth_info)
const credPath = path.join(__dirname, "auth_info/creds.json");
if (fs.existsSync(credPath)) {
  console.log(
    "✅ creds.json ditemukan saat startup. Menjalankan koneksi WA..."
  );
  startSock();
} else {
  console.log("⏳ Menunggu upload creds.json lewat endpoint POST /upload-auth");
}

// Jalankan koneksi Baileys
async function startSock() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`💡 WA Web Version: ${version}, is latest: ${isLatest}`);

    const sock = makeWASocket({
      version,
      logger: P({ level: "silent" }),
      printQRInTerminal: false,
      auth: state,
      syncFullHistory: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
          qr
        )}`;
        console.log("📸 Scan QR Code ini di browser:");
        console.log(qrUrl);
      }

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

    // Google Sheets
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

    // Pastikan path-nya sesuai dengan ZIP hasil ekstrak (biasanya `auth_info/creds.json`)
    const creds = require("./auth_info/creds.json");

    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key.replace(/\\n/g, "\n"), // penting!
    });

    await doc.loadInfo();

    const sheet = doc.sheetsByTitle["Jurnal"];
    if (!sheet) {
      console.error("❌ Sheet 'Jurnal' tidak ditemukan!");
      return;
    }

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
        await handleCatat(text, isGroup, sock, remoteJid, sheet);
        await handleUbah(text, isGroup, sock, remoteJid, sheet);
        await handleHapus(text, isGroup, sock, remoteJid, sheet);
        await handleSaldo(text, isGroup, sock, remoteJid, sheet);
        await handleCari(text, isGroup, sock, remoteJid, sheet);
        await handleRingkas(text, isGroup, sock, remoteJid, sheet);
        await handleLaporan(text, isGroup, sock, remoteJid, sheet);
      } catch (err) {
        console.error("❌ Error saat memproses pesan:", err);
      }
    });
  } catch (err) {
    console.error("❌ Gagal menjalankan WhatsApp socket:", err);
  }
}

// require("dotenv").config();
// const {
//   default: makeWASocket,
//   useMultiFileAuthState,
//   DisconnectReason,
//   fetchLatestBaileysVersion,
// } = require("@whiskeysockets/baileys");
// const P = require("pino");
// const { GoogleSpreadsheet } = require("google-spreadsheet");
// const express = require("express");
// const fileUpload = require("express-fileupload");
// const fs = require("fs");
// const unzipper = require("unzipper");

// const creds = {
//   type: "service_account",
//   project_id: process.env.GOOGLE_PROJECT_ID,
//   private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
//   private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
//   client_email: process.env.GOOGLE_CLIENT_EMAIL,
//   client_id: process.env.GOOGLE_CLIENT_ID,
//   auth_uri: "https://accounts.google.com/o/oauth2/auth",
//   token_uri: "https://oauth2.googleapis.com/token",
//   auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
//   client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
//     process.env.GOOGLE_CLIENT_EMAIL
//   )}`,
//   universe_domain: "googleapis.com",
// };

// // ✅ Modular utils
// const { formatIDR } = require("./bot/utils/formatIDR");
// const { parseNominal } = require("./bot/utils/nominal");
// const { parseDateFromCell } = require("./bot/utils/tanggal");
// const toProperCase = require("./bot/utils/toProperCase");

// // ✅ Commands
// const handleInfo = require("./bot/commands/info");
// const handleCatat = require("./bot/commands/catat");
// const handleUbah = require("./bot/commands/ubah");
// const handleHapus = require("./bot/commands/hapus");
// const handleSaldo = require("./bot/commands/saldo");
// const handleCari = require("./bot/commands/cari");
// const handleRingkas = require("./bot/commands/ringkas");
// const handleLaporan = require("./bot/commands/laporan");

// // ✅ Lainnya
// const { getDateRangeByType } = require("./bot/utils/tanggal");

// const sumberDanaMap = {
//   dompet: "Dompet",
//   cash: "Dompet",
//   rekening: "Rekening",
//   jenius: "Rekening",
//   qris: "Rekening",
//   gopay: "Gopay",
//   emoney: "e-money",
//   "e-money": "e-money",
// };

// async function startSock() {
//   const { state, saveCreds } = await useMultiFileAuthState("auth_info");
//   const { version, isLatest } = await fetchLatestBaileysVersion();
//   console.log(`💡 WA Web Version: ${version}, is latest: ${isLatest}`);
//   const fs = require("fs");
//   if (!fs.existsSync("auth_info/creds.json")) {
//     console.error("❌ auth_info/creds.json TIDAK DITEMUKAN!");
//   } else {
//     console.log("✅ auth_info/creds.json DITEMUKAN!");
//   }

//   const sock = makeWASocket({
//     version,
//     logger: P({ level: "silent" }),
//     printQRInTerminal: false, // ⛔ nonaktifkan QR ASCII
//     auth: state,
//     syncFullHistory: false,
//   });

//   sock.ev.on("creds.update", saveCreds);

//   sock.ev.on("connection.update", async (update) => {
//     const { connection, lastDisconnect, qr } = update;

//     if (qr) {
//       const qrUrl =
//         "https://api.qrserver.com/v1/create-qr-code/?data=" +
//         encodeURIComponent(qr);
//       console.log("📸 Scan QR Code ini di browser:");
//       console.log(qrUrl);
//     }

//     if (connection === "close") {
//       const shouldReconnect =
//         lastDisconnect?.error?.output?.statusCode !==
//         DisconnectReason.loggedOut;
//       console.log("⛔ Connection closed. Reconnecting:", shouldReconnect);
//       if (shouldReconnect) startSock();
//     } else if (connection === "open") {
//       console.log("✅ WhatsApp terhubung!");
//     }
//   });

//   // Inisialisasi Google Sheet
//   const doc = new GoogleSpreadsheet(
//     "1nb-kfGUkoYMHSEgqOVU_peP9iSKbqs2GgjcRjoI50cU"
//   );
//   await doc.useServiceAccountAuth(creds);
//   await doc.loadInfo();
//   const sheet = doc.sheetsByTitle["Jurnal"];
//   if (!sheet) {
//     console.error("❌ Sheet 'Jurnal' tidak ditemukan!");
//     return;
//   }

//   sock.ev.on("messages.upsert", async ({ messages }) => {
//     const msg = messages[0];
//     if (!msg.message) return;

//     try {
//       const text =
//         msg.message?.conversation ||
//         msg.message?.extendedTextMessage?.text ||
//         msg.message?.imageMessage?.caption ||
//         "";

//       const isGroup = msg.key.remoteJid.endsWith("@g.us");
//       const remoteJid = msg.key.remoteJid;

//       await handleInfo(text, isGroup, sock, remoteJid);
//       await handleCatat(text, isGroup, sock, remoteJid);
//       await handleUbah(text, isGroup, sock, remoteJid);
//       await handleHapus(text, isGroup, sock, remoteJid);
//       await handleSaldo(text, isGroup, sock, remoteJid, sheet);
//       await handleCari(text, isGroup, sock, remoteJid);
//       await handleRingkas(text, isGroup, sock, remoteJid);
//       await handleLaporan(text, isGroup, sock, remoteJid);
//     } catch (err) {
//       console.error("❌ Error saat memproses pesan:", err);
//     }
//   });
// }

// // ✅ Express server
// const app = express();
// app.use(fileUpload());

// app.post("/upload-auth", async (req, res) => {
//   try {
//     if (!req.files || !req.files.authZip) {
//       return res.status(400).send("No file uploaded");
//     }

//     const zipBuffer = req.files.authZip.data;
//     const tempPath = "auth_info.zip";
//     fs.writeFileSync(tempPath, zipBuffer);

//     await fs
//       .createReadStream(tempPath)
//       .pipe(unzipper.Extract({ path: "auth_info" }))
//       .promise();

//     fs.unlinkSync(tempPath);
//     res.send("✅ auth_info berhasil diunggah & diekstrak");
//   } catch (err) {
//     console.error("❌ Upload auth_info gagal:", err);
//     res.status(500).send("Upload gagal");
//   }
// });

// app.get("/", (req, res) => {
//   res.send("Bot WA Aktif 🚀");
// });

// app.get("/ping", (req, res) => {
//   res.status(200).json({
//     status: "alive",
//     timestamp: new Date().toISOString(),
//   });
// });

// // ✅ Mulai Express + WhatsApp Socket
// const PORT = process.env.PORT || 10000;
// app.listen(PORT, () => {
//   console.log(`✅ Express server running on port ${PORT}`);
// });

// startSock().catch((err) => {
//   console.error("❌ Gagal start bot:", err);
// });
