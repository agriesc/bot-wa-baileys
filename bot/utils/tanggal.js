// bot/utils/tanggal.js

function parseDateFromCell(cell) {
  if (!cell || !cell.value) return null;

  let raw = cell.value;

  // Jika sudah berupa Date
  if (raw instanceof Date) return raw;

  // Jika serial number (Excel)
  if (typeof raw === "number") {
    return new Date((raw - 25569) * 86400000);
  }

  // Jika string
  if (typeof raw === "string") {
    const val = raw.trim();

    // Format dd/mm/yyyy atau dd-mm-yyyy
    const dmYMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmYMatch) {
      const [_, dd, mm, yyyy] = dmYMatch;
      return new Date(`${yyyy}-${mm}-${dd}`);
    }

    // Format: dd mmm yyyy atau dd mmmm yyyy (dalam bahasa Indonesia)
    const bulanMap = {
      jan: 0,
      januari: 0,
      feb: 1,
      februari: 1,
      mar: 2,
      maret: 2,
      apr: 3,
      april: 3,
      mei: 4,
      jun: 5,
      juni: 5,
      jul: 6,
      juli: 6,
      agu: 7,
      agt: 7,
      agustus: 7,
      sep: 8,
      september: 8,
      okt: 9,
      oktober: 9,
      nov: 10,
      november: 10,
      des: 11,
      desember: 11,
    };

    const parts = val.toLowerCase().split(" ");
    if (parts.length === 3) {
      const [dd, namaBulan, yyyy] = parts;
      const mm = bulanMap[namaBulan];
      if (mm !== undefined) {
        return new Date(parseInt(yyyy), mm, parseInt(dd));
      }
    }
  }

  return null;
}

function getDateRangeByType(command, customArg = "") {
  const today = new Date();
  let start, end;

  if (command === "hari") {
    start = new Date(today);
    end = new Date(today);
  } else if (command === "minggu") {
    const now = new Date();
    const day = now.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
    const diffToMonday = (day + 6) % 7; // Jarak dari hari ini ke Senin

    start = new Date(now);
    start.setDate(now.getDate() - diffToMonday);

    end = new Date(start);
    end.setDate(start.getDate() + 6); // Sampai Minggu
  } else if (command === "bulan") {
    if (customArg) {
      ({ start, end } = getPeriodeByBulan(customArg));
    } else {
      ({ start, end } = getPeriodeAktifHariIni());
    }
  } else if (command === "range") {
    const [startStr, endStr] = customArg.split("-").map((d) => d.trim());
    const [ds, ms, ys] = startStr.split("/");
    const [de, me, ye] = endStr.split("/");
    start = new Date(`${ys}-${ms}-${ds}`);
    end = new Date(`${ye}-${me}-${de}`);
  } else if (command === "bulan_tertentu") {
    ({ start, end } = getPeriodeByBulan(customArg));
  } else if (command === "7hari") {
    end = new Date(today); // pastikan konsisten
    start = new Date(today);
    start.setDate(start.getDate() - 6);
  } else {
    throw new Error("Jenis rentang tidak dikenali");
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getTodayWIB() {
  const now = new Date();
  const wib = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  const d = wib.getDate().toString().padStart(2, "0");
  const m = (wib.getMonth() + 1).toString().padStart(2, "0");
  const y = wib.getFullYear();
  return `${d}/${m}/${y}`;
}

function getPeriodeByBulan(bulanTahunStr) {
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

  const [namaBulan, tahunStr] = bulanTahunStr.trim().toLowerCase().split(" ");
  const bulanIdx = bulanMap[namaBulan];
  const tahun = parseInt(tahunStr);

  if (bulanIdx === undefined || isNaN(tahun)) {
    throw new Error("Format bulan tidak valid. Gunakan format: Juni 2025");
  }

  // Awal periode adalah 26 bulan sebelumnya
  let start = new Date(tahun, bulanIdx - 1, 26);

  // Kalau 26 jatuh Sabtu/Minggu, mundurkan ke Jumat/Kamis
  const day = start.getDay();
  if (day === 0) start.setDate(start.getDate() - 2); // Minggu → Jumat
  else if (day === 6) start.setDate(start.getDate() - 1); // Sabtu → Jumat

  // Akhir periode adalah sehari sebelum awal periode bulan berikutnya
  const nextStart = new Date(tahun, bulanIdx, 26);
  const nextDay = nextStart.getDay();
  if (nextDay === 0) nextStart.setDate(nextStart.getDate() - 2);
  else if (nextDay === 6) nextStart.setDate(nextStart.getDate() - 1);
  const end = new Date(nextStart);
  end.setDate(end.getDate() - 1);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getPeriodeAktifHariIni() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Dapatkan tanggal 26 bulan ini
  let awalPeriode = new Date(today.getFullYear(), today.getMonth(), 26);
  const hari = awalPeriode.getDay();

  // Jika 26 jatuh pada Sabtu (6) → majukan ke 25
  if (hari === 6) {
    awalPeriode.setDate(25);
  }
  // Jika 26 jatuh pada Minggu (0) → majukan ke 24
  else if (hari === 0) {
    awalPeriode.setDate(24);
  }

  // Jika hari ini < awalPeriode, berarti masih di periode sebelumnya
  if (today < awalPeriode) {
    // Hitung ulang awal periode → bulan sebelumnya
    awalPeriode = new Date(today.getFullYear(), today.getMonth() - 1, 26);
    const prevDay = awalPeriode.getDay();
    if (prevDay === 6) {
      awalPeriode.setDate(25);
    } else if (prevDay === 0) {
      awalPeriode.setDate(24);
    }
  }

  const akhirPeriode = new Date(awalPeriode);
  akhirPeriode.setMonth(akhirPeriode.getMonth() + 1);
  akhirPeriode.setDate(akhirPeriode.getDate() - 1); // akhir = sehari sebelum awal bulan berikutnya
  akhirPeriode.setHours(23, 59, 59, 999);

  return { start: awalPeriode, end: akhirPeriode };
}

module.exports = {
  parseDateFromCell,
  getDateRangeByType,
  getTodayWIB,
  getPeriodeByBulan,
  getPeriodeAktifHariIni,
};
