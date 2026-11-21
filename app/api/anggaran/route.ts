import { NextResponse } from "next/server";
import {
  getAnggaranList,
  saveAnggaranList,
  getPengaturan,
  updatePengaturanItem,
} from "@/lib/sheets";
import { Anggaran } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [anggaranList, pengaturan] = await Promise.all([
      getAnggaranList(),
      getPengaturan(),
    ]);

    return NextResponse.json({
      anggaran: anggaranList,
      pengaturan,
    });
  } catch (error: any) {
    console.error("GET Anggaran error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data anggaran dan pengaturan." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { anggaran, gaji_default, tanggal_gajian } = body;

    if (Array.isArray(anggaran)) {
      // Validate anggaran items
      const cleanedList: Anggaran[] = anggaran
        .filter((item) => item.pos && item.pos.trim())
        .map((item) => ({
          pos: item.pos.trim(),
          jatah_bulanan: Math.max(0, parseInt(String(item.jatah_bulanan || 0), 10)),
          jatah_harian_opsional: Math.max(
            0,
            parseInt(String(item.jatah_harian_opsional || 0), 10)
          ),
        }));

      await saveAnggaranList(cleanedList);
    }

    if (gaji_default !== undefined) {
      await updatePengaturanItem("gaji_default", Number(gaji_default));
    }

    if (tanggal_gajian !== undefined) {
      await updatePengaturanItem("tanggal_gajian", Number(tanggal_gajian));
    }

    return NextResponse.json({ success: true, message: "Anggaran berhasil disimpan." });
  } catch (error: any) {
    console.error("POST Anggaran error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan perubahan anggaran, coba lagi." },
      { status: 500 }
    );
  }
}
