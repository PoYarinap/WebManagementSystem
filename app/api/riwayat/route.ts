import { NextResponse } from "next/server";
import {
  getAllDistinctPeriods,
  getPemasukanList,
  getPengeluaranList,
} from "@/lib/sheets";
import { formatPeriode, getCurrentPeriodeJakarta } from "@/lib/format";
import { MonthHistorySummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [allPeriods, allPemasukan, allPengeluaran] = await Promise.all([
      getAllDistinctPeriods(),
      getPemasukanList(),
      getPengeluaranList(),
    ]);

    const currentPeriode = getCurrentPeriodeJakarta();
    const periodsToReview = allPeriods.length > 0 ? allPeriods : [currentPeriode];

    const history: MonthHistorySummary[] = periodsToReview.map((periode) => {
      const pemasukanPeriod = allPemasukan.filter((p) => p.periode === periode);
      const pengeluaranPeriod = allPengeluaran.filter((p) => p.periode === periode);

      const totalPemasukan = pemasukanPeriod.reduce((sum, p) => sum + p.jumlah, 0);
      const totalPengeluaran = pengeluaranPeriod.reduce(
        (sum, p) => sum + p.jumlah,
        0
      );
      const sisaSaldo = totalPemasukan - totalPengeluaran;

      // Find biggest spending category
      const posMap = new Map<string, number>();
      for (const exp of pengeluaranPeriod) {
        posMap.set(exp.pos, (posMap.get(exp.pos) || 0) + exp.jumlah);
      }

      let posTerboros: { pos: string; total: number } | null = null;
      posMap.forEach((total, pos) => {
        if (!posTerboros || total > posTerboros.total) {
          posTerboros = { pos, total };
        }
      });

      return {
        periode,
        namaBulan: formatPeriode(periode),
        totalPemasukan,
        totalPengeluaran,
        sisaSaldo,
        posTerboros,
      };
    });

    return NextResponse.json({ data: history });
  } catch (error: any) {
    console.error("GET Riwayat error:", error);
    return NextResponse.json(
      { error: "Gagal memuat riwayat bulanan." },
      { status: 500 }
    );
  }
}
