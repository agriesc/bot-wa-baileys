function parseNominal({ value }) {
  if (!value) return 0;

  // Jika angka, langsung kembalikan
  if (typeof value === "number") return value;

  // Jika string, bersihkan dulu
  const cleaned = value
    .toString()
    .replace(/rp/i, "") // hilangkan "Rp"
    .replace(/\./g, "") // hilangkan titik pemisah ribuan
    .replace(/,/g, ".") // ganti koma jadi titik (jika desimal)
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
module.exports = { parseNominal };
