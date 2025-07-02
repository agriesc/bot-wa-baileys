const { formatIDR } = require("../utils/formatIDR");

async function getSaldo(sheet) {
  try {
    await sheet.loadCells("G1:G4");

    const rekening = sheet.getCellByA1("G1").value || 0;
    const dompet = sheet.getCellByA1("G2").value || 0;
    const gopay = sheet.getCellByA1("G3").value || 0;
    const emoney = sheet.getCellByA1("G4").value || 0;
    const total = rekening + dompet + gopay + emoney;

    return (
      `*Saldo Terkini:*\n` +
      `🏦 Rekening: ${formatIDR(rekening)}\n` +
      `💵 Cash: ${formatIDR(dompet)}\n` +
      `📲 Gopay: ${formatIDR(gopay)}\n` +
      `💳 e-Money: ${formatIDR(emoney)}\n` +
      `*Total:* ${formatIDR(total)}`
    );
  } catch (err) {
    console.error("[ERROR getSaldo]", err);
    return "❌ Gagal mengambil data saldo. Coba lagi nanti.";
  }
}

module.exports = async function handleSaldo(
  text,
  isGroup,
  sock,
  remoteJid,
  sheet
) {
  if (text.trim().toLowerCase() !== "/saldo" || !isGroup) return;

  const saldoInfo = await getSaldo(sheet);
  await sock.sendMessage(remoteJid, { text: saldoInfo });
};
