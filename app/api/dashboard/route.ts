import { NextResponse } from "next/server";
import { getDashboardDataForPeriode } from "@/lib/sheets";
import { buildDashboardData } from "@/lib/calc";
import { getCurrentPeriodeJakarta } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedPeriode = searchParams.get("periode") || getCurrentPeriodeJakarta();

    const data = await getDashboardDataForPeriode(requestedPeriode);

    const dashboard = buildDashboardData(
      requestedPeriode,
      data.pemasukanPeriode,
      data.pengeluaranPeriode,
      data.anggaranList,
      data.pengaturan,
      data.sisaBulanLalu,
      data.periodeLalu
    );

    return NextResponse.json(dashboard);
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data dasbor. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
