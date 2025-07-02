// bot/utils/format.js
function formatIDR(value) {
  if (typeof value === "string") {
    value = parseFloat(value.toString().replace(/[^\d.-]/g, ""));
  }
  if (isNaN(value)) return "Rp0";
  return "Rp" + value.toLocaleString("id-ID", { minimumFractionDigits: 0 });
}

module.exports = { formatIDR };
