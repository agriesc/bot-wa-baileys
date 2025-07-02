const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const P = require("pino");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("./credentials.json");

// ✅ Modular utils
const { formatIDR } = require("./bot/utils/formatIDR");
const { parseNominal } = require("./bot/utils/nominal");
const { parseDateFromCell } = require("./bot/utils/tanggal");
const toProperCase = require("./bot/utils/toProperCase");

// ✅ Commands
const handleInfo = require("./bot/commands/info");
const handleCatat = require("./bot/commands/catat");
const handleUbah = require("./bot/commands/ubah");
const handleHapus = require("./bot/commands/hapus");
const handleSaldo = require("./bot/commands/saldo");
const handleCari = require("./bot/commands/cari");
const handleRingkas = require("./bot/commands/ringkas");
const handleLaporan = require("./bot/commands/laporan");

// ✅ Lainnya
const { getDateRangeByType } = require("./bot/utils/tanggal");

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

async function startSock() {
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

  // Inisialisasi sheet Jurnal global agar bisa diakses getSaldo()
  const doc = new GoogleSpreadsheet(
    "1nb-kfGUkoYMHSEgqOVU_peP9iSKbqs2GgjcRjoI50cU"
  );
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle["Jurnal"];

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("\u{26D4} Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) startSock();
    } else if (connection === "open") {
      console.log("\u{2705} WhatsApp terhubung!");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      "";

    const isGroup = msg.key.remoteJid.endsWith("@g.us");

    const remoteJid = msg.key.remoteJid;

    await handleInfo(text, isGroup, sock, remoteJid);
    await handleCatat(text, isGroup, sock, msg.key.remoteJid);
    await handleUbah(text, isGroup, sock, msg.key.remoteJid);
    await handleHapus(text, isGroup, sock, msg.key.remoteJid);
    await handleSaldo(text, isGroup, sock, msg.key.remoteJid, sheet);
    await handleCari(text, isGroup, sock, msg.key.remoteJid);
    await handleRingkas(text, isGroup, sock, remoteJid);
    await handleLaporan(text, isGroup, sock, remoteJid);
  });
}

startSock();
