import {
  Anggaran,
  DailyExpenseTrend,
  DashboardData,
  Pemasukan,
  Pengeluaran,
  Pengaturan,
  PosProgress,
  WarningItem,
} from "./types";
import {
  formatRupiah,
  formatTanggal,
  getDaysInPeriod,
  getCurrentDayJakarta,
  getTodayJakarta,
  getCurrentPeriodeJakarta,
} from "./format";

/**
 * Pure calculation functions for Rencana Gaji
 */

export function calculatePosProgress(
  anggaranList: Anggaran[],
  pengeluaranList: Pengeluaran[],
  daysInMonth: number
): PosProgress[] {
  // Sum spending per pos
  const spentMap = new Map<string, number>();
  for (const item of pengeluaranList) {
    const cur = spentMap.get(item.pos) || 0;
    spentMap.set(item.pos, cur + item.jumlah);
  }

  // Create progress for defined budgets
  const result: PosProgress[] = anggaranList.map((item) => {
    const terpakai = spentMap.get(item.pos) || 0;
    const jatah_bulanan = item.jatah_bulanan;
    const sisa = jatah_bulanan - terpakai;
    const persen = jatah_bulanan > 0 ? (terpakai / jatah_bulanan) * 100 : 0;

    let status: "aman" | "waspada" | "melebihi" = "aman";
    if (persen >= 100) {
      status = "melebihi";
    } else if (persen >= 70) {
      status = "waspada";
    }

    const jatah_harian =
      item.jatah_harian_opsional && item.jatah_harian_opsional > 0
        ? item.jatah_harian_opsional
        : Math.round(jatah_bulanan / (daysInMonth || 30));

    return {
      pos: item.pos,
      jatah_bulanan,
      terpakai,
      sisa,
      persen: Math.round(persen * 10) / 10,
      status,
      jatah_harian,
    };
  });

  // Check if there are spending on pos not in anggaran list
  spentMap.forEach((amount, pos) => {
    if (!anggaranList.some((a) => a.pos.toLowerCase() === pos.toLowerCase())) {
      result.push({
        pos,
        jatah_bulanan: 0,
        terpakai: amount,
        sisa: -amount,
        persen: 100,
        status: "melebihi",
        jatah_harian: 0,
      });
    }
  });

  return result;
}

export function calculateMakanHariIni(
  anggaranList: Anggaran[],
  pengeluaranList: Pengeluaran[],
  todayJakarta: string,
  daysInMonth: number
) {
  const makanBudget = anggaranList.find(
    (a) => a.pos.toLowerCase() === "makan"
  );
  const jatahBulanan = makanBudget ? makanBudget.jatah_bulanan : 700000;
  const jatahHarian =
    makanBudget?.jatah_harian_opsional && makanBudget.jatah_harian_opsional > 0
      ? makanBudget.jatah_harian_opsional
      : Math.round(jatahBulanan / (daysInMonth || 30));

  const makanHariIni = pengeluaranList
    .filter(
      (p) => p.pos.toLowerCase() === "makan" && p.tanggal === todayJakarta
    )
    .reduce((sum, item) => sum + item.jumlah, 0);

  const sisaHariIni = jatahHarian - makanHariIni;

  return {
    jatahHarian,
    terpakaiHariIni: makanHariIni,
    sisaHariIni,
  };
}

export function generateWarnings(
  posProgressList: PosProgress[],
  pengeluaranList: Pengeluaran[],
  periode: string
): WarningItem[] {
  const warnings: WarningItem[] = [];
  const currentPeriode = getCurrentPeriodeJakarta();
  const isCurrentMonth = periode === currentPeriode;
  const totalDays = getDaysInPeriod(periode);
  const currentDay = isCurrentMonth
    ? Math.min(getCurrentDayJakarta(), totalDays)
    : totalDays;
  const daysElapsedPercent = (currentDay / totalDays) * 100;

  for (const p of posProgressList) {
    if (p.jatah_bulanan <= 0) {
      if (p.terpakai > 0) {
        warnings.push({
          id: `no-budget-${p.pos}`,
          type: "warning",
          title: `Pos Tanpa Anggaran`,
          pesan: `Pengeluaran untuk pos "${p.pos}" sudah mencapai ${formatRupiah(
            p.terpakai
          )} tanpa alokasi anggaran bulanan.`,
        });
      }
      continue;
    }

    // Check if exceeded 100%
    if (p.persen >= 100) {
      warnings.push({
        id: `over-${p.pos}`,
        type: "danger",
        title: `Over Budget: ${p.pos}`,
        pesan: `Pos ${p.pos} sudah melebihi anggaran (${p.persen}% terpakai). Lebih ${formatRupiah(
          Math.abs(p.sisa)
        )}.`,
      });
      continue;
    }

    // Check if spending rate is significantly higher than time elapsed
    // E.g., if spent is 90% while day elapsed is only 40%
    if (isCurrentMonth && currentDay < totalDays) {
      if (p.persen > daysElapsedPercent + 25 && p.persen >= 70) {
        warnings.push({
          id: `fast-${p.pos}`,
          type: "warning",
          title: `Pengeluaran Cepat: ${p.pos}`,
          pesan: `${p.pos} sudah ${p.persen}% padahal baru tanggal ${currentDay}. Kendalikan pos ini agar cukup sampai akhir bulan!`,
        });
      }
    }

    // Special check for Makan: daily average vs target daily
    if (p.pos.toLowerCase() === "makan" && isCurrentMonth && currentDay > 0) {
      const avgSpentPerDay = Math.round(p.terpakai / currentDay);
      if (avgSpentPerDay > p.jatah_harian * 1.15 && p.terpakai > 0) {
        warnings.push({
          id: `makan-avg`,
          type: "warning",
          title: `Rata-rata Makan Tinggi`,
          pesan: `Makan rata-rata ${formatRupiah(
            avgSpentPerDay
          )}/hari, lebih tinggi dari target jatah ${formatRupiah(
            p.jatah_harian
          )}/hari.`,
        });
      }
    }
  }

  return warnings;
}

export function calculateDailyTrends(
  pengeluaranList: Pengeluaran[],
  periode: string
): DailyExpenseTrend[] {
  const totalDays = getDaysInPeriod(periode);
  const trendMap = new Map<number, number>();

  for (let d = 1; d <= totalDays; d++) {
    trendMap.set(d, 0);
  }

  for (const item of pengeluaranList) {
    if (!item.tanggal) continue;
    const parts = item.tanggal.split("-");
    if (parts.length === 3) {
      const dayNum = parseInt(parts[2], 10);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= totalDays) {
        trendMap.set(dayNum, (trendMap.get(dayNum) || 0) + item.jumlah);
      }
    }
  }

  const trends: DailyExpenseTrend[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const dayStr = String(d).padStart(2, "0");
    const fullDate = `${periode}-${dayStr}`;
    trends.push({
      tanggal: fullDate,
      hari: d,
      formattedTanggal: `${d} ${formatTanggal(fullDate).split(" ")[1] || ""}`,
      total: trendMap.get(d) || 0,
    });
  }

  return trends;
}

export function buildDashboardData(
  periode: string,
  pemasukanList: Pemasukan[],
  pengeluaranList: Pengeluaran[],
  anggaranList: Anggaran[],
  pengaturan: Pengaturan,
  sisaBulanLalu: number,
  periodeLalu: string
): DashboardData {
  const todayJakarta = getTodayJakarta();
  const totalDays = getDaysInPeriod(periode);

  // Total income for this period
  const totalPemasukan = pemasukanList.reduce(
    (sum, item) => sum + item.jumlah,
    0
  );
  const hasPemasukan = pemasukanList.length > 0;

  // Total expenses for this period
  const totalPengeluaran = pengeluaranList.reduce(
    (sum, item) => sum + item.jumlah,
    0
  );

  // Sisa saldo
  const sisaSaldo = totalPemasukan - totalPengeluaran;

  // Pos progress
  const posProgressList = calculatePosProgress(
    anggaranList,
    pengeluaranList,
    totalDays
  );

  // Makan hari ini
  const makanHariIni = calculateMakanHariIni(
    anggaranList,
    pengeluaranList,
    todayJakarta,
    totalDays
  );

  // Top 3 biggest expenses
  const sortedExpenses = [...pengeluaranList].sort(
    (a, b) => b.jumlah - a.jumlah
  );
  const topPengeluaran = sortedExpenses.slice(0, 3);

  // Recent 10 transactions (sorted by date desc, then dibuat_pada desc)
  const transaksiTerbaru = [...pengeluaranList]
    .sort((a, b) => {
      const dateCmp = (b.tanggal || "").localeCompare(a.tanggal || "");
      if (dateCmp !== 0) return dateCmp;
      return (b.dibuat_pada || "").localeCompare(a.dibuat_pada || "");
    })
    .slice(0, 10);

  // Warnings
  const warnings = generateWarnings(posProgressList, pengeluaranList, periode);

  // Daily trends
  const dailyTrends = calculateDailyTrends(pengeluaranList, periode);

  return {
    periode,
    hasPemasukan,
    totalPemasukan,
    totalPengeluaran,
    sisaSaldo,
    makanHariIni,
    posProgressList,
    topPengeluaran,
    warnings,
    dailyTrends,
    transaksiTerbaru,
    daftarPemasukan: pemasukanList,
    sisaBulanLalu,
    periodeLalu,
    pengaturan,
  };
}
