const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../credentials.json");

function toProperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function tulisKeSheet({
  tanggal,
  kategori,
  sumberDana,
  deskripsi,
  keluar,
  masuk,
}) {
  const doc = new GoogleSpreadsheet(
    "1nb-kfGUkoYMHSEgqOVU_peP9iSKbqs2GgjcRjoI50cU"
  );
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle["Jurnal"];
  if (!sheet) throw new Error("Sheet 'Jurnal' tidak ditemukan");

  sheet.headerRow = 4;
  await sheet.loadHeaderRow();
  await sheet.loadCells("A1:A1000");

  let lastFilledRow = 4;
  for (let i = 5; i <= sheet.rowCount; i++) {
    const cell = sheet.getCell(i - 1, 0);
    if (cell.value) lastFilledRow = i;
  }

  const targetRow = lastFilledRow + 1;
  const rowIndex = targetRow - 1;

  await sheet.loadCells(`A${targetRow}:F${targetRow}`);

  const [day, month, year] = tanggal.split("/");
  const dateObj = new Date(`${year}-${month}-${day}`);
  if (isNaN(dateObj.getTime())) throw new Error("Tanggal tidak valid");

  sheet.getCell(rowIndex, 0).value =
    Math.floor(dateObj.getTime() / 86400000) + 25569;
  sheet.getCell(rowIndex, 0).numberFormat = {
    type: "DATE",
    pattern: "dd/mm/yyyy",
  };

  sheet.getCell(rowIndex, 1).value = kategori ? toProperCase(kategori) : "-";
  sheet.getCell(rowIndex, 2).value = sumberDana || "-";
  sheet.getCell(rowIndex, 3).value = deskripsi || "-";
  sheet.getCell(rowIndex, 4).value = typeof keluar === "number" ? keluar : "";
  sheet.getCell(rowIndex, 5).value = typeof masuk === "number" ? masuk : "";

  await sheet.saveUpdatedCells();
  return targetRow;
}

module.exports = { tulisKeSheet };
