function getDateRangeByType(command, customArg = "") {
  const today = new Date();
  let start, end;

  if (command === "hari") {
    start = end = today;
  } else if (command === "minggu") {
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start = new Date(today);
    start.setDate(today.getDate() - diff);
    end = new Date(today);
  } else if (command === "bulan") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (command === "range") {
    const [startStr, endStr] = customArg.split("-").map((d) => d.trim());
    const [ds, ms, ys] = startStr.split("/");
    const [de, me, ye] = endStr.split("/");
    start = new Date(`${ys}-${ms}-${ds}`);
    end = new Date(`${ye}-${me}-${de}`);
  } else if (command === "bulan_tertentu") {
    const bulanMap = {
      januari: 0,
      februari: 1,
      maret: 2,
      april: 3,
      mei: 4,
      juni: 5,
      juli: 6,
      agustus: 7,
      september: 8,
      oktober: 9,
      november: 10,
      desember: 11,
    };
    const [namaBulan, tahun] = customArg.trim().toLowerCase().split(" ");
    const bulanIdx = bulanMap[namaBulan];
    const thn = parseInt(tahun) || today.getFullYear();
    start = new Date(thn, bulanIdx, 1);
    end = new Date(thn, bulanIdx + 1, 0);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

module.exports = { getDateRangeByType };
